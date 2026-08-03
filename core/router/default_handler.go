package router

import (
	"fmt"
	"net/http"
	"yumyum-pi/Hardeol/core/logger"
)

func defaultPathNotFoundHandler(ctx *Ctx) {
	url := ctx.Request.URL.Path
	ctx.Response.WriteHeader(http.StatusNotFound)
	fmt.Fprintf(ctx.Response, "path not found:%s\n", url)
	logger.Error.Printf("path not found:%s", url)
}

func defaultHandlerNotFoundHandler(ctx *Ctx) {
	url := ctx.Request.URL.Path
	ctx.Response.WriteHeader(http.StatusInternalServerError)
	logger.Error.Printf("handler not found:%s", url)
	fmt.Fprintf(ctx.Response, "handler not found:%s\n", url)
}

func defaultNotRootHandler(ctx *Ctx) {
	url := ctx.Request.URL.Path
	ctx.Response.WriteHeader(http.StatusInternalServerError)
	logger.Error.Printf("non root nodes are not allowed to assess get func: %s\n", url)
	fmt.Fprintf(ctx.Response, "internal server error, path:%s\n", url)
}

func defaultMethodNotAllowed(ctx *Ctx) {
	url := ctx.Request.URL.Path
	method := ctx.Request.Method
	ctx.Response.WriteHeader(http.StatusMethodNotAllowed)
	logger.Error.Printf("method not allowed: %s %s", method, url)
	fmt.Fprintf(ctx.Response, "method not allowed: %s %s\n", method, url)
}
