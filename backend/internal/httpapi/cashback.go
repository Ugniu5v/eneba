package httpapi

import (
	"net/http"
)

// handleCashback returns the signed-in user's balance and ledger. The balance
// and every history row come from the same append-only table, so the checkout
// redemption and this page can never disagree.
func (s *Server) handleCashback(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	summary, err := s.store.CashbackSummary(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load your cashback.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"cashback": summary})
}
