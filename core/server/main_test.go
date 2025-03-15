package server_test

import (
	"io"
	"net/http"
	"testing"
	"time"
	"yumyum-pi/Hardeol/core/routes"
	"yumyum-pi/Hardeol/core/server"
)

func TestServer_AddRouteWhileServing(t *testing.T) {
	// Create a new Server instance.
	r := routes.NewDynamicRouter()
	s := server.New(":8080", r)

	// Start the server in a separate goroutine.
	// Note: the Serve method registers a default route ("/hardeol")
	go s.Serve()

	// Allow time for the server to start.
	time.Sleep(100 * time.Millisecond)

	// Dynamically add a new route "/test" to the running server.
	r.Handle("/test", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Test route response"))
	})

	// Allow time for the route registration.
	time.Sleep(50 * time.Millisecond)

	// Test the newly added route.
	resp, err := http.Get("http://localhost:8080/test")
	if err != nil {
		t.Fatalf("failed to get /test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed reading response body: %v", err)
	}
	expected := "Test route response"
	if string(body) != expected {
		t.Fatalf("expected response %q, got %q", expected, string(body))
	}
}
