package routes_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"yumyum-pi/Hardeol/core/routes"
)

func TestDynamicRouter_HandleAndServeHTTP(t *testing.T) {
	// Create a new router instance
	router := routes.Init()

	// Register routes
	router.Handle("/", func(w http.ResponseWriter, r *http.Request) {
		if _, err := w.Write([]byte("Welcome to the homepage!")); err != nil {
			t.Fatalf("Unable to write the response: %s", err.Error())
		}
	})
	router.Handle("/about", func(w http.ResponseWriter, r *http.Request) {
		if _, err := w.Write([]byte("About page")); err != nil {
			t.Fatalf("Unable to write the response: %s", err.Error())
		}
	})

	// Test for the root route
	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	res := rec.Result()
	if res.StatusCode != http.StatusOK {
		t.Errorf("expected status code %d but got %d", http.StatusOK, res.StatusCode)
	}

	body := rec.Body.String()
	if body != "Welcome to the homepage!" {
		t.Errorf("expected body %q but got %q", "Welcome to the homepage!", body)
	}

	// Test for the /about route
	req = httptest.NewRequest("GET", "/about", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	res = rec.Result()
	if res.StatusCode != http.StatusOK {
		t.Errorf("expected status code %d but got %d", http.StatusOK, res.StatusCode)
	}

	body = rec.Body.String()
	if body != "About page" {
		t.Errorf("expected body %q but got %q", "About page", body)
	}

	// Test for a non-existent route
	req = httptest.NewRequest("GET", "/non-existent", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	res = rec.Result()
	if res.StatusCode != http.StatusNotFound {
		t.Errorf("expected status code %d but got %d", http.StatusNotFound, res.StatusCode)
	}
}
