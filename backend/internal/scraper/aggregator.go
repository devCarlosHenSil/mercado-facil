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
	return append(storesItu(), storesOnlineNacional()...)
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCO ITU — Estabelecimentos físicos da cidade de Itu / SP
//
// Coordenadas reais levantadas via fontes públicas e Google Maps.
// Centro de Itu: lat -23.2644, lng -47.2994
//
// Para adicionar uma nova loja:
//  1. Obtenha lat/lng via maps.google.com (clique com botão direito → "O que há aqui?")
//  2. Preencha todos os campos abaixo seguindo o padrão existente
//  3. Mantenha o ID em kebab-case único
//
// Fontes verificadas:
//  - Prefeitura de Itu (itu.sp.gov.br) — inaugurações oficiais
//  - Tiendeo / Shopfully — endereços e encartes
//  - Sites oficiais de cada rede
// ══════════════════════════════════════════════════════════════════════════════
func storesItu() []models.Store {
	return []models.Store{

		// ── ATACADOS ─────────────────────────────────────────────────────────

		{
			// Av. Dr. Ermelindo Maffei, 945 — Jardim Paraíso
			// Horário: seg-sáb 7h-22h / dom 8h-18h
			ID:      "atacadao-itu",
			Name:    "Atacadão Itu",
			LogoURL: "https://logodownload.org/wp-content/uploads/2021/09/atacadao-logo.png",
			Type:    "atacado",
			Website: "https://www.atacadao.com.br/lojas",
			AppURL:  "https://www.atacadao.com.br/app",
			Address: "Av. Dr. Ermelindo Maffei, 945 — Jardim Paraíso",
			Lat:     -23.2710, Lng: -47.2830,
			IsOnline: false,
		},
		{
			// Av. Caetano Ruggieri, 3518 — Cruz das Almas
			// 9.000 m² · 13 corredores · 20 caixas + 6 self-checkout · 218 vagas
			// Horário: seg-sáb 7h-22h / dom 7h-20h
			ID:      "roldao-itu",
			Name:    "Roldão Atacadista Itu",
			LogoURL: "https://roldao.com.br/wp-content/uploads/2021/09/logo-roldao.png",
			Type:    "atacado",
			Website: "https://roldao.com.br/lojas/nossas-lojas-itu/",
			AppURL:  "https://roldao.com.br",
			Address: "Av. Caetano Ruggieri, 3518 — Cruz das Almas",
			Lat:     -23.2780, Lng: -47.2870,
			IsOnline: false,
		},

		// ── HIPERMERCADOS ────────────────────────────────────────────────────

		{
			// Rod. Marechal Rondon, Km 105 — Jardim Paraíso
			// Hipermercado com galeria e postos
			ID:      "pao-acucar-itu-rondon",
			Name:    "Pão de Açúcar Hipermercado Itu",
			LogoURL: "https://logodownload.org/wp-content/uploads/2016/10/pao-de-acucar-logo.png",
			Type:    "hipermercado",
			Website: "https://www.paodeacucar.com/ofertas",
			AppURL:  "https://www.paodeacucar.com/app",
			Address: "Rod. Marechal Rondon, Km 105 — Jardim Paraíso",
			Lat:     -23.2666, Lng: -47.2800,
			IsOnline: false,
		},

		// ── SUPERMERCADOS ────────────────────────────────────────────────────

		{
			// Av. Prudente de Moraes, 210 — Vila Nova
			// Unidade premium com adega e orgânicos · 7h-22h
			ID:      "pao-acucar-itu-vila-nova",
			Name:    "Pão de Açúcar Vila Nova",
			LogoURL: "https://logodownload.org/wp-content/uploads/2016/10/pao-de-acucar-logo.png",
			Type:    "supermercado",
			Website: "https://www.paodeacucar.com/ofertas",
			AppURL:  "https://www.paodeacucar.com/app",
			Address: "Av. Prudente de Moraes, 210 — Vila Nova",
			Lat:     -23.2620, Lng: -47.2960,
			IsOnline: false,
		},
		{
			// Av. Dr. Otaviano Pereira Mendes, 423
			// Terceira unidade Pão de Açúcar em Itu · inaugurada dez/2023
			// 1.493 m² · 109 colaboradores · 7h-22h
			ID:      "pao-acucar-itu-otaviano",
			Name:    "Pão de Açúcar Itu Centro",
			LogoURL: "https://logodownload.org/wp-content/uploads/2016/10/pao-de-acucar-logo.png",
			Type:    "supermercado",
			Website: "https://www.paodeacucar.com/ofertas",
			AppURL:  "https://www.paodeacucar.com/app",
			Address: "Av. Dr. Otaviano Pereira Mendes, 423",
			Lat:     -23.2650, Lng: -47.2990,
			IsOnline: false,
		},
		{
			// Av. Francisco Ernesto Favero, 534 — Jardim do Estádio / Rancho Grande
			// Tel: (19) 3403-2904 · WhatsApp: 19 99783-5174
			// Rede regional com 14 lojas · adega · espaço gourmet
			ID:      "delta-itu",
			Name:    "Delta Supermercados Itu",
			LogoURL: "https://www.deltasuper.com.br/wp-content/uploads/2021/10/logo-delta.png",
			Type:    "supermercado",
			Website: "https://www.deltasuper.com.br/ofertas-itu/",
			AppURL:  "https://www.deltasuper.com.br/app",
			Address: "Av. Francisco Ernesto Favero, 534 — Jardim do Estádio",
			Lat:     -23.2750, Lng: -47.3010,
			IsOnline: false,
		},
		{
			// Av. Eugen Wissmann, 600 — São Luiz
			// 18.000 m² · 300 vagas cobertas · 34 caixas · drogaria interna
			// Horário: seg-sáb 7h-22h · dom 8h-20h
			ID:      "sao-vicente-itu-eugen",
			Name:    "Supermercados São Vicente Itu",
			LogoURL: "https://www.saovicente.com.br/img/logo-sao-vicente.png",
			Type:    "supermercado",
			Website: "https://www.saovicente.com.br/ofertas",
			AppURL:  "https://www.saovicente.com.br",
			Address: "Av. Eugen Wissmann, 600 — São Luiz",
			Lat:     -23.2685, Lng: -47.3055,
			IsOnline: false,
		},
		{
			// Av. Eugen Wissmann, 2021 — São Luiz (segunda unidade)
			ID:      "sao-vicente-itu-eugen2",
			Name:    "São Vicente Itu (Unid. 2)",
			LogoURL: "https://www.saovicente.com.br/img/logo-sao-vicente.png",
			Type:    "supermercado",
			Website: "https://www.saovicente.com.br/ofertas",
			AppURL:  "https://www.saovicente.com.br",
			Address: "Av. Eugen Wissmann, 2021 — São Luiz",
			Lat:     -23.2660, Lng: -47.3080,
			IsOnline: false,
		},

		// ── SUPERMERCADOS LOCAIS / REGIONAIS ─────────────────────────────────

		{
			// R. Argemiro da Silveira D'Elboux, 210
			// Referência nos buscadores locais de Itu
			ID:      "paulistao-itu",
			Name:    "Supermercado Paulistão Itu",
			LogoURL: "https://ui-avatars.com/api/?name=Paulist%C3%A3o&background=e53935&color=fff&bold=true&size=128",
			Type:    "supermercado",
			Website: "https://www.google.com/maps/search/Supermercado+Paulist%C3%A3o+Itu",
			Address: "R. Argemiro da Silveira D'Elboux, 210",
			Lat:     -23.2700, Lng: -47.2950,
			IsOnline: false,
		},
		{
			// R. Vinte de Janeiro, 348
			// Supermercados Caetano — rede regional
			ID:      "caetano-itu",
			Name:    "Supermercados Caetano Itu",
			LogoURL: "https://ui-avatars.com/api/?name=Caetano&background=1565c0&color=fff&bold=true&size=128",
			Type:    "supermercado",
			Website: "https://www.google.com/maps/search/Supermercados+Caetano+Itu",
			Address: "R. Vinte de Janeiro, 348",
			Lat:     -23.2630, Lng: -47.2970,
			IsOnline: false,
		},
		{
			// Atacadão do Frios — Centro · Rua Santana, 382
			// Especializado: frios, laticínios, congelados, mercearia · desde 2004
			// Atende varejo e atacado (pizzarias, lanchonetes, restaurantes)
			ID:      "atacadao-frios-itu",
			Name:    "Atacadão do Frios Itu",
			LogoURL: "https://ui-avatars.com/api/?name=Atacad%C3%A3o+Frios&background=0097a7&color=fff&bold=true&size=128",
			Type:    "atacado",
			Website: "https://www.sitedacidade.com.br/mercados-em-itu-sp",
			Address: "Rua Santana, 382 — Centro",
			Lat:     -23.2644, Lng: -47.2994,
			IsOnline: false,
		},

		// ── AGREGA ENCARTES DIGITAIS DE ITU ──────────────────────────────────
		// Fontes online especializadas em encartes/folhetos de Itu

		{
			// Tiendeo — agrega encartes semanais de todos os supermercados de Itu
			ID:      "tiendeo-itu",
			Name:    "Encartes Itu (Tiendeo)",
			LogoURL: "https://ui-avatars.com/api/?name=Tiendeo&background=ff5722&color=fff&bold=true&size=128",
			Type:    "agregador",
			Website: "https://www.tiendeo.com.br/itu/supermercados",
			IsOnline: true,
		},
		{
			// Shopfully / Publitas — encartes digitais atualizados semanalmente
			ID:      "shopfully-itu",
			Name:    "Folhetos Itu (Shopfully)",
			LogoURL: "https://ui-avatars.com/api/?name=Shopfully&background=8e24aa&color=fff&bold=true&size=128",
			Type:    "agregador",
			Website: "https://www.shopfully.com.br/itu/promocoes",
			IsOnline: true,
		},
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCO NACIONAL — Lojas online e marketplaces com entrega em todo o Brasil
// Estas lojas aparecem para todos os usuários independente da localização.
// ══════════════════════════════════════════════════════════════════════════════
func storesOnlineNacional() []models.Store {
	return []models.Store{
		{
			ID:      "mercadolivre",
			Name:    "Mercado Livre Supermercado",
			LogoURL: "https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/6.6.92/mercadolibre/logo__large_plus.png",
			Type:    "marketplace",
			Website: "https://www.mercadolivre.com.br/supermercado",
			AppURL:  "https://www.mercadolivre.com.br/app",
			IsOnline: true,
		},
		{
			ID:      "shopee-super",
			Name:    "Shopee Supermercado",
			LogoURL: "https://cf.shopee.com.br/file/sg-11134004-23030-r77x7ibm8mov1b",
			Type:    "marketplace",
			Website: "https://shopee.com.br/m/supermercado",
			AppURL:  "https://shopee.com.br/app",
			IsOnline: true,
		},
		{
			ID:      "ifood-mercado",
			Name:    "iFood Mercado",
			LogoURL: "https://logodownload.org/wp-content/uploads/2017/05/ifood-logo.png",
			Type:    "delivery",
			Website: "https://www.ifood.com.br/supermercados",
			AppURL:  "https://www.ifood.com.br/app",
			IsOnline: true,
		},
		{
			ID:      "carrefour-online",
			Name:    "Carrefour Online",
			LogoURL: "https://logodownload.org/wp-content/uploads/2014/12/carrefour-logo.png",
			Type:    "hipermercado",
			Website: "https://www.carrefour.com.br/supermercado",
			AppURL:  "https://www.carrefour.com.br/app",
			IsOnline: true,
		},
		{
			ID:      "pao-acucar-online",
			Name:    "Pão de Açúcar Online",
			LogoURL: "https://logodownload.org/wp-content/uploads/2016/10/pao-de-acucar-logo.png",
			Type:    "supermercado",
			Website: "https://www.paodeacucar.com",
			AppURL:  "https://www.paodeacucar.com/app",
			IsOnline: true,
		},
		{
			ID:      "americanas-super",
			Name:    "Americanas Supermercado",
			LogoURL: "https://logodownload.org/wp-content/uploads/2014/02/americanas-logo.png",
			Type:    "marketplace",
			Website: "https://www.americanas.com.br/categoria/mercado",
			AppURL:  "https://www.americanas.com.br/app",
			IsOnline: true,
		},
		{
			ID:      "rappi-market",
			Name:    "Rappi Market",
			LogoURL: "https://logodownload.org/wp-content/uploads/2019/07/rappi-logo.png",
			Type:    "delivery",
			Website: "https://www.rappi.com.br/supermercados",
			AppURL:  "https://www.rappi.com.br/app",
			IsOnline: true,
		},
		{
			// Promobit — agregador nacional de ofertas e cupons
			ID:      "promobit",
			Name:    "Promobit Supermercado",
			LogoURL: "https://ui-avatars.com/api/?name=Promobit&background=f57c00&color=fff&bold=true&size=128",
			Type:    "agregador",
			Website: "https://www.promobit.com.br/feed/categorias/mercado-e-alimentos",
			IsOnline: true,
		},
		{
			// Pelando — comunidade de ofertas com seção de supermercados
			ID:      "pelando",
			Name:    "Pelando — Ofertas de Mercado",
			LogoURL: "https://ui-avatars.com/api/?name=Pelando&background=c62828&color=fff&bold=true&size=128",
			Type:    "agregador",
			Website: "https://www.pelando.com.br/category/supermercado",
			IsOnline: true,
		},
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
