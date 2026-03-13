package models

import "time"

// Offer representa uma oferta de produto
type Offer struct {
	ID           string    `json:"id"`
	ProductName  string    `json:"product_name"`
	Description  string    `json:"description"`
	Price        float64   `json:"price"`
	OldPrice     float64   `json:"old_price,omitempty"`
	DiscountPct  float64   `json:"discount_pct,omitempty"`
	ImageURL     string    `json:"image_url"`
	ProductURL   string    `json:"product_url"`
	Store        Store     `json:"store"`
	Category     string    `json:"category"`
	Unit         string    `json:"unit"`
	ValidUntil   time.Time `json:"valid_until,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	Distance     float64   `json:"distance_km,omitempty"`
	IsOnline     bool      `json:"is_online"`
}

// Store representa um estabelecimento
type Store struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	LogoURL   string   `json:"logo_url"`
	Type      string   `json:"type"` // supermercado, atacado, hipermercado
	Lat       float64  `json:"lat,omitempty"`
	Lng       float64  `json:"lng,omitempty"`
	Address   string   `json:"address,omitempty"`
	Website   string   `json:"website"`
	AppURL    string   `json:"app_url,omitempty"`
	IsOnline  bool     `json:"is_online"`
}

// SearchParams parâmetros da busca
type SearchParams struct {
	Query    string  `json:"query"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	RadiusKm float64 `json:"radius_km"`
	Category string  `json:"category,omitempty"`
	SortBy   string  `json:"sort_by"` // price, discount, distance
	Page     int     `json:"page"`
	PageSize int     `json:"page_size"`
}

// SearchResponse resposta paginada
type SearchResponse struct {
	Offers     []Offer `json:"offers"`
	Total      int     `json:"total"`
	Page       int     `json:"page"`
	PageSize   int     `json:"page_size"`
	HasMore    bool    `json:"has_more"`
	QueryTime  float64 `json:"query_time_ms"`
}

// GeoLocation localização do usuário
type GeoLocation struct {
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	City    string  `json:"city"`
	State   string  `json:"state"`
	Country string  `json:"country"`
}

// Category categorias de produtos
type Category struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

// NearbyStore loja próxima ao usuário
type NearbyStore struct {
	Store      Store   `json:"store"`
	DistanceKm float64 `json:"distance_km"`
	OffersCount int    `json:"offers_count"`
}
