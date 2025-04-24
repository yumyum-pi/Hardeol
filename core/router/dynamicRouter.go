package router

import "net/http"

type DynamicRouter struct{}

func (d *DynamicRouter) Handle(path string, handler http.HandlerFunc) {
}

func (d *DynamicRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
}

func (d *DynamicRouter) Remove(w http.ResponseWriter, r *http.Request) {
}

var d DynamicRouter

func Get() *DynamicRouter {
	return &d
}

func Init() {
	d = DynamicRouter{}
}
