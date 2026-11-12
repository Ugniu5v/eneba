package payment

import (
	"errors"
	"testing"
	"time"
)

func validCard() Card {
	return Card{
		Number:     "4242 4242 4242 4242",
		Cardholder: "Alex Morgan",
		Expiry:     "12/30",
		CVC:        "123",
	}
}

func TestSimulateSuccess(t *testing.T) {
	result, err := Simulate(Request{Method: "card", Card: validCard()}, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Last4 != "4242" || result.Ref == "" || result.Method != "card" {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestSimulateDeclinedTestCard(t *testing.T) {
	card := validCard()
	card.Number = "4000 0000 0000 0002"
	_, err := Simulate(Request{Method: "card", Card: card}, time.Now())
	var declined *DeclinedError
	if !errors.As(err, &declined) {
		t.Fatalf("expected declined error, got %v", err)
	}
}

func TestSimulateValidation(t *testing.T) {
	cases := []struct {
		name   string
		method string
		mutate func(*Card)
	}{
		{"bad method", "paypal", func(*Card) {}},
		{"short number", "card", func(c *Card) { c.Number = "4242" }},
		{"failed luhn", "card", func(c *Card) { c.Number = "4242 4242 4242 4241" }},
		{"no name", "card", func(c *Card) { c.Cardholder = "" }},
		{"bad expiry", "card", func(c *Card) { c.Expiry = "13/30" }},
		{"bad cvc", "card", func(c *Card) { c.CVC = "12" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			card := validCard()
			tc.mutate(&card)
			if _, err := Simulate(Request{Method: tc.method, Card: card}, time.Now()); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}
