package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"mercadofacil/internal/api"
	"mercadofacil/internal/cache"
	"mercadofacil/internal/scraper"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Inicializa dependências
	agg := scraper.NewAggregator()
	c := cache.New(15 * time.Minute)
	h := api.NewHandler(agg, c)

	mux := http.NewServeMux()
	h.ServeHTTP(mux)

	// Serve frontend estático
	mux.Handle("/", http.FileServer(http.Dir("./frontend/dist")))

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 95 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("🚀 MercadoFácil rodando em http://localhost:%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
