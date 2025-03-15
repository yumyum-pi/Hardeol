package routes

import (
	"net/http"
	"sync"
	"yumyum-pi/Hardeol/core/logger"
)

type DynamicRouter struct {
	routes map[string]http.HandlerFunc
	mu     sync.RWMutex
}

func New() *DynamicRouter {
	return &DynamicRouter{
		routes: make(map[string]http.HandlerFunc),
	}
}

// Handle registers a new route with its corresponding handler.
func (r *DynamicRouter) Handle(pattern string, handler http.HandlerFunc) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.routes[pattern] = logger.Middleware(handler)
}

func (r *DynamicRouter) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if handler, ok := r.routes[req.URL.Path]; ok {
		handler(w, req)
		return
	}

	n := logger.Middleware(http.NotFound)
	n(w, req)
}
