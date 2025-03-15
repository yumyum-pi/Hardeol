package server

import (
	"fmt"
	"net/http"
	"yumyum-pi/Hardeol/core/routes"
)

type Server struct {
	addr   string
	routes *routes.DynamicRouter
}

func New(addr string, routes *routes.DynamicRouter) *Server {
	return &Server{
		addr:   addr,
		routes: routes,
	}
}

func (s *Server) Serve() error {
	s.routes.Handle("/hardeol", hardeolHandler)
	return http.ListenAndServe(s.addr, s.routes)
}

func hardeolHandler(w http.ResponseWriter, r *http.Request) {
	_, err := w.Write([]byte("Welcome to the hardeol!"))
	if err != nil {
		// TODO: do something
		fmt.Println("hello")
	}
}
