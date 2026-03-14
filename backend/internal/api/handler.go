package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"mercadofacil/internal/cache"
	"mercadofacil/internal/scraper"
)

const scraperBase = "http://localhost:3001"

type Handler struct {
	aggregator *scraper.Aggregator
	cache      *cache.Cache
	httpClient *http.Client
}

func NewHandler(agg *scraper.Aggregator, c *cache.Cache) *Handler {
	return &Handler{
		aggregator: agg,
		cache:      c,
		httpClient: &http.Client{Timeout: 28 * time.Second},
	}
}

func (h *Handler) ServeHTTP(mux *http.ServeMux) {
	mux.HandleFunc("/api/search",  h.withCORS(h.Search))
	mux.HandleFunc("/api/stores",  h.withCORS(h.Stores))
	mux.HandleFunc("/api/health",  h.withCORS(h.Health))
}

// POST /api/search — proxy para o serviço Node de busca
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpError(w, "use POST com body {query: string}", http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 1024))
	if err != nil {
		httpError(w, "erro lendo body", http.StatusBadRequest)
		return
	}

	// Valida JSON mínimo
	var req map[string]interface{}
	if err := json.Unmarshal(body, &req); err != nil || req["query"] == nil {
		httpError(w, `body deve ser {"query": "nome do produto"}`, http.StatusBadRequest)
		return
	}

	// Proxy para o Node
	resp, err := h.httpClient.Post(scraperBase+"/search", "application/json", bytes.NewReader(body))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Servico de busca indisponivel. Verifique se o scraper esta rodando (npm start na pasta scraper/).",
			"details": err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// GET /api/stores — lista lojas suportadas
func (h *Handler) Stores(w http.ResponseWriter, r *http.Request) {
	resp, err := h.httpClient.Get(scraperBase + "/stores")
	if err != nil {
		writeJSON(w, []interface{}{})
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

// GET /api/health
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	// Verifica se scraper está online
	scraperOk := false
	resp, err := h.httpClient.Get(scraperBase + "/health")
	if err == nil && resp.StatusCode == 200 {
		scraperOk = true
		resp.Body.Close()
	}
	writeJSON(w, map[string]interface{}{
		"ok":      true,
		"scraper": scraperOk,
		"ts":      fmt.Sprintf("%d", time.Now().Unix()),
	})
}

// ─── Helpers ──────────────────────────────────────────────────────────────
func withCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
	w.Header().Set("Content-Type", "application/json")
}

func (h *Handler) withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		withCORSHeaders(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
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
