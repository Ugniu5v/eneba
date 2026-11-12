package search

import "testing"

func TestScoreExactAndPartial(t *testing.T) {
	if got := Score("Neon Drift 2088", "Neon Drift 2088"); got < 900 {
		t.Fatalf("exact match should score high, got %.1f", got)
	}
	if got := Score("terrablo", "Terrablocks: Build & Survive"); got < MinScore("terrablo") {
		t.Fatalf("partial name should match, got %.1f", got)
	}
	if got := Score("wallet", "Steam Wallet Card 50 EUR"); got < MinScore("wallet") {
		t.Fatalf("single token should match, got %.1f", got)
	}
}

func TestScoreTypoTolerance(t *testing.T) {
	cases := []struct {
		query string
		title string
	}{
		{"neon drfit", "Neon Drift 2088"},
		{"crownfll", "Crownfall: Shattered Realm"},
		{"farming frontir", "Farming Frontier 26"},
		{"playstaton store", "PlayStation Store Card 100 USD (USA)"},
		{"shadw heist", "Shadow Heist"},
	}
	for _, tc := range cases {
		if got := Score(tc.query, tc.title); got < MinScore(tc.query) {
			t.Errorf("expected %q to fuzzy-match %q, score %.1f threshold %.1f", tc.query, tc.title, got, MinScore(tc.query))
		}
	}
}

func TestRankOrderAndNoise(t *testing.T) {
	titles := []string{"Aether Legends", "Neon Drift 2088", "Farming Frontier 26"}
	results := Rank("aether", titles)
	if len(results) == 0 || titles[results[0].Index] != "Aether Legends" {
		t.Fatalf("expected Aether Legends first, got %#v", results)
	}
	if results := Rank("qqqqzzzz", titles); len(results) != 0 {
		t.Fatalf("gibberish should have no matches, got %#v", results)
	}
}

func TestNormalizePunctuation(t *testing.T) {
	if got := Normalize("  Crownfall: Shattered—Realm!  "); got != "crownfall shattered realm" {
		t.Fatalf("unexpected normalization %q", got)
	}
}

func TestClosestSuggestion(t *testing.T) {
	title, score := Closest("playstaton", []string{"Farming Frontier 26", "PlayStation Store Card 100 USD (USA)"})
	if title != "PlayStation Store Card 100 USD (USA)" || score <= 0 {
		t.Fatalf("unexpected suggestion %q (%.1f)", title, score)
	}
}
