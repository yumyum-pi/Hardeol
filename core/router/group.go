package router

import paths "path"

type routeHandle struct {
	method int
	path   string
	handle Handle
}

type RouteGroup struct {
	routes []routeHandle
	prefix string
}

func NewGroup(prefix string) *RouteGroup {
	return &RouteGroup{
		prefix: prefix,
	}
}

func (grp *RouteGroup) Handle(method int, path string, handle Handle) {
	grp.routes = append(grp.routes, routeHandle{method, paths.Join(grp.prefix, path), handle})
}

func (grp *RouteGroup) GET(p string, h Handle)    { grp.Handle(MethodGET, p, h) }
func (grp *RouteGroup) POST(p string, h Handle)   { grp.Handle(MethodPOST, p, h) }
func (grp *RouteGroup) PUT(p string, h Handle)    { grp.Handle(MethodPUT, p, h) }
func (grp *RouteGroup) DELETE(p string, h Handle) { grp.Handle(MethodDELETE, p, h) }
