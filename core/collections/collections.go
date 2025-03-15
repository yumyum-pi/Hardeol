package collections

type Collections []Collection

var c Collections

func Init() {
	c = make(Collections, 0)
}

func GetCollections() *Collections {
	return &c
}

func AddCollection(newCollection *Collection) {
	c = append(c, *newCollection)
}
