package logger

import (
	"net/http"
	"time"
)

// loggingResponseWriter wraps http.ResponseWriter to capture the status code.
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

// newLoggingResponseWriter initializes a new loggingResponseWriter.
func newLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	// Default status is 200 OK unless WriteHeader is called.
	return &loggingResponseWriter{w, http.StatusOK}
}

// WriteHeader captures the status code and calls the underlying WriteHeader.
func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func Middleware(h http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Wrap the ResponseWriter to capture the status code.
		lrw := newLoggingResponseWriter(w)
		start := time.Now()
		h.ServeHTTP(lrw, r)
		l := time.Since(start)
		// Retrieve client IP. Note: r.RemoteAddr includes the port.
		ip := r.RemoteAddr

		// Log the details.
		Info.Printf("%d %v %s %s %s", lrw.statusCode, l, ip, r.Method, r.URL.Path)
	})
}
