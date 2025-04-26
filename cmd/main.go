package main

import (
	"fmt"
	"log"
	"yumyum-pi/Hardeol/core/collections"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/router"
	"yumyum-pi/Hardeol/core/server"
)

func main() {
	fmt.Println("this ")
	log.Println("database init done")
	database.InitSqlite()
	log.Println("database init done")

	fmt.Println("& this ")
	log.Println("database init done")
	// Create new dynamic router
	router.Init()
	log.Println("router init done")
	r := router.Get()

	// Create New Collections
	// Get Collection data from the database
	log.Println("collection init done")
	collections.Init(r)

	// Create a new server instance.
	srv := server.New(":8080", r)

	// Start serving. ListenAndServe will block.
	log.Println("Starting server on :8080")
	if err := srv.Serve(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
