package collections

import "fmt"

var collectionNames map[string]bool

func CollectionNameExists(name string) bool {
	_, found := collectionNames[name]
	return found
}

func CollectionNameAdd(name string) {
	collectionNames[name] = true
}

func CollectionNameDelete(name string) {
	delete(collectionNames, name)
}

func CollectionNameInit() {
	if collectionNames == nil {
		collectionNames = make(map[string]bool)
	} else {
		fmt.Println("why are you calling this")
	}
}
