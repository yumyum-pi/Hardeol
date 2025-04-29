package router

import (
	"fmt"
	"net/http"
	"yumyum-pi/Hardeol/core/logger"
)

func defaultPathNotFoundHandler(ctx *Ctx) {
	url := ctx.Request.URL.Path
	ctx.Response.WriteHeader(http.StatusBadRequest)
	fmt.Fprintf(ctx.Response, "path not found:%s\n", url)
	logger.Error.Printf("handler not found:%s", url)
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
	ctx.Response.WriteHeader(http.StatusBadRequest)
	logger.Error.Println("Method not allowed")
	fmt.Fprintf(ctx.Response, "internal server error, path:%s\n", url)
}
