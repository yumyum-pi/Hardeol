package router

import (
	"fmt"
	"net/http"
	"yumyum-pi/Hardeol/core/logger"
)

func defaultPathNotFoundHandler(w http.ResponseWriter, r *http.Request, p []Params) {
	url := r.URL.Path
	w.WriteHeader(http.StatusBadRequest)
	fmt.Fprintf(w, "path not found:%s\n", url)
	logger.Error.Printf("handler not found:%s", url)
}

func defaultHandlerNotFoundHandler(w http.ResponseWriter, r *http.Request, p []Params) {
	url := r.URL.Path
	w.WriteHeader(http.StatusInternalServerError)
	logger.Error.Printf("handler not found:%s", url)
	fmt.Fprintf(w, "handler not found:%s\n", url)
}

func defaultNotRootHandler(w http.ResponseWriter, r *http.Request, p []Params) {
	url := r.URL.Path
	w.WriteHeader(http.StatusInternalServerError)
	logger.Error.Printf("non root nodes are not allowed to assess get func: %s\n", url)
	fmt.Fprintf(w, "internal server error, path:%s\n", url)
}

func defaultMethodNotAllowed(w http.ResponseWriter, r *http.Request, p []Params) {
	url := r.URL.Path
	w.WriteHeader(http.StatusBadRequest)
	logger.Error.Println("Method not allowed")
	fmt.Fprintf(w, "internal server error, path:%s\n", url)
}
