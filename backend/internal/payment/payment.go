// Package payment implements the simulated card processor used by the demo.
// It never contacts a payment provider, never stores card data and never moves
// real money. The control flow mirrors a provider integration so it can be
// replaced with a real test-mode adapter later.
package payment

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"eneba-market/backend/internal/ids"
)

type Card struct {
	Number     string `json:"number"`
	Cardholder string `json:"cardholder"`
	Expiry     string `json:"expiry"`
	CVC        string `json:"cvc"`
}

type Request struct {
	Method string `json:"method"`
	Card   Card   `json:"card"`
}

type Result struct {
	Method string `json:"method"`
	Ref    string `json:"ref"`
	Last4  string `json:"last4"`
}

type DeclinedError struct {
	Message string
}

func (e *DeclinedError) Error() string { return e.Message }

func Simulate(req Request, now time.Time) (Result, error) {
	if req.Method != "card" {
		return Result{}, errors.New("unsupported payment method")
	}
	number := digitsOnly(req.Card.Number)
	if len(number) != 16 {
		return Result{}, errors.New("card number must be 16 digits")
	}
	if !luhnValid(number) {
		return Result{}, errors.New("card number is invalid")
	}
	if strings.TrimSpace(req.Card.Cardholder) == "" {
		return Result{}, errors.New("cardholder name is required")
	}
	if err := validateExpiry(req.Card.Expiry, now); err != nil {
		return Result{}, err
	}
	cvc := digitsOnly(req.Card.CVC)
	if len(cvc) < 3 || len(cvc) > 4 {
		return Result{}, errors.New("security code must be 3 or 4 digits")
	}
	// Test card used by the checkout UI to demonstrate a declined payment.
	if strings.HasSuffix(number, "0002") {
		return Result{}, &DeclinedError{Message: "Your test card was declined. No money was taken."}
	}
	return Result{
		Method: "card",
		Ref:    "SIM-" + strings.ToUpper(ids.New("pay")[4:]),
		Last4:  number[len(number)-4:],
	}, nil
}

func digitsOnly(value string) string {
	var b strings.Builder
	for _, r := range value {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func luhnValid(number string) bool {
	var sum int
	double := false
	for i := len(number) - 1; i >= 0; i-- {
		n, _ := strconv.Atoi(string(number[i]))
		if double {
			n *= 2
			if n > 9 {
				n -= 9
			}
		}
		sum += n
		double = !double
	}
	return sum%10 == 0
}

func validateExpiry(value string, now time.Time) error {
	parts := strings.Split(strings.TrimSpace(value), "/")
	if len(parts) != 2 {
		return errors.New("expiry must be MM/YY")
	}
	month, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil || month < 1 || month > 12 {
		return errors.New("expiry month is invalid")
	}
	year, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil || year < 0 || year > 99 {
		return errors.New("expiry year is invalid")
	}
	year += 2000
	endOfMonth := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC)
	if !endOfMonth.After(now.UTC()) {
		return fmt.Errorf("card has expired")
	}
	return nil
}
