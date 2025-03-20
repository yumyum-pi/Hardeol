package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/logger"
)

var c []Collection

func Init() http.HandlerFunc {
	// make the db call
	database.Migrate(&SchemaField{})
	database.Migrate(&Collection{})

	db := database.Get()
	c = make([]Collection, 0)
	res := db.Find(&c)
	if res.Error != nil {
		logger.Error.Println(res.Error.Error())
	}

	fmt.Println(c)
	// return the handler
	// CRUD for Collection
	return handlerFunc
}

func handlerFunc(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		handleList(w, r)
	case http.MethodPost:
		handleCreate(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	list := make([]Collection, 0)

	db := database.Get()
	res := db.Preload("Fields").Find(&list)
	if res.Error != nil {
		fmt.Println("erorr", res.Error.Error())
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	err := json.NewEncoder(w).Encode(list)
	if err != nil {
		logger.Error.Print(err.Error())
		fmt.Println("err:", err.Error())
	}
}

func handleCreate(w http.ResponseWriter, r *http.Request) {
	col := new(Collection)

	if err := json.NewDecoder(r.Body).Decode(col); err != nil {
		http.Error(w, "Invalid JSON input", http.StatusBadRequest)
		return
	}

	// run validation

	db := database.Get()
	res := db.Create(col)

	if res.Error != nil {
		fmt.Println(res.Error.Error())
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	err := json.NewEncoder(w).Encode(col)
	if err != nil {
		logger.Error.Println(err.Error())
	}
}
