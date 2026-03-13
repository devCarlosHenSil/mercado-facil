package scraper

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
	"strings"
	"time"

	"mercadofacil/internal/geo"
	"mercadofacil/internal/models"
)

// Aggregator agrega ofertas de múltiplas fontes
type Aggregator struct {
	stores []models.Store
}

func NewAggregator() *Aggregator {
	return &Aggregator{
		stores: seedStores(),
	}
}

// Search busca ofertas com filtros geoespaciais e de texto
func (a *Aggregator) Search(params models.SearchParams) models.SearchResponse {
	start := time.Now()

	// Filtra lojas no raio
	nearbyStores := a.filterStoresByRadius(params.Lat, params.Lng, params.RadiusKm)

	// Gera ofertas (em produção: scraping real + APIs)
	offers := a.generateOffers(nearbyStores, params)

	// Aplica filtro de texto
	if params.Query != "" {
		offers = filterByQuery(offers, params.Query)
	}

	// Aplica filtro de categoria
	if params.Category != "" && params.Category != "todos" {
		offers = filterByCategory(offers, params.Category)
	}

	// Ordena
	sortOffers(offers, params.SortBy)

	// Paginação
	total := len(offers)
	start2 := (params.Page - 1) * params.PageSize
	if start2 >= total {
		start2 = 0
	}
	end := start2 + params.PageSize
	if end > total {
		end = total
	}

	elapsed := float64(time.Since(start).Microseconds()) / 1000.0

	return models.SearchResponse{
		Offers:    offers[start2:end],
		Total:     total,
		Page:      params.Page,
		PageSize:  params.PageSize,
		HasMore:   end < total,
		QueryTime: elapsed,
	}
}

// GetNearbyStores retorna lojas próximas com contagem de ofertas
func (a *Aggregator) GetNearbyStores(lat, lng, radiusKm float64) []models.NearbyStore {
	nearby := a.filterStoresByRadius(lat, lng, radiusKm)
	result := make([]models.NearbyStore, 0, len(nearby))

	for _, s := range nearby {
		dist := 0.0
		if !s.IsOnline {
			dist = geo.Haversine(lat, lng, s.Lat, s.Lng)
		}
		result = append(result, models.NearbyStore{
			Store:       s,
			DistanceKm:  math.Round(dist*10) / 10,
			OffersCount: 15 + rand.Intn(85),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].DistanceKm < result[j].DistanceKm
	})

	return result
}

func (a *Aggregator) filterStoresByRadius(lat, lng, radiusKm float64) []models.Store {
	result := []models.Store{}
	for _, s := range a.stores {
		if s.IsOnline {
			result = append(result, s)
			continue
		}
		if geo.IsWithinRadius(lat, lng, s.Lat, s.Lng, radiusKm) {
			result = append(result, s)
		}
	}
	return result
}

func filterByQuery(offers []models.Offer, q string) []models.Offer {
	q = strings.ToLower(q)
	result := []models.Offer{}
	for _, o := range offers {
		if strings.Contains(strings.ToLower(o.ProductName), q) ||
			strings.Contains(strings.ToLower(o.Description), q) ||
			strings.Contains(strings.ToLower(o.Category), q) {
			result = append(result, o)
		}
	}
	return result
}

func filterByCategory(offers []models.Offer, cat string) []models.Offer {
	result := []models.Offer{}
	for _, o := range offers {
		if strings.EqualFold(o.Category, cat) {
			result = append(result, o)
		}
	}
	return result
}

func sortOffers(offers []models.Offer, by string) {
	switch by {
	case "price":
		sort.Slice(offers, func(i, j int) bool {
			return offers[i].Price < offers[j].Price
		})
	case "discount":
		sort.Slice(offers, func(i, j int) bool {
			return offers[i].DiscountPct > offers[j].DiscountPct
		})
	case "distance":
		sort.Slice(offers, func(i, j int) bool {
			return offers[i].Distance < offers[j].Distance
		})
	default:
		// relevância: score combinado desconto + proximidade
		sort.Slice(offers, func(i, j int) bool {
			scoreI := offers[i].DiscountPct - offers[i].Distance*2
			scoreJ := offers[j].DiscountPct - offers[j].Distance*2
			return scoreI > scoreJ
		})
	}
}

// generateOffers gera ofertas realistas para demonstração
// Em produção: substituir por scrapers reais (Mercado Livre, Promobit, etc.)
func (a *Aggregator) generateOffers(stores []models.Store, params models.SearchParams) []models.Offer {
	offers := []models.Offer{}
	products := productCatalog()

	for _, store := range stores {
		dist := 0.0
		if !store.IsOnline {
			dist = math.Round(geo.Haversine(params.Lat, params.Lng, store.Lat, store.Lng)*10) / 10
		}

		// Cada loja tem um subset de produtos
		r := rand.New(rand.NewSource(hashStore(store.ID)))
		numProducts := 8 + r.Intn(15)

		for i := 0; i < numProducts && i < len(products); i++ {
			idx := r.Intn(len(products))
			p := products[idx]

			basePrice := p.basePrice * (0.85 + r.Float64()*0.30)
			discountPct := float64(5 + r.Intn(55))
			oldPrice := basePrice / (1 - discountPct/100)

			offers = append(offers, models.Offer{
				ID:          fmt.Sprintf("%s-%d", store.ID, i),
				ProductName: p.name,
				Description: p.description,
				Price:       math.Round(basePrice*100) / 100,
				OldPrice:    math.Round(oldPrice*100) / 100,
				DiscountPct: discountPct,
				ImageURL:    p.imageURL,
				ProductURL:  store.Website,
				Store:       store,
				Category:    p.category,
				Unit:        p.unit,
				ValidUntil:  time.Now().AddDate(0, 0, 3+r.Intn(7)),
				CreatedAt:   time.Now().Add(-time.Duration(r.Intn(24)) * time.Hour),
				Distance:    dist,
				IsOnline:    store.IsOnline,
			})
		}
	}

	return offers
}

func hashStore(id string) int64 {
	var h int64 = 5381
	for _, c := range id {
		h = (h << 5) + h + int64(c)
	}
	return h
}

type productTemplate struct {
	name        string
	description string
	basePrice   float64
	imageURL    string
	category    string
	unit        string
}

func productCatalog() []productTemplate {
	return []productTemplate{
		{"Arroz Branco Tipo 1", "Arroz agulhinha premium 5kg", 18.90, "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300", "mercearia", "5kg"},
		{"Feijão Carioca", "Feijão carioca selecionado 1kg", 7.49, "https://images.unsplash.com/photo-1515543904379-3d757afe72c4?w=300", "mercearia", "1kg"},
		{"Óleo de Soja", "Óleo de soja refinado 900ml", 5.99, "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300", "mercearia", "900ml"},
		{"Leite Integral UHT", "Leite integral longa vida 1L", 4.29, "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300", "laticínios", "1L"},
		{"Macarrão Espaguete", "Macarrão espaguete 500g", 3.49, "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=300", "mercearia", "500g"},
		{"Açúcar Refinado", "Açúcar refinado especial 1kg", 4.79, "https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?w=300", "mercearia", "1kg"},
		{"Café Moído", "Café torrado e moído 500g", 14.90, "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=300", "mercearia", "500g"},
		{"Frango Inteiro", "Frango inteiro resfriado kg", 9.99, "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300", "açougue", "kg"},
		{"Carne Moída", "Carne moída bovina 1ª kg", 32.90, "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=300", "açougue", "kg"},
		{"Tomate", "Tomate italiano fresco kg", 4.99, "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=300", "hortifruti", "kg"},
		{"Banana Prata", "Banana prata madura kg", 3.49, "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300", "hortifruti", "kg"},
		{"Alface Americana", "Alface americana hidropônica un", 2.99, "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=300", "hortifruti", "un"},
		{"Iogurte Natural", "Iogurte natural integral 170g", 3.29, "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300", "laticínios", "170g"},
		{"Queijo Mussarela", "Queijo mussarela fatiado 150g", 8.90, "https://images.unsplash.com/photo-1589881133595-a3c085cb731d?w=300", "laticínios", "150g"},
		{"Presunto Cozido", "Presunto cozido fatiado 200g", 7.49, "https://images.unsplash.com/photo-1621096049248-41bcf6393c1e?w=300", "frios", "200g"},
		{"Detergente Líquido", "Detergente líquido neutro 500ml", 2.49, "https://images.unsplash.com/photo-1585441695325-f6e1891a5b5f?w=300", "limpeza", "500ml"},
		{"Sabão em Pó", "Sabão em pó multiação 1kg", 9.99, "https://images.unsplash.com/photo-1628524634305-e2e4f0cf79b7?w=300", "limpeza", "1kg"},
		{"Papel Higiênico", "Papel higiênico folha dupla 12un", 19.90, "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=300", "higiene", "12un"},
		{"Shampoo", "Shampoo hidratação intensa 400ml", 12.90, "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300", "higiene", "400ml"},
		{"Refrigerante Cola", "Refrigerante cola 2L", 7.99, "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=300", "bebidas", "2L"},
		{"Suco de Laranja", "Suco de laranja integral 1L", 8.49, "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300", "bebidas", "1L"},
		{"Cerveja Lata", "Cerveja pilsen lata 350ml", 3.49, "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300", "bebidas", "350ml"},
		{"Pão de Forma", "Pão de forma integral 500g", 6.99, "https://images.unsplash.com/photo-1534432182912-63863115e106?w=300", "padaria", "500g"},
		{"Margarina", "Margarina com sal 500g", 5.49, "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300", "laticínios", "500g"},
		{"Biscoito Recheado", "Biscoito recheado chocolate 130g", 2.99, "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300", "mercearia", "130g"},
		{"Ovos Brancos", "Ovos brancos extra caixa 12un", 12.90, "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300", "mercearia", "12un"},
		{"Farinha de Trigo", "Farinha de trigo especial 1kg", 4.49, "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300", "mercearia", "1kg"},
		{"Azeite Extra Virgem", "Azeite extra virgem 500ml", 24.90, "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300", "mercearia", "500ml"},
		{"Molho de Tomate", "Molho de tomate tradicional 340g", 3.29, "https://images.unsplash.com/photo-1608835291093-394b0c943a75?w=300", "mercearia", "340g"},
		{"Batata Inglesa", "Batata inglesa lavada kg", 4.99, "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300", "hortifruti", "kg"},
	}
}

func seedStores() []models.Store {
	return []models.Store{
		// Online (nacionais)
		{
			ID: "mercadolivre", Name: "Mercado Livre",
			LogoURL: "https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/6.6.92/mercadolibre/logo__large_plus.png",
			Type: "marketplace", Website: "https://www.mercadolivre.com.br/ofertas", IsOnline: true,
		},
		{
			ID: "shopee", Name: "Shopee Supermercado",
			LogoURL: "https://cf.shopee.com.br/file/sg-11134004-23030-r77x7ibm8mov1b",
			Type: "marketplace", Website: "https://shopee.com.br/m/supermercado", IsOnline: true,
		},
		{
			ID: "ifood-shop", Name: "iFood Shop",
			LogoURL: "https://logodownload.org/wp-content/uploads/2017/05/ifood-logo.png",
			Type: "delivery", Website: "https://www.ifood.com.br/supermercados", IsOnline: true,
		},
		{
			ID: "carrefour-online", Name: "Carrefour Online",
			LogoURL: "https://logodownload.org/wp-content/uploads/2014/12/carrefour-logo.png",
			Type: "hipermercado", Website: "https://www.carrefour.com.br", IsOnline: true,
		},
		{
			ID: "extra-online", Name: "Extra Online",
			LogoURL: "https://logodownload.org/wp-content/uploads/2016/07/extra-logo.png",
			Type: "hipermercado", Website: "https://www.extra.com.br", IsOnline: true,
		},
		{
			ID: "americanas-super", Name: "Americanas Supermercado",
			LogoURL: "https://logodownload.org/wp-content/uploads/2014/02/americanas-logo.png",
			Type: "marketplace", Website: "https://www.americanas.com.br/categoria/mercado", IsOnline: true,
		},
		// Atacados físicos (simulados próximos a qualquer cidade BR)
		{
			ID: "assai", Name: "Assaí Atacadista",
			LogoURL: "https://logodownload.org/wp-content/uploads/2021/02/assai-atacadista-logo.png",
			Type: "atacado", Website: "https://www.assai.com.br",
			Lat: -23.5505, Lng: -46.6333, IsOnline: false,
		},
		{
			ID: "atacadao", Name: "Atacadão",
			LogoURL: "https://logodownload.org/wp-content/uploads/2021/09/atacadao-logo.png",
			Type: "atacado", Website: "https://www.atacadao.com.br",
			Lat: -23.5489, Lng: -46.6388, IsOnline: false,
		},
		{
			ID: "makro", Name: "Makro Atacadista",
			LogoURL: "https://logodownload.org/wp-content/uploads/2021/09/makro-logo.png",
			Type: "atacado", Website: "https://www.makro.com.br",
			Lat: -23.5601, Lng: -46.6547, IsOnline: false,
		},
		{
			ID: "carrefour-hyper", Name: "Carrefour Hipermercado",
			LogoURL: "https://logodownload.org/wp-content/uploads/2014/12/carrefour-logo.png",
			Type: "hipermercado", Website: "https://www.carrefour.com.br",
			Lat: -23.5450, Lng: -46.6200, IsOnline: false,
		},
		{
			ID: "pao-acucar", Name: "Pão de Açúcar",
			LogoURL: "https://logodownload.org/wp-content/uploads/2016/10/pao-de-acucar-logo.png",
			Type: "supermercado", Website: "https://www.paodeacucar.com",
			Lat: -23.5520, Lng: -46.6310, IsOnline: false,
		},
		{
			ID: "dia", Name: "Dia Supermercado",
			LogoURL: "https://logodownload.org/wp-content/uploads/2021/09/dia-supermercados-logo.png",
			Type: "supermercado", Website: "https://www.dia.com.br",
			Lat: -23.5467, Lng: -46.6421, IsOnline: false,
		},
	}
}
