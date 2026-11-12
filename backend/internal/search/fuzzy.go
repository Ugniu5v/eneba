// Package search implements typo-tolerant product-name matching.
//
// The catalog is deliberately small, so scoring in Go is both simpler and more
// accurate than SQL LIKE for this demo. At catalogue scale this would be backed
// by FTS5 or a dedicated search service; the interface here stays the same.
package search

import (
	"sort"
	"strings"
	"unicode"
)

type Ranked struct {
	Index int
	Score float64
}

// Normalize lowercases and strips punctuation so "Crownfall: Shattered Realm"
// and "crownfall shattered realm" compare cleanly.
func Normalize(value string) string {
	var b strings.Builder
	lastSpace := true
	for _, r := range strings.ToLower(value) {
		if unicode.IsLetter(r) || unicode.IsNumber(r) {
			b.WriteRune(r)
			lastSpace = false
			continue
		}
		if !lastSpace {
			b.WriteByte(' ')
			lastSpace = true
		}
	}
	return strings.TrimSpace(b.String())
}

// Score returns 0 for no meaningful match and higher values for closer matches.
// It handles partial words and transposition/insertion/deletion typos.
func Score(query, title string) float64 {
	qn := Normalize(query)
	tn := Normalize(title)
	if qn == "" || tn == "" {
		return 0
	}
	if qn == tn {
		return 1000
	}

	score := 0.0
	if strings.HasPrefix(tn, qn) && len(qn) >= 3 {
		score = 760
	} else if strings.HasPrefix(qn, tn) && len(tn) >= 3 {
		score = 700
	} else if strings.Contains(tn, " "+qn+" ") || strings.HasSuffix(tn, " "+qn) {
		score = 620
	} else if strings.Contains(tn, qn) && len(qn) >= 3 {
		score = 560
	}

	qTokens := strings.Fields(qn)
	tTokens := strings.Fields(tn)
	if len(qTokens) == 0 || len(tTokens) == 0 {
		return score
	}

	total := 0.0
	matched := 0
	exact := 0
	for _, queryToken := range qTokens {
		best := 0.0
		for _, titleToken := range tTokens {
			candidate := scoreToken(queryToken, titleToken)
			if candidate > best {
				best = candidate
			}
		}
		if best > 0 {
			matched++
		}
		if best >= 160 {
			exact++
		}
		total += best
	}
	average := total / float64(len(qTokens))
	coverage := float64(matched) / float64(len(qTokens))
	tokenScore := average * (0.45 + 0.55*coverage)
	tokenScore += float64(exact) * 12
	if matched == 0 {
		tokenScore = 0
	}
	if tokenScore > score {
		score = tokenScore
	}
	// A single loose fuzzy token should not rank above a clear prefix match.
	if normalizedLength(qn) < 2 && score < 120 {
		return 0
	}
	return score
}

func scoreToken(query, candidate string) float64 {
	if query == candidate {
		return 180
	}
	qLen, cLen := len([]rune(query)), len([]rune(candidate))
	if qLen < 2 || cLen == 0 {
		return 0
	}
	if strings.HasPrefix(candidate, query) {
		ratio := float64(qLen) / float64(cLen)
		return 118 + 44*ratio
	}
	if strings.HasPrefix(query, candidate) && cLen >= 3 {
		return 105 + 20*float64(cLen)/float64(qLen)
	}
	if qLen >= 3 && strings.Contains(candidate, query) {
		return 94 + 8*float64(qLen)/float64(cLen)
	}
	if qLen >= 3 {
		threshold := maxTypos(qLen)
		distance := levenshtein(query, candidate)
		if distance <= threshold {
			return 150 - float64(distance)*26 - 2*float64(abs(cLen-qLen))
		}
	}
	return 0
}

func maxTypos(length int) int {
	switch {
	case length <= 4:
		return 1
	case length <= 8:
		return 2
	default:
		return 3
	}
}

func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

func normalizedLength(value string) int {
	return len([]rune(value))
}

// Levenshtein computes the edit distance with a rolling row.
func levenshtein(a, b string) int {
	ar, br := []rune(a), []rune(b)
	if len(ar) == 0 {
		return len(br)
	}
	if len(br) == 0 {
		return len(ar)
	}
	previous := make([]int, len(br)+1)
	current := make([]int, len(br)+1)
	for j := 0; j <= len(br); j++ {
		previous[j] = j
	}
	for i := 1; i <= len(ar); i++ {
		current[0] = i
		for j := 1; j <= len(br); j++ {
			cost := 1
			if ar[i-1] == br[j-1] {
				cost = 0
			}
			current[j] = min3(current[j-1]+1, previous[j]+1, previous[j-1]+cost)
		}
		previous, current = current, previous
	}
	return previous[len(br)]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// Rank returns candidates with scores above the relevance threshold, best first.
func Rank(query string, titles []string) []Ranked {
	threshold := MinScore(query)
	results := make([]Ranked, 0, len(titles))
	for i, title := range titles {
		score := Score(query, title)
		if score >= threshold {
			results = append(results, Ranked{Index: i, Score: score})
		}
	}
	sort.SliceStable(results, func(i, j int) bool {
		if results[i].Score == results[j].Score {
			return results[i].Index < results[j].Index
		}
		return results[i].Score > results[j].Score
	})
	return results
}

func MinScore(query string) float64 {
	if len([]rune(Normalize(query))) <= 2 {
		return 115
	}
	return 54
}

// Closest returns the best-scoring title even when it is below the normal
// threshold. The API uses it for "Did you mean …?" suggestions.
func Closest(query string, titles []string) (string, float64) {
	bestTitle := ""
	bestScore := 0.0
	for _, title := range titles {
		score := Score(query, title)
		if score > bestScore {
			bestScore = score
			bestTitle = title
		}
	}
	return bestTitle, bestScore
}
