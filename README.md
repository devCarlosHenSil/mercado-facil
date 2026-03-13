# 🛒 MercadoFácil

> Agregador de ofertas de supermercados, atacados e hipermercados com geolocalização em tempo real.

[![CI/CD](https://github.com/devCarlosHenSil/mercadofacil/actions/workflows/ci.yml/badge.svg)](https://github.com/devCarlosHenSil/mercadofacil/actions)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Funcionalidades

- 📍 **Geolocalização automática** — detecta sua cidade via browser e Nominatim (OpenStreetMap)
- 🗺️ **Raio configurável** — filtre lojas por 3, 5, 10, 20 ou 50 km
- 🔍 **Busca inteligente** — pesquisa por produto com debounce
- 🏷️ **Filtro por categoria** — mercearia, hortifruti, açougue, bebidas, limpeza...
- 📊 **Ordenação** — por relevância, menor preço, maior desconto ou proximidade
- ♾️ **Scroll infinito** — carregamento progressivo via IntersectionObserver
- ⚡ **Cache inteligente** — TTL de 15 min no backend Go
- 📱 **100% responsivo** — mobile-first, funciona em qualquer dispositivo
- 🌐 **Lojas online + físicas** — Shopee, iFood, Mercado Livre, Assaí, Atacadão...

---

## 🏗️ Arquitetura

```
mercadofacil/
├── backend/                    # Go 1.22
│   ├── cmd/server/main.go      # Entry point HTTP server
│   ├── internal/
│   │   ├── api/handler.go      # REST handlers + CORS
│   │   ├── geo/geo.go          # Haversine, BoundingBox
│   │   ├── scraper/aggregator.go # Motor de busca e agregação
│   │   ├── cache/cache.go      # In-memory TTL cache thread-safe
│   │   └── models/models.go    # Structs compartilhadas
│   ├── Dockerfile              # Multi-stage build
│   └── go.mod
│
├── frontend/                   # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── components/         # Header, OfferCard, SearchBar...
│   │   ├── hooks/              # useGeolocation, useSearch
│   │   ├── pages/              # HomePage
│   │   ├── services/api.js     # Axios layer
│   │   └── store/useStore.js   # Zustand global state
│   ├── vercel.json
│   └── vite.config.js
│
├── .github/workflows/ci.yml    # GitHub Actions (free)
├── docker-compose.yml
└── railway.toml
```

### Stack de tecnologia — $0/mês

| Camada    | Tecnologia                | Hospedagem gratuita |
|-----------|---------------------------|---------------------|
| Backend   | Go 1.22                   | Railway.app (free tier) |
| Frontend  | React 18 + Vite           | Vercel (free tier) |
| Geo       | Nominatim / OpenStreetMap | Gratuito, sem API key |
| CI/CD     | GitHub Actions            | 2.000 min/mês grátis |
| Cache     | In-memory Go              | Incluído no backend |

---

## 🚀 Rodando localmente

### Pré-requisitos
- Go 1.22+
- Node.js 20+
- (Opcional) Docker

### Backend
```bash
cd backend
go mod download
go run ./cmd/server
# → http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Com Docker Compose
```bash
docker-compose up
# Backend: :8080  |  Frontend: :5173
```

---

## 📡 API

### `GET /api/search`
```
Parâmetros:
  q          string   Termo de busca
  lat        float    Latitude do usuário (obrigatório)
  lng        float    Longitude do usuário (obrigatório)
  radius     float    Raio em km (padrão: 10)
  category   string   Categoria (mercearia, hortifruti...)
  sort       string   relevance | price | discount | distance
  page       int      Página (padrão: 1)
  page_size  int      Itens por página (padrão: 20)

Resposta: SearchResponse { offers, total, page, has_more, query_time_ms }
```

### `GET /api/nearby-stores`
```
Parâmetros: lat, lng, radius
Resposta: []NearbyStore { store, distance_km, offers_count }
```

### `GET /api/categories`
```
Resposta: []Category { id, name, icon, color }
```

### `GET /api/health`
```
Resposta: { status: "ok", time: "..." }
```

---

## 🌐 Deploy gratuito

### 1. Backend → Railway
```bash
# Instale Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

### 2. Frontend → Vercel
```bash
cd frontend
npm install -g vercel
vercel --prod
```

### 3. Configure variáveis
- No Vercel: `VITE_API_URL=https://SEU_PROJETO.up.railway.app`
- No `vercel.json`: atualize a URL do proxy

---

## 🔌 Adicionando scrapers reais

O arquivo `backend/internal/scraper/aggregator.go` é o coração do sistema.
Para integrar fontes reais, substitua `generateOffers()` por scrapers HTTP:

```go
// Exemplo: scraper do Promobit (RSS público)
func scrapPromobit(query string) []models.Offer {
    resp, _ := http.Get("https://www.promobit.com.br/feed/?s=" + url.QueryEscape(query))
    // parse RSS/JSON...
}
```

## 🗺️ Cobertura de Itu / SP

O `storesItu()` no aggregator traz **cobertura completa e verificada** da cidade:

### Atacados físicos
| Loja | Endereço | Coordenadas |
|------|----------|-------------|
| **Atacadão Itu** | Av. Dr. Ermelindo Maffei, 945 | -23.2710, -47.2830 |
| **Roldão Atacadista** | Av. Caetano Ruggieri, 3518 | -23.2780, -47.2870 |
| **Atacadão do Frios** | Rua Santana, 382 — Centro | -23.2644, -47.2994 |

### Hipermercados
| Loja | Endereço | Coordenadas |
|------|----------|-------------|
| **Pão de Açúcar Hipermercado** | Rod. Marechal Rondon, Km 105 | -23.2666, -47.2800 |

### Supermercados
| Loja | Endereço | Coordenadas |
|------|----------|-------------|
| **Pão de Açúcar Vila Nova** | Av. Prudente de Moraes, 210 | -23.2620, -47.2960 |
| **Pão de Açúcar Itu Centro** | Av. Dr. Otaviano P. Mendes, 423 | -23.2650, -47.2990 |
| **Delta Supermercados** | Av. Francisco E. Favero, 534 | -23.2750, -47.3010 |
| **São Vicente (unid. 1)** | Av. Eugen Wissmann, 600 | -23.2685, -47.3055 |
| **São Vicente (unid. 2)** | Av. Eugen Wissmann, 2021 | -23.2660, -47.3080 |
| **Supermercado Paulistão** | R. Argemiro D'Elboux, 210 | -23.2700, -47.2950 |
| **Supermercados Caetano** | R. Vinte de Janeiro, 348 | -23.2630, -47.2970 |

### Agregadores de encartes de Itu
| Fonte | URL |
|-------|-----|
| Tiendeo Itu | https://www.tiendeo.com.br/itu/supermercados |
| Shopfully/Publitas Itu | https://www.shopfully.com.br/itu/promocoes |

> **Para adicionar uma nova loja:** siga as instruções no cabeçalho de `storesItu()` no arquivo `aggregator.go`.


**Fontes sugeridas (gratuitas):**
- Promobit RSS Feed
- Pelando RSS Feed
- APIs públicas dos varejistas (Carrefour, Extra, Pão de Açúcar)
- Google Shopping via SerpAPI free tier
- Mercado Livre API (gratuita)

---

## 📜 Licença

MIT © 2024 — Contribuições são bem-vindas!
