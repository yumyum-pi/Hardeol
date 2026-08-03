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
	if !CollectionNameAddIfNotExists(cc.Name) {
		logger.Error.Println("duplicate name: ", cc.Name)
		return
	}

	err := cc.DBInit(db)
	if err != nil {
		logger.Error.Println(err)
		CollectionNameDelete(cc.Name)
		return
	}

	handlers := CRUDRouter(&cc)
	for _, h := range handlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}
}

// newCollectionRoutes creates routes for a collection (used after DB insert)
func newCollectionRoutes(cc Collection, db *gorm.DB, r *router.DynamicRouter) error {
	err := cc.DBInit(db)
	if err != nil {
		return err
	}

	handlers := CRUDRouter(&cc)
	for _, h := range handlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}
	return nil
}

// UpdateCollectionRoutes removes old routes and registers new ones with updated schema
func UpdateCollectionRoutes(cc Collection, db *gorm.DB, r *router.DynamicRouter) error {
	basePath := fmt.Sprintf("/%s/%s", CollectionString, cc.Name)

	// Remove old routes
	r.Remove(router.MethodGET, basePath)
	r.Remove(router.MethodPOST, basePath)
	r.Remove(router.MethodPUT, basePath+"/:id")
	r.Remove(router.MethodDELETE, basePath+"/:id")

	// Re-register with updated schema
	handlers := CRUDRouter(&cc)
	for _, h := range handlers {
		if err := r.Handle(h.method, h.path, h.handler); err != nil {
			return err
		}
	}
	return nil
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
			ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
			return
		}
		ctx.ResponseOk(http.StatusOK, valSlice)
	}

	// handle create to collection
	// TODO: add the following
	// - validation
	handleCreate := func(ctx *router.Ctx) {
		r := ctx.Request
		v := reflect.New(t).Interface()
		err := json.NewDecoder(r.Body).Decode(v)
		if err != nil {
			// TODO: proper error check
			ctx.ResponseError(http.StatusBadRequest, fmt.Sprintf("Invalid JSON Input:%s", err.Error()))
			return
		}

		db := database.Get()
		res := db.Table(c.Name).Create(v)

		if res.Error != nil {
			// TODO: proper error check
			ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
			return
		}

		ctx.ResponseOk(http.StatusCreated, v)
	}

	// handle update to collection
	handleUpdate := func(ctx *router.Ctx) {
		id := ctx.GetParam("id")
		if id == "" {
			ctx.ResponseError(http.StatusBadRequest, "id not found")
			return
		}

		// Decode request body into a map for flexible field updates
		var updates map[string]interface{}
		if err := json.NewDecoder(ctx.Request.Body).Decode(&updates); err != nil {
			ctx.ResponseError(http.StatusBadRequest, fmt.Sprintf("Invalid JSON Input: %s", err.Error()))
			return
		}

		// Remove id from updates to prevent changing it
		delete(updates, "id")

		if len(updates) == 0 {
			ctx.ResponseError(http.StatusBadRequest, "No fields to update")
			return
		}

		db := database.Get()
		res := db.Table(c.Name).Where("id = ?", id).Updates(updates)
		if res.Error != nil {
			ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
			return
		}

		if res.RowsAffected == 0 {
			ctx.ResponseError(http.StatusNotFound, "Record not found")
			return
		}

		// Fetch and return updated record
		v := reflect.New(t).Interface()
		if err := db.Table(c.Name).Where("id = ?", id).First(v).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusOK, v)
	}

	// handle delete to collection
	handleDelete := func(ctx *router.Ctx) {
		// get ID from URL

		id := ctx.GetParam("id")
		if id == "" {
			ctx.ResponseError(http.StatusBadRequest, "id not found")
			return
		}
		db := database.Get()
		res := db.Table(c.Name).Where("id = ?", id).Delete(nil)
		if res.Error != nil {
			// TODO: proper error check
			ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
			return
		}

		if res.RowsAffected == 0 {
			// TODO: proper error check
			ctx.ResponseError(http.StatusBadRequest, "Record not found")
			return
		}

		ctx.ResponseOk(http.StatusOK, id)
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
		router.MethodPUT,
		fmt.Sprintf("/%s/%s/:id", CollectionString, c.Name),
		handleUpdate,
	})
	asdf = append(asdf, crudRouterReturnType{
		router.MethodDELETE,
		fmt.Sprintf("/%s/%s/:id", CollectionString, c.Name),
		handleDelete,
	})

	return asdf
}
