package httpapi

import (
	"errors"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"eneba-market/backend/internal/search"
	"eneba-market/backend/internal/store"
)

type facet struct {
	Value string `json:"value"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

type sortOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type filterOptions struct {
	Platforms        []facet      `json:"platforms"`
	Regions          []facet      `json:"regions"`
	Types            []facet      `json:"types"`
	Genres           []facet      `json:"genres"`
	Categories       []facet      `json:"categories"`
	Price            priceRange   `json:"price"`
	SortOptions      []sortOption `json:"sortOptions"`
	TotalProducts    int          `json:"totalProducts"`
	MatchingProducts int          `json:"matchingProducts"`
}

type priceRange struct {
	MinCents int `json:"minCents"`
	MaxCents int `json:"maxCents"`
}

type homeSectionDescriptor struct {
	store.HomeSection
	APIPath string `json:"apiPath"`
}

type catalogOptions struct {
	Query         string
	Platforms     []string
	Regions       []string
	Types         []string
	Genres        []string
	Categories    []string
	MinPriceCents int
	MaxPriceCents int
	Sort          string
	Page          int
	Limit         int
}

func (s *Server) handleHomeBanners(w http.ResponseWriter, r *http.Request) {
	banners, err := s.store.ListBanners(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load promotions.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"banners": banners})
}

func (s *Server) handleHomeCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := s.store.ListCategories(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load categories.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"categories": categories})
}

func (s *Server) handleHomeSections(w http.ResponseWriter, r *http.Request) {
	sections, err := s.store.ListHomeSections(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load homepage blocks.")
		return
	}
	result := make([]homeSectionDescriptor, 0, len(sections))
	for _, section := range sections {
		result = append(result, homeSectionDescriptor{
			HomeSection: section,
			APIPath:     "/api/storefront/home/sections/" + section.Slug,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"sections": result})
}

func (s *Server) handleHomeSection(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	section, err := s.store.GetHomeSection(r.Context(), slug)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "Homepage block not found.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load this homepage block.")
		return
	}
	all, err := s.store.ListProducts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load products for this block.")
		return
	}
	products := selectSectionProducts(all, section)
	writeJSON(w, http.StatusOK, map[string]any{
		"section": homeSectionDescriptor{
			HomeSection: *section,
			APIPath:     "/api/storefront/home/sections/" + section.Slug,
		},
		"products": products,
	})
}

func selectSectionProducts(all []store.ProductSummary, section *store.HomeSection) []store.ProductSummary {
	limit := section.MaxItems
	if limit <= 0 {
		limit = 5
	}
	filtered := make([]store.ProductSummary, 0, len(all))
	switch section.Source {
	case "recommended":
		for _, p := range all {
			if p.Featured {
				filtered = append(filtered, p)
			}
		}
		sortProducts(filtered, "rating", nil)
	case "top-games":
		for _, p := range all {
			if p.Category == "Games" {
				filtered = append(filtered, p)
			}
		}
		sortProducts(filtered, "popular", nil)
	case "deals":
		for _, p := range all {
			if p.DiscountPercent > 0 {
				filtered = append(filtered, p)
			}
		}
		sortProducts(filtered, "discount", nil)
	case "gift-cards":
		// Each denomination is its own product now, so the homepage shelf would
		// otherwise be ten near-identical Steam cards. Merchandise one
		// representative amount per platform; every value is still one search
		// (and one store page) away.
		filtered = oneGiftCardPerPlatform(all)
		sortProducts(filtered, "popular", nil)
	case "new-releases":
		for _, p := range all {
			if p.IsNew {
				filtered = append(filtered, p)
			}
		}
		sortProducts(filtered, "newest", nil)
	default:
		filtered = append(filtered, all...)
		sortProducts(filtered, "popular", nil)
	}
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}
	return filtered
}

func oneGiftCardPerPlatform(all []store.ProductSummary) []store.ProductSummary {
	best := make(map[string]store.ProductSummary)
	for _, p := range all {
		if p.ProductType != "Gift Card" && p.ProductType != "Gaming eCard" && p.ProductType != "Subscription" {
			continue
		}
		current, ok := best[p.Platform]
		if !ok || giftShelfPriority(p) > giftShelfPriority(current) {
			best[p.Platform] = p
		}
	}
	result := make([]store.ProductSummary, 0, len(best))
	for _, p := range best {
		result = append(result, p)
	}
	return result
}

// giftShelfPriority prefers the 50-unit denomination as the representative
// amount for a gift-card brand.
func giftShelfPriority(p store.ProductSummary) int {
	distance := p.GiftValueCents - 5000
	if distance < 0 {
		distance = -distance
	}
	return -distance
}

func (s *Server) handleFilters(w http.ResponseWriter, r *http.Request) {
	opts, err := parseCatalogOptions(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_filters", err.Error())
		return
	}
	products, err := s.store.ListProducts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load filters.")
		return
	}
	writeJSON(w, http.StatusOK, buildFacetedFilters(products, opts))
}

// buildFacetedFilters returns the full set of filter values with counts that
// reflect every currently active filter except the group being counted. That is
// what lets the sidebar answer "how many products are left if I pick this?".
func buildFacetedFilters(products []store.ProductSummary, opts catalogOptions) filterOptions {
	options := buildFilters(products)
	matching, _, _ := applyCatalog(products, opts)
	options.MatchingProducts = len(matching)

	without := func(clear func(*catalogOptions)) []store.ProductSummary {
		local := opts
		clear(&local)
		filtered, _, _ := applyCatalog(products, local)
		return filtered
	}

	options.Platforms = mergeFacetCounts(options.Platforms, facetCounts(
		without(func(o *catalogOptions) { o.Platforms = nil }),
		func(p store.ProductSummary) string { return p.Platform },
	))
	options.Regions = mergeFacetCounts(options.Regions, facetCounts(
		without(func(o *catalogOptions) { o.Regions = nil }),
		func(p store.ProductSummary) string { return p.Region },
	))
	options.Types = mergeFacetCounts(options.Types, facetCounts(
		without(func(o *catalogOptions) { o.Types = nil }),
		func(p store.ProductSummary) string { return p.ProductType },
	))
	options.Genres = mergeFacetCounts(options.Genres, facetCounts(
		without(func(o *catalogOptions) { o.Genres = nil }),
		func(p store.ProductSummary) string { return p.Genre },
	))
	options.Categories = mergeFacetCounts(options.Categories, facetCounts(
		without(func(o *catalogOptions) { o.Categories = nil }),
		func(p store.ProductSummary) string { return p.Category },
	))
	return options
}

func facetCounts(products []store.ProductSummary, pick func(store.ProductSummary) string) map[string]int {
	counts := make(map[string]int)
	for _, product := range products {
		counts[pick(product)]++
	}
	return counts
}

func mergeFacetCounts(items []facet, counts map[string]int) []facet {
	for index := range items {
		items[index].Count = counts[items[index].Value]
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Count == items[j].Count {
			return items[i].Label < items[j].Label
		}
		return items[i].Count > items[j].Count
	})
	return items
}

func buildFilters(products []store.ProductSummary) filterOptions {
	platformCounts := map[string]int{}
	regionCounts := map[string]int{}
	typeCounts := map[string]int{}
	genreCounts := map[string]int{}
	categoryCounts := map[string]int{}
	minPrice := 0
	maxPrice := 0

	for _, p := range products {
		platformCounts[p.Platform]++
		regionCounts[p.Region]++
		typeCounts[p.ProductType]++
		genreCounts[p.Genre]++
		categoryCounts[p.Category]++
		price := p.LowestOffer.PriceCents
		if minPrice == 0 || price < minPrice {
			minPrice = price
		}
		ceiling := p.LowestOffer.OriginalPriceCents
		if ceiling > maxPrice {
			maxPrice = ceiling
		}
	}

	return filterOptions{
		Platforms:     facetsFromCounts(platformCounts),
		Regions:       facetsFromCounts(regionCounts),
		Types:         facetsFromCounts(typeCounts),
		Genres:        facetsFromCounts(genreCounts),
		Categories:    facetsFromCounts(categoryCounts),
		Price:         priceRange{MinCents: minPrice, MaxCents: maxPrice},
		TotalProducts: len(products),
		SortOptions: []sortOption{
			{Value: "relevance", Label: "Relevance"},
			{Value: "popular", Label: "Most popular"},
			{Value: "price_asc", Label: "Price: low to high"},
			{Value: "price_desc", Label: "Price: high to low"},
			{Value: "rating", Label: "Top rated"},
			{Value: "newest", Label: "Newest"},
			{Value: "discount", Label: "Biggest discount"},
		},
	}
}

func facetsFromCounts(counts map[string]int) []facet {
	result := make([]facet, 0, len(counts))
	for value, count := range counts {
		result = append(result, facet{Value: value, Label: value, Count: count})
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Count == result[j].Count {
			return result[i].Label < result[j].Label
		}
		return result[i].Count > result[j].Count
	})
	return result
}

func (s *Server) handleCatalog(w http.ResponseWriter, r *http.Request) {
	opts, err := parseCatalogOptions(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_filters", err.Error())
		return
	}
	products, err := s.store.ListProducts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load the catalog.")
		return
	}
	filtered, suggestion, _ := applyCatalog(products, opts)
	total := len(filtered)
	pageCount := 0
	if total > 0 {
		pageCount = (total + opts.Limit - 1) / opts.Limit
	}
	start := (opts.Page - 1) * opts.Limit
	if start > total {
		start = total
	}
	end := start + opts.Limit
	if end > total {
		end = total
	}
	pageProducts := filtered[start:end]
	if pageProducts == nil {
		pageProducts = []store.ProductSummary{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"products":   pageProducts,
		"total":      total,
		"page":       opts.Page,
		"pageSize":   opts.Limit,
		"pageCount":  pageCount,
		"query":      opts.Query,
		"suggestion": suggestion,
	})
}

func parseCatalogOptions(r *http.Request) (catalogOptions, error) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	opts := catalogOptions{
		Query:      query,
		Platforms:  multiValue(r, "platform"),
		Regions:    multiValue(r, "region"),
		Types:      multiValue(r, "type"),
		Genres:     multiValue(r, "genre"),
		Categories: multiValue(r, "category"),
		Sort:       strings.TrimSpace(r.URL.Query().Get("sort")),
		Page:       1,
		Limit:      12,
	}
	if opts.Sort == "" {
		if query != "" {
			opts.Sort = "relevance"
		} else {
			opts.Sort = "popular"
		}
	}
	if !validSort(opts.Sort) {
		return opts, errors.New("Unknown sort order.")
	}
	if raw := r.URL.Query().Get("page"); raw != "" {
		page, err := strconv.Atoi(raw)
		if err != nil || page < 1 {
			return opts, errors.New("Page must be a positive number.")
		}
		opts.Page = page
	}
	if raw := r.URL.Query().Get("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil || limit < 1 || limit > 48 {
			return opts, errors.New("Limit must be between 1 and 48.")
		}
		opts.Limit = limit
	}
	var err error
	if raw := strings.TrimSpace(r.URL.Query().Get("minPrice")); raw != "" {
		opts.MinPriceCents, err = eurosToCents(raw)
		if err != nil {
			return opts, errors.New("Minimum price must be a positive number.")
		}
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("maxPrice")); raw != "" {
		opts.MaxPriceCents, err = eurosToCents(raw)
		if err != nil {
			return opts, errors.New("Maximum price must be a positive number.")
		}
	}
	if opts.MinPriceCents > 0 && opts.MaxPriceCents > 0 && opts.MinPriceCents > opts.MaxPriceCents {
		return opts, errors.New("Minimum price cannot be greater than maximum price.")
	}
	return opts, nil
}

func multiValue(r *http.Request, key string) []string {
	values := r.URL.Query()[key]
	result := make([]string, 0)
	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			part = strings.TrimSpace(part)
			if part != "" {
				result = append(result, part)
			}
		}
	}
	return result
}

func eurosToCents(value string) (int, error) {
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil || parsed < 0 || math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return 0, errors.New("invalid amount")
	}
	return int(math.Round(parsed * 100)), nil
}

func validSort(value string) bool {
	switch value {
	case "relevance", "popular", "price_asc", "price_desc", "rating", "newest", "discount":
		return true
	}
	return false
}

func applyCatalog(products []store.ProductSummary, opts catalogOptions) ([]store.ProductSummary, string, map[string]float64) {
	scores := map[string]float64{}
	var candidates []store.ProductSummary
	if opts.Query != "" {
		titles := make([]string, len(products))
		for i, p := range products {
			titles[i] = p.Title
		}
		ranked := search.Rank(opts.Query, titles)
		for _, rankedProduct := range ranked {
			p := products[rankedProduct.Index]
			candidates = append(candidates, p)
			scores[p.Slug] = rankedProduct.Score
		}
	} else {
		candidates = append(candidates, products...)
	}

	platforms := lowerSet(opts.Platforms)
	regions := lowerSet(opts.Regions)
	types := lowerSet(opts.Types)
	genres := lowerSet(opts.Genres)
	categories := lowerSet(opts.Categories)

	filtered := make([]store.ProductSummary, 0, len(candidates))
	for _, p := range candidates {
		if len(platforms) > 0 && !platforms[strings.ToLower(p.Platform)] {
			continue
		}
		if len(regions) > 0 && !regions[strings.ToLower(p.Region)] {
			continue
		}
		if len(types) > 0 && !types[strings.ToLower(p.ProductType)] {
			continue
		}
		if len(genres) > 0 && !genres[strings.ToLower(p.Genre)] {
			continue
		}
		if len(categories) > 0 && !categories[strings.ToLower(p.Category)] {
			continue
		}
		if opts.MinPriceCents > 0 && p.LowestOffer.PriceCents < opts.MinPriceCents {
			continue
		}
		if opts.MaxPriceCents > 0 && p.LowestOffer.PriceCents > opts.MaxPriceCents {
			continue
		}
		filtered = append(filtered, p)
	}

	suggestion := ""
	if opts.Query != "" {
		titles := make([]string, len(products))
		for i, p := range products {
			titles[i] = p.Title
		}
		closest, score := search.Closest(opts.Query, titles)
		if closest != "" && score > 20 && !strings.EqualFold(search.Normalize(closest), search.Normalize(opts.Query)) && score < 700 {
			suggestion = closest
		}
	}

	sortProducts(filtered, opts.Sort, scores)
	return filtered, suggestion, scores
}

func sortProducts(products []store.ProductSummary, mode string, scores map[string]float64) {
	if mode == "relevance" && len(scores) > 0 {
		sort.SliceStable(products, func(i, j int) bool {
			return scores[products[i].Slug] > scores[products[j].Slug]
		})
		return
	}
	sort.SliceStable(products, func(i, j int) bool {
		a, b := products[i], products[j]
		switch mode {
		case "price_asc":
			return a.LowestOffer.PriceCents < b.LowestOffer.PriceCents
		case "price_desc":
			return a.LowestOffer.PriceCents > b.LowestOffer.PriceCents
		case "rating":
			if a.Rating == b.Rating {
				return a.RatingCount > b.RatingCount
			}
			return a.Rating > b.Rating
		case "newest":
			return a.ReleaseDate > b.ReleaseDate
		case "discount":
			if a.DiscountPercent == b.DiscountPercent {
				return a.RatingCount > b.RatingCount
			}
			return a.DiscountPercent > b.DiscountPercent
		default: // popular
			if a.RatingCount == b.RatingCount {
				return a.Rating > b.Rating
			}
			return a.RatingCount > b.RatingCount
		}
	})
}

func lowerSet(values []string) map[string]bool {
	set := make(map[string]bool, len(values))
	for _, value := range values {
		set[strings.ToLower(strings.TrimSpace(value))] = true
	}
	return set
}

func (s *Server) handleProduct(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	product, err := s.store.GetProduct(r.Context(), slug)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "product_not_found", "This product could not be found.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not load this product.")
		return
	}
	all, err := s.store.ListProducts(r.Context())
	if err != nil {
		all = nil
	}
	related := relatedProducts(all, product, 4)
	variants := giftCardVariants(all, product)
	writeJSON(w, http.StatusOK, map[string]any{
		"product":  product,
		"related":  related,
		"variants": variants,
	})
}

// giftCardVariants returns every denomination of the same gift-card family so
// the product page can render a value grid. Each entry is a complete product
// summary: the grid links to that denomination's own page instead of changing a
// value inside this product.
func giftCardVariants(all []store.ProductSummary, current *store.ProductDetail) []store.ProductSummary {
	variants := make([]store.ProductSummary, 0, 20)
	family := giftFamilyKey(current.Slug)
	if family == "" || current.GiftValueCents <= 0 {
		return variants
	}
	for _, product := range all {
		if product.GiftValueCents <= 0 || product.GiftCurrency != current.GiftCurrency {
			continue
		}
		if giftFamilyKey(product.Slug) != family {
			continue
		}
		variants = append(variants, product)
	}
	sort.SliceStable(variants, func(i, j int) bool {
		return variants[i].GiftValueCents < variants[j].GiftValueCents
	})
	return variants
}

// giftFamilyKey strips the denomination suffix from a generated gift-card slug:
// "steam-wallet-50-eur" -> "steam-wallet". It is deliberately conservative and
// only recognises the "-<amount>-<currency>" shape used by the catalogue.
func giftFamilyKey(slug string) string {
	parts := strings.Split(slug, "-")
	if len(parts) < 3 {
		return ""
	}
	currency := parts[len(parts)-1]
	amount := parts[len(parts)-2]
	if currency != "eur" && currency != "usd" {
		return ""
	}
	if amount == "" {
		return ""
	}
	for _, r := range amount {
		if r < '0' || r > '9' {
			return ""
		}
	}
	return strings.Join(parts[:len(parts)-2], "-")
}

func relatedProducts(all []store.ProductSummary, current *store.ProductDetail, limit int) []store.ProductSummary {
	type scored struct {
		product store.ProductSummary
		score   int
	}
	candidates := make([]scored, 0, len(all))
	for _, p := range all {
		if p.Slug == current.Slug {
			continue
		}
		score := 0
		if p.Genre == current.Genre {
			score += 5
		}
		if p.Platform == current.Platform {
			score += 3
		}
		if p.Category == current.Category {
			score += 2
		}
		if p.ProductType == current.ProductType {
			score++
		}
		candidates = append(candidates, scored{product: p, score: score})
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].score == candidates[j].score {
			return candidates[i].product.RatingCount > candidates[j].product.RatingCount
		}
		return candidates[i].score > candidates[j].score
	})
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}
	result := make([]store.ProductSummary, 0, len(candidates))
	for _, candidate := range candidates {
		result = append(result, candidate.product)
	}
	return result
}

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeError(w, http.StatusBadRequest, "missing_query", "Enter a product name to search.")
		return
	}
	products, err := s.store.ListProducts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Search is temporarily unavailable.")
		return
	}
	opts := catalogOptions{Query: query, Sort: "relevance", Page: 1, Limit: 24}
	filtered, suggestion, _ := applyCatalog(products, opts)
	total := len(filtered)
	limit := 24
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}
	if filtered == nil {
		filtered = []store.ProductSummary{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"products":   filtered,
		"total":      total,
		"query":      query,
		"suggestion": suggestion,
	})
}

func (s *Server) handleSearchSuggest(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	limit := 6
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 12 {
			limit = parsed
		}
	}
	if query == "" || len([]rune(search.Normalize(query))) < 2 {
		writeJSON(w, http.StatusOK, map[string]any{"suggestions": []store.ProductSummary{}, "suggestion": "", "query": query})
		return
	}
	products, err := s.store.ListProducts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Search is temporarily unavailable.")
		return
	}
	opts := catalogOptions{Query: query, Sort: "relevance", Page: 1, Limit: limit}
	filtered, suggestion, _ := applyCatalog(products, opts)
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}
	if filtered == nil {
		filtered = []store.ProductSummary{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"suggestions": filtered, "suggestion": suggestion, "query": query})
}
