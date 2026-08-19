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
	database.Migrate(&TableView{})
	database.Migrate(&Section{})
	database.Migrate(&FormView{})
	database.Migrate(&ValidationProfile{})

	db := database.Get()
	c = make([]Collection, 0)
	res := db.Preload("Fields").Preload("Sections").Find(&c)
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

	// Initialize child tables for TABLE fields
	for _, field := range cc.GetTableFields() {
		childTableName := cc.GetChildTableName(field.Name)
		if err := createChildTable(db, childTableName, field); err != nil {
			logger.Error.Println("failed to create child table:", err)
		}
	}

	// Register CRUD routes
	handlers := CRUDRouter(&cc)
	for _, h := range handlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register child table CRUD routes for TABLE fields
	childHandlers := ChildTableRouter(&cc)
	for _, h := range childHandlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register table view routes
	viewHandlers := TableViewRouter(&cc)
	for _, h := range viewHandlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register form view routes
	formViewHandlers := FormViewRouter(&cc)
	for _, h := range formViewHandlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register validation profile routes
	validationHandlers := ValidationProfileRouter(&cc)
	for _, h := range validationHandlers {
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

	// Initialize child tables for TABLE fields
	for _, field := range cc.GetTableFields() {
		childTableName := cc.GetChildTableName(field.Name)
		if err := createChildTable(db, childTableName, field); err != nil {
			return err
		}
	}

	// Register CRUD routes
	handlers := CRUDRouter(&cc)
	for _, h := range handlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register child table CRUD routes for TABLE fields
	childHandlers := ChildTableRouter(&cc)
	for _, h := range childHandlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register table view routes
	viewHandlers := TableViewRouter(&cc)
	for _, h := range viewHandlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register form view routes
	formViewHandlers := FormViewRouter(&cc)
	for _, h := range formViewHandlers {
		r.Handle(
			h.method,
			h.path,
			h.handler,
		)
	}

	// Register validation profile routes
	validationHandlers := ValidationProfileRouter(&cc)
	for _, h := range validationHandlers {
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
	r.Remove(router.MethodPOST, basePath+"/query")
	r.Remove(router.MethodPUT, basePath+"/:id")
	r.Remove(router.MethodDELETE, basePath+"/:id")

	// Remove old child table routes
	for _, field := range cc.GetTableFields() {
		childPath := fmt.Sprintf("%s/:id/%s", basePath, field.Name)
		r.Remove(router.MethodGET, childPath)
		r.Remove(router.MethodPOST, childPath)
		r.Remove(router.MethodPUT, childPath+"/:row_id")
		r.Remove(router.MethodDELETE, childPath+"/:row_id")
	}

	// Re-register with updated schema
	handlers := CRUDRouter(&cc)
	for _, h := range handlers {
		if err := r.Handle(h.method, h.path, h.handler); err != nil {
			return err
		}
	}

	// Re-register child table routes
	childHandlers := ChildTableRouter(&cc)
	for _, h := range childHandlers {
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

	// handle filtered list to collection (POST, filters carried in the JSON body
	// rather than a query param — the frontend uses fetch(), which forbids a body
	// on GET requests, so filtered listing lives on its own POST route instead of
	// overloading the query-string-only GET above).
	handleQuery := func(ctx *router.Ctx) {
		sliceType := reflect.SliceOf(t)
		sliceValue := reflect.MakeSlice(sliceType, 0, 0)
		valSlice := sliceValue.Interface()

		var body struct {
			Filters []FilterRule `json:"filters"`
		}
		if err := json.NewDecoder(ctx.Request.Body).Decode(&body); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		db := database.Get().Table(c.Name)
		if len(body.Filters) > 0 {
			var err error
			db, err = ApplyFilters(db, c.Fields, body.Filters)
			if err != nil {
				ctx.ResponseError(http.StatusBadRequest, err.Error())
				return
			}
		}

		res := db.Find(&valSlice)
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
		router.MethodPOST,
		fmt.Sprintf("/%s/%s/query", CollectionString, c.Name),
		handleQuery,
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

// ChildTableRouter creates CRUD routes for TABLE field child tables
func ChildTableRouter(c *Collection) []crudRouterReturnType {
	routes := make([]crudRouterReturnType, 0)

	for _, field := range c.GetTableFields() {
		fieldName := field.Name
		childTableName := c.GetChildTableName(fieldName)
		tableField := field // capture for closures

		// Create dynamic type for child table
		childType, err := CreateTableFieldType(tableField)
		if err != nil {
			logger.Error.Println("failed to create child type:", err)
			continue
		}

		// GET /collection/{name}/:id/{field_name} - List child rows
		handleList := func(ctx *router.Ctx) {
			parentID := ctx.GetParam("id")
			if parentID == "" {
				ctx.ResponseError(http.StatusBadRequest, "parent id required")
				return
			}

			sliceType := reflect.SliceOf(childType)
			sliceValue := reflect.MakeSlice(sliceType, 0, 0)
			valSlice := sliceValue.Interface()

			db := database.Get()
			res := db.Table(childTableName).Where("parent_id = ?", parentID).Order("row_order ASC").Find(&valSlice)
			if res.Error != nil {
				ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
				return
			}
			ctx.ResponseOk(http.StatusOK, valSlice)
		}

		// POST /collection/{name}/:id/{field_name} - Create child row
		handleCreate := func(ctx *router.Ctx) {
			parentID := ctx.GetParam("id")
			if parentID == "" {
				ctx.ResponseError(http.StatusBadRequest, "parent id required")
				return
			}

			v := reflect.New(childType).Interface()
			if err := json.NewDecoder(ctx.Request.Body).Decode(v); err != nil {
				ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
				return
			}

			// Set parent_id
			rv := reflect.ValueOf(v).Elem()
			parentIDField := rv.FieldByName("ParentId")
			if parentIDField.IsValid() && parentIDField.CanSet() {
				pid := 0
				fmt.Sscanf(parentID, "%d", &pid)
				parentIDField.SetInt(int64(pid))
			}

			// Get max row_order and set new order
			db := database.Get()
			var maxOrder int
			db.Table(childTableName).Where("parent_id = ?", parentID).Select("COALESCE(MAX(row_order), -1)").Scan(&maxOrder)
			rowOrderField := rv.FieldByName("RowOrder")
			if rowOrderField.IsValid() && rowOrderField.CanSet() {
				rowOrderField.SetInt(int64(maxOrder + 1))
			}

			res := db.Table(childTableName).Create(v)
			if res.Error != nil {
				ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
				return
			}
			ctx.ResponseOk(http.StatusCreated, v)
		}

		// PUT /collection/{name}/:id/{field_name}/:row_id - Update child row
		handleUpdate := func(ctx *router.Ctx) {
			parentID := ctx.GetParam("id")
			rowID := ctx.GetParam("row_id")
			if parentID == "" || rowID == "" {
				ctx.ResponseError(http.StatusBadRequest, "parent id and row id required")
				return
			}

			var updates map[string]interface{}
			if err := json.NewDecoder(ctx.Request.Body).Decode(&updates); err != nil {
				ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
				return
			}

			delete(updates, "id")
			delete(updates, "parent_id")

			db := database.Get()
			res := db.Table(childTableName).Where("id = ? AND parent_id = ?", rowID, parentID).Updates(updates)
			if res.Error != nil {
				ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
				return
			}
			if res.RowsAffected == 0 {
				ctx.ResponseError(http.StatusNotFound, "Row not found")
				return
			}

			v := reflect.New(childType).Interface()
			if err := db.Table(childTableName).Where("id = ?", rowID).First(v).Error; err != nil {
				ctx.ResponseError(http.StatusInternalServerError, err.Error())
				return
			}
			ctx.ResponseOk(http.StatusOK, v)
		}

		// DELETE /collection/{name}/:id/{field_name}/:row_id - Delete child row
		handleDelete := func(ctx *router.Ctx) {
			parentID := ctx.GetParam("id")
			rowID := ctx.GetParam("row_id")
			if parentID == "" || rowID == "" {
				ctx.ResponseError(http.StatusBadRequest, "parent id and row id required")
				return
			}

			db := database.Get()
			res := db.Table(childTableName).Where("id = ? AND parent_id = ?", rowID, parentID).Delete(nil)
			if res.Error != nil {
				ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
				return
			}
			if res.RowsAffected == 0 {
				ctx.ResponseError(http.StatusNotFound, "Row not found")
				return
			}
			ctx.ResponseOk(http.StatusOK, rowID)
		}

		basePath := fmt.Sprintf("/%s/%s/:id/%s", CollectionString, c.Name, fieldName)

		routes = append(routes,
			crudRouterReturnType{router.MethodGET, basePath, handleList},
			crudRouterReturnType{router.MethodPOST, basePath, handleCreate},
			crudRouterReturnType{router.MethodPUT, basePath + "/:row_id", handleUpdate},
			crudRouterReturnType{router.MethodDELETE, basePath + "/:row_id", handleDelete},
		)
	}

	return routes
}
