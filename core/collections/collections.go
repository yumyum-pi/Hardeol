package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/logger"
	"yumyum-pi/Hardeol/core/routes"
)

var c []Collection

func Init(r *routes.DynamicRouter) {
	// make the db call
	database.Migrate(&SchemaField{})
	database.Migrate(&Collection{})

	db := database.Get()
	c = make([]Collection, 0)
	res := db.Preload("Fields").Find(&c)
	if res.Error != nil {
		logger.Error.Println(res.Error.Error())
	}
	r.Handle("/collection/", handlerFunc)

	// loop over all the collections
	// create the tables if it does not exist
	for i := range c {
		cc := c[i]
		err := cc.DBInit(db)
		if err != nil {
			logger.Error.Println(err)
		}
		// CRUD for Collection
		h := CRUDRouter(&cc)
		r.Handle(
			fmt.Sprintf("/%s/", cc.Name),
			h,
		)
	}
}

// TODO: Add an auth middleware only the admin should be able to view
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

func CRUDRouter(c *Collection) http.HandlerFunc {
	t := c.CreateType()

	// handle list to collection
	// TODO: add the following
	// - Add filter
	// - Add pagenation
	handleList := func(w http.ResponseWriter, r *http.Request) {
		// create slice at runtime
		sliceType := reflect.SliceOf(t)
		sliceValue := reflect.MakeSlice(sliceType, 0, 0)
		valSlice := sliceValue.Interface()

		db := database.Get()
		res := db.Table(c.Name).Find(&valSlice)
		if res.Error != nil {
			// TODO: proper error check
			ResponseError(w, http.StatusInternalServerError, res.Error.Error())
			return
		}

		ResponseOk(w, http.StatusOK, valSlice)
	}

	// handle create to collection
	// TODO: add the following
	// - validation
	handleCreate := func(w http.ResponseWriter, r *http.Request) {
		v := reflect.New(t).Interface()
		err := json.NewDecoder(r.Body).Decode(v)
		if err != nil {
			// TODO: proper error check
			ResponseError(w, http.StatusBadRequest, fmt.Sprintf("Invalid JSON Input:%s", err.Error()))
			return
		}

		db := database.Get()
		res := db.Table(c.Name).Create(v)

		if res.Error != nil {
			// TODO: proper error check
			ResponseError(w, http.StatusInternalServerError, res.Error.Error())
			return
		}

		ResponseOk(w, http.StatusOK, v)
	}

	// handle delete to collection
	handleDelete := func(w http.ResponseWriter, r *http.Request) {
		// get ID from URL

		id := r.URL.Query().Get("id")
		if id == "" {
			ResponseError(w, http.StatusBadRequest, "id not found")
			return
		}

		/*
			db := database.Get()
			res := db.Table(c.Name).Where("id = ?", id).Delete(nil)
			if res.Error != nil {
				// TODO: proper error check
				ResponseError(w, http.StatusInternalServerError, res.Error.Error())
				return
			}

			if res.RowsAffected == 0 {
				// TODO: proper error check
				ResponseError(w, http.StatusBadRequest, "Record not found")
				return
			}
		*/

		ResponseOk(w, http.StatusOK, id)
	}

	// switch between different method
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleList(w, r)
		case http.MethodPost:
			handleCreate(w, r)
		case http.MethodDelete:
			handleDelete(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}
