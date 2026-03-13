package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"mercadofacil/internal/cache"
	"mercadofacil/internal/models"
	"mercadofacil/internal/scraper"
)

type Handler struct {
	aggregator *scraper.Aggregator
	cache      *cache.Cache
}

func NewHandler(agg *scraper.Aggregator, c *cache.Cache) *Handler {
	return &Handler{aggregator: agg, cache: c}
}

func (h *Handler) ServeHTTP(mux *http.ServeMux) {
	mux.HandleFunc("/api/search", h.withCORS(h.Search))
	mux.HandleFunc("/api/nearby-stores", h.withCORS(h.NearbyStores))
	mux.HandleFunc("/api/categories", h.withCORS(h.Categories))
	mux.HandleFunc("/api/health", h.withCORS(h.Health))
}

// Search godoc
// GET /api/search?q=arroz&lat=-23.55&lng=-46.63&radius=10&sort=price&page=1&category=mercearia
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	params := models.SearchParams{
		Query:    q.Get("q"),
		Category: q.Get("category"),
		SortBy:   q.Get("sort"),
		Page:     parseIntDefault(q.Get("page"), 1),
		PageSize: parseIntDefault(q.Get("page_size"), 20),
	}

	var err error
	if params.Lat, err = parseFloat(q.Get("lat")); err != nil {
		httpError(w, "lat inválido", http.StatusBadRequest)
		return
	}
	if params.Lng, err = parseFloat(q.Get("lng")); err != nil {
		httpError(w, "lng inválido", http.StatusBadRequest)
		return
	}
	params.RadiusKm = parseFloatDefault(q.Get("radius"), 10.0)

	// Cache key
	cacheKey := fmt.Sprintf("search:%s:%.4f:%.4f:%.1f:%s:%s:%d",
		params.Query, params.Lat, params.Lng, params.RadiusKm,
		params.Category, params.SortBy, params.Page)

	if cached, ok := h.cache.Get(cacheKey); ok {
		writeJSON(w, cached)
		return
	}

	result := h.aggregator.Search(params)
	h.cache.Set(cacheKey, result)
	writeJSON(w, result)
}

// NearbyStores retorna lojas próximas ao usuário
func (h *Handler) NearbyStores(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	lat, err := parseFloat(q.Get("lat"))
	if err != nil {
		httpError(w, "lat inválido", http.StatusBadRequest)
		return
	}
	lng, err := parseFloat(q.Get("lng"))
	if err != nil {
		httpError(w, "lng inválido", http.StatusBadRequest)
		return
	}
	radius := parseFloatDefault(q.Get("radius"), 10.0)

	cacheKey := fmt.Sprintf("stores:%.4f:%.4f:%.1f", lat, lng, radius)
	if cached, ok := h.cache.Get(cacheKey); ok {
		writeJSON(w, cached)
		return
	}

	stores := h.aggregator.GetNearbyStores(lat, lng, radius)
	h.cache.Set(cacheKey, stores)
	writeJSON(w, stores)
}

// Categories retorna categorias disponíveis
func (h *Handler) Categories(w http.ResponseWriter, r *http.Request) {
	categories := []models.Category{
		{ID: "todos", Name: "Todos", Icon: "🛒", Color: "#FF6B35"},
		{ID: "mercearia", Name: "Mercearia", Icon: "🌾", Color: "#F7931E"},
		{ID: "hortifruti", Name: "Hortifruti", Icon: "🥦", Color: "#4CAF50"},
		{ID: "açougue", Name: "Açougue", Icon: "🥩", Color: "#E53935"},
		{ID: "laticínios", Name: "Laticínios", Icon: "🧀", Color: "#FFC107"},
		{ID: "padaria", Name: "Padaria", Icon: "🍞", Color: "#795548"},
		{ID: "frios", Name: "Frios", Icon: "🥚", Color: "#00BCD4"},
		{ID: "bebidas", Name: "Bebidas", Icon: "🥤", Color: "#9C27B0"},
		{ID: "limpeza", Name: "Limpeza", Icon: "🧹", Color: "#607D8B"},
		{ID: "higiene", Name: "Higiene", Icon: "🧴", Color: "#FF4081"},
	}
	writeJSON(w, categories)
}

// Health endpoint de saúde
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]interface{}{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// withCORS middleware CORS para dev e produção
func (h *Handler) withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func httpError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func parseFloat(s string) (float64, error) {
	if s == "" {
		return 0, fmt.Errorf("vazio")
	}
	return strconv.ParseFloat(s, 64)
}

func parseFloatDefault(s string, def float64) float64 {
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return def
	}
	return v
}

func parseIntDefault(s string, def int) int {
	v, err := strconv.Atoi(s)
	if err != nil || v < 1 {
		return def
	}
	return v
}
