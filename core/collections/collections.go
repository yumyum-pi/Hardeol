package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/logger"
	"yumyum-pi/Hardeol/core/routes"

	"gorm.io/gorm"
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
	r.Handle("/collection/", collectionsHandlerFunc)
	CollectionNameInit()

	// loop over all the collections
	// create the tables if it does not exist
	for i := range c {
		cc := c[i]
		// CRUD for Collection
		newCollection(cc, db, r)
	}
}

func newCollection(cc Collection, db *gorm.DB, r *routes.DynamicRouter) {
	if CollectionNameExists(cc.Name) {
		logger.Error.Println("duplicate name: ", cc.Name)
		return
	}

	CollectionNameAdd(cc.Name)
	err := cc.DBInit(db)
	if err != nil {
		logger.Error.Println(err)
	}

	h := CRUDRouter(&cc)
	// TODO: why does this stops the processing when not making a gorotine
	for i := range h {
		go r.Handle(
			fmt.Sprintf("%s /%s/%s", h[i].method, cc.Name, h[i].path),
			h[i].handler,
		)
	}
}

type crudRouterReturnType struct {
	method  string
	path    string
	handler http.HandlerFunc
}

func CRUDRouter(c *Collection) []crudRouterReturnType {
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

		ResponseOk(w, http.StatusOK, id)
	}

	asdf := make([]crudRouterReturnType, 0)

	asdf = append(asdf, crudRouterReturnType{
		http.MethodGet,
		"",
		handleList,
	})

	asdf = append(asdf, crudRouterReturnType{
		http.MethodPost,
		"",
		handleCreate,
	})
	asdf = append(asdf, crudRouterReturnType{
		http.MethodDelete,
		"{id}",
		handleDelete,
	})

	return asdf
}
