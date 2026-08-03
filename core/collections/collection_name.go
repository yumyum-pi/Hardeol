package collections

import (
	"regexp"
	"sync"
)

var (
	collectionNames map[string]bool
	mu              sync.RWMutex
	// valid collection name: alphanumeric and underscore, must start with letter
	validNameRegex = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]*$`)
)

func CollectionNameExists(name string) bool {
	mu.RLock()
	defer mu.RUnlock()
	_, found := collectionNames[name]
	return found
}

func CollectionNameAdd(name string) {
	mu.Lock()
	defer mu.Unlock()
	if collectionNames == nil {
		collectionNames = make(map[string]bool)
	}
	collectionNames[name] = true
}

// CollectionNameAddIfNotExists atomically checks if name exists and adds it if not.
// Returns true if the name was added, false if it already existed.
// This prevents TOCTOU race conditions.
func CollectionNameAddIfNotExists(name string) bool {
	mu.Lock()
	defer mu.Unlock()
	if collectionNames == nil {
		collectionNames = make(map[string]bool)
	}
	if collectionNames[name] {
		return false // already exists
	}
	collectionNames[name] = true
	return true // successfully added
}

func CollectionNameDelete(name string) {
	mu.Lock()
	defer mu.Unlock()
	if collectionNames != nil {
		delete(collectionNames, name)
	}
}

func CollectionNameInit() {
	mu.Lock()
	defer mu.Unlock()
	if collectionNames == nil {
		collectionNames = make(map[string]bool)
	}
}

// IsValidCollectionName checks if the name is valid for use as a collection/table name
func IsValidCollectionName(name string) bool {
	if name == "" || len(name) > 64 {
		return false
	}
	return validNameRegex.MatchString(name)
}
