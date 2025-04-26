package router

import (
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"testing"
	"time"
)

// add path and method to the router
func TestDynamicRouterConcurrency(t *testing.T) {
	Init()
	router := Get()
	var wg sync.WaitGroup
	n := 500

	// Writer goroutines
	for i := range n {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			p := fmt.Sprintf("/r/%d", i)
			router.GET(p, dummyHandler(p))
			time.Sleep(time.Microsecond)
			router.Remove(0, p)
		}(i)
	}

	// Reader goroutines
	for range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// random path lookup
			p := fmt.Sprintf("/r/%d", rand.Intn(n))
			_, _, _ = router.tree[0].Get(p)
		}()
	}

	wg.Wait()
}

func dummyHandler(u string) Handle {
	return func(w http.ResponseWriter, r *http.Request, p []Params) {
		w.Write([]byte("ok:" + u))
	}
}
