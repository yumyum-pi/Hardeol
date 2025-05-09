package router

import (
	"net/http"
)

// TODO: understand what is the impact of not using sync Pool for params
type DynamicRouter struct {
	tree                   []*node
	pathNotFoundHandler    Handle
	handlerNotFoundHandler Handle
	notRootHandler         Handle
	methodNotAllowed       Handle
}

func (d *DynamicRouter) Handle(method int, path string, handler Handle) error {
	// check for valid method
	if method < 0 || method >= lenHTTPMehod {
		return ErrInvalidMethodInit
	}

	root := d.tree[method]

	err := root.Add(path, handler)
	return err
}

func (d *DynamicRouter) GET(path string, h Handle) error {
	return d.Handle(MethodGET, path, h)
}

// add POST
func (d *DynamicRouter) POST(path string, h Handle) error {
	return d.Handle(MethodPOST, path, h)
}

// add PUT
func (d *DynamicRouter) PUT(path string, h Handle) error {
	return d.Handle(MethodPUT, path, h)
}

// add DELETE
func (d *DynamicRouter) DELETE(path string, h Handle) error {
	return d.Handle(MethodDELETE, path, h)
}

func (d *DynamicRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Path

	m := HTTPMethodToIndex(r.Method)

	ctx := CreateCtx(w, r, nil)
	if m < 0 {
		d.methodNotAllowed(ctx)
		return
	}

	root := d.tree[m]

	h, p, err := root.Get(url)
	if err != nil {
		switch err {
		case ErrNotRoot:
			d.notRootHandler(ctx)
		case ErrPathNotFound:
			d.pathNotFoundHandler(ctx)
		case ErrHandlerNotFound:
			d.handlerNotFoundHandler(ctx)
		}
		return
	}
	ctx.params = p
	h(ctx)
}

func (d *DynamicRouter) Remove(method int, path string) error {
	// check for valid method
	if method < 0 || method >= lenHTTPMehod {
		return ErrInvalidMethodInit
	}
	root := d.tree[method]
	return root.remove(path)
}

var d DynamicRouter

func Get() *DynamicRouter {
	return &d
}

func Init() {
	// create root nodes for different http methods
	tree := make([]*node, len(HTTPMethod))
	for i := range HTTPMethod {
		tree[i] = CreateRootNode()
	}

	d = DynamicRouter{
		tree:                   tree,
		pathNotFoundHandler:    defaultPathNotFoundHandler,
		handlerNotFoundHandler: defaultHandlerNotFoundHandler,
		notRootHandler:         defaultNotRootHandler,
		methodNotAllowed:       defaultMethodNotAllowed,
	}
}

func (r *DynamicRouter) HandleGroup(grp *RouteGroup) error {
	for _, rt := range grp.routes {
		if err := r.Handle(rt.method, rt.path, rt.handle); err != nil {
			return err
		}
	}
	return nil
}
