package main

import (
	"fmt"
	"log"
	"net/http"
	"yumyum-pi/Hardeol/core/routes"
	"yumyum-pi/Hardeol/core/server"
)

func main() {
	// Create a new server instance.
	r := routes.New()
	srv := server.New(":8080", r)

	r.Handle("/addRoute", func(w http.ResponseWriter, req *http.Request) {
		fmt.Println("addRoute called")
		go r.Handle("/rounte2", func(w2 http.ResponseWriter, req2 *http.Request) {
			w2.Write([]byte("route2"))
		})

		fmt.Println("addRoute write")
		w.Write([]byte("Addeed route2"))
	})
	// Start serving. ListenAndServe will block.
	log.Println("Starting server on :8080")
	if err := srv.Serve(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
