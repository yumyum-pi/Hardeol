package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/logger"
	"yumyum-pi/Hardeol/core/router"

	"gorm.io/gorm"
)

var c []Collection

const CollectionString = "collection"

func Init(r *router.DynamicRouter) {
	// make the db call
	database.Migrate(&SchemaField{})
	database.Migrate(&Collection{})

	db := database.Get()
	c = make([]Collection, 0)
	res := db.Preload("Fields").Find(&c)
	if res.Error != nil {
		logger.Error.Println(res.Error.Error())
	}

	handlers := collectionsHandlerFunc()

	for _, h := range handlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}
	CollectionNameInit()

	// loop over all the collections
	// create the tables if it does not exist
	for i := range c {
		cc := c[i]
		// CRUD for Collection
		newCollection(cc, db, r)
	}
}

func newCollection(cc Collection, db *gorm.DB, r *router.DynamicRouter) {
	if CollectionNameExists(cc.Name) {
		logger.Error.Println("duplicate name: ", cc.Name)
		return
	}

	CollectionNameAdd(cc.Name)
	err := cc.DBInit(db)
	if err != nil {
		logger.Error.Println(err)
	}

	handlers := CRUDRouter(&cc)
	// TODO: why does this stops the processing when not making a gorotine
	for _, h := range handlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}
}

type crudRouterReturnType struct {
	method  int
	path    string
	handler router.Handle
}

func CRUDRouter(c *Collection) []crudRouterReturnType {
	t := c.CreateType()

	// handle list to collection
	// TODO: add the following
	// - Add filter
	// - Add pagenation
	handleList := func(ctx *router.Ctx) {
		// create slice at runtime
		sliceType := reflect.SliceOf(t)
		sliceValue := reflect.MakeSlice(sliceType, 0, 0)
		valSlice := sliceValue.Interface()

		db := database.Get()
		res := db.Table(c.Name).Find(&valSlice)
		if res.Error != nil {
			// TODO: proper error check
			ResponseError(ctx.Response, http.StatusInternalServerError, res.Error.Error())
			return
		}
		ResponseOk(ctx.Response, http.StatusOK, valSlice)
	}

	// handle create to collection
	// TODO: add the following
	// - validation
	handleCreate := func(ctx *router.Ctx) {
		r := ctx.Request
		w := ctx.Response
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
	handleDelete := func(ctx *router.Ctx) {
		w := ctx.Response
		// get ID from URL

		id := ctx.GetParam("id")
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
		router.MethodGET,
		fmt.Sprintf("/%s/%s", CollectionString, c.Name),
		handleList,
	})

	asdf = append(asdf, crudRouterReturnType{
		router.MethodPOST,
		fmt.Sprintf("/%s/%s", CollectionString, c.Name),
		handleCreate,
	})
	asdf = append(asdf, crudRouterReturnType{
		router.MethodDELETE,
		fmt.Sprintf("/%s/%s/:id", CollectionString, c.Name),
		handleDelete,
	})

	return asdf
}
