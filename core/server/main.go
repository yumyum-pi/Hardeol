package server

import (
	"fmt"
	"net/http"
	"yumyum-pi/Hardeol/core/router"
)

type Server struct {
	addr   string
	router *router.DynamicRouter
}

func New(addr string, routes *router.DynamicRouter) *Server {
	return &Server{
		addr:   addr,
		router: routes,
	}
}

func (s *Server) Serve() error {
	s.router.Handle(router.MethodGET, "/hardeol", hardeolHandler)
	return http.ListenAndServe(s.addr, s.router)
}

func hardeolHandler(ctx *router.Ctx) {
	_, err := ctx.Response.Write([]byte("Welcome to the hardeol!"))
	if err != nil {
		// TODO: do something
		fmt.Println("hello")
	}
}
