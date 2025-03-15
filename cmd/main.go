package main

import (
	"log"
	"yumyum-pi/Hardeol/core/routes"
	"yumyum-pi/Hardeol/core/server"
)

func main() {
	// Create a new server instance.
	r := routes.New()
	srv := server.New(":8080", r)

	// Start serving. ListenAndServe will block.
	log.Println("Starting server on :8080")
	if err := srv.Serve(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
