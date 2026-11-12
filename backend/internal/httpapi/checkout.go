package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"eneba-market/backend/internal/payment"
	"eneba-market/backend/internal/store"
)

type checkoutPayload struct {
	Items         []store.CheckoutItem `json:"items"`
	Payment       payment.Request      `json:"payment"`
	CashbackCents int                  `json:"cashbackCents"`
}

type confirmKeysPayload struct {
	RegionConfirmed   bool `json:"regionConfirmed"`
	PlatformConfirmed bool `json:"platformConfirmed"`
}

func (s *Server) handleCheckout(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	var payload checkoutPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Check the checkout details and try again.")
		return
	}
	if len(payload.Items) == 0 {
		writeError(w, http.StatusBadRequest, "empty_cart", "Your cart is empty.")
		return
	}
	if len(payload.Items) > 24 {
		writeError(w, http.StatusBadRequest, "invalid_cart", "Too many cart items.")
		return
	}
	if payload.CashbackCents < 0 {
		writeError(w, http.StatusBadRequest, "invalid_cashback", "The cashback amount is invalid.")
		return
	}

	// Merge duplicate offer lines and enforce the per-product limit server-side.
	merged := make(map[string]*store.CheckoutItem)
	order := make([]string, 0, len(payload.Items))
	for _, item := range payload.Items {
		if strings.TrimSpace(item.OfferID) == "" || item.Quantity < 1 {
			writeError(w, http.StatusBadRequest, "invalid_cart", "Your cart contains an invalid item.")
			return
		}
		key := item.OfferID
		if _, exists := merged[key]; !exists {
			merged[key] = &store.CheckoutItem{OfferID: item.OfferID}
			order = append(order, key)
		}
		merged[key].Quantity += item.Quantity
		if merged[key].Quantity > 5 {
			writeError(w, http.StatusBadRequest, "invalid_quantity", "You can buy up to 5 of the same offer.")
			return
		}
	}
	items := make([]store.CheckoutItem, 0, len(order))
	for _, key := range order {
		items = append(items, *merged[key])
	}

	cardResult, err := payment.Simulate(payload.Payment, time.Now().UTC())
	if err != nil {
		var declined *payment.DeclinedError
		if errors.As(err, &declined) {
			writeError(w, http.StatusPaymentRequired, "payment_declined", declined.Message)
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_payment", err.Error())
		return
	}

	created, err := s.store.CreateOrder(r.Context(), user.ID, items, store.PaymentInfo{
		Method: cardResult.Method,
		Ref:    cardResult.Ref,
		Last4:  cardResult.Last4,
	}, payload.CashbackCents)
	if errors.Is(err, store.ErrInsufficientStock) {
		writeError(w, http.StatusConflict, "out_of_stock", "One or more offers just sold out. Remove it from your cart and try again.")
		return
	}
	if errors.Is(err, store.ErrInsufficientCashback) {
		writeError(w, http.StatusConflict, "cashback_insufficient", "Your cashback balance changed. Review the amount and try again.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Payment was simulated, but the order could not be completed. Try again.")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"order": created,
		"payment": map[string]any{
			"status": "simulated",
			"ref":    cardResult.Ref,
			"last4":  cardResult.Last4,
			"test":   true,
		},
	})
}

func (s *Server) handleOrders(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	orders, err := s.store.ListOrders(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load your orders.")
		return
	}
	if orders == nil {
		orders = []store.Order{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

func (s *Server) handleOrder(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	number := strings.TrimSpace(r.PathValue("number"))
	order, err := s.store.GetOrder(r.Context(), user.ID, number)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "order_not_found", "Order not found.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load this order.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"order": order})
}

// handleConfirmOrderKeys is the only endpoint that returns digital key codes
// for an unconfirmed order. The buyer must explicitly confirm both the region
// and the platform, so dismissing the confirmation dialog cannot reveal keys.
func (s *Server) handleConfirmOrderKeys(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	var payload confirmKeysPayload
	if err := decodeJSON(r, &payload); err != nil || !payload.RegionConfirmed || !payload.PlatformConfirmed {
		writeError(w, http.StatusBadRequest, "confirmation_required", "Confirm that the platform and region match your account before the keys can be shown.")
		return
	}
	number := strings.TrimSpace(r.PathValue("number"))
	order, err := s.store.ConfirmOrderKeys(r.Context(), user.ID, number, time.Now().UTC())
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "order_not_found", "Order not found.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not confirm this order. Try again.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"order": order})
}
