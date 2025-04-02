package main

import (
	"log"
	"yumyum-pi/Hardeol/core/collections"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/routes"
	"yumyum-pi/Hardeol/core/server"
)

func main() {
	database.InitSqlite()

	// Create new dynamic router
	r := routes.Init()

	// Create New Collections
	// Get Collection data from the database
	collections.Init(r)

	// Create a new server instance.
	srv := server.New(":8080", r)

	// Start serving. ListenAndServe will block.
	log.Println("Starting server on :8080")
	if err := srv.Serve(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
