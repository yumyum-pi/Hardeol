package main

import (
	"log"
	"yumyum-pi/Hardeol/core/routes"
	"yumyum-pi/Hardeol/core/server"
)

func main() {
	// Create new dynamic router
	r := routes.NewDynamicRouter()
	// Create a new server instance.
	srv := server.New(":8080", r)

	// Start serving. ListenAndServe will block.
	log.Println("Starting server on :8080")
	if err := srv.Serve(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
