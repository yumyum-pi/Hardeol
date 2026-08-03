package collections

import (
	"encoding/json"
	"net/http"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/router"
)

// TODO: Add an auth middleware only the admin should be able to view
func collectionsHandlerFunc() []crudRouterReturnType {
	return []crudRouterReturnType{
		{router.MethodGET, "/collection", collectionsHandleList},
		{router.MethodPOST, "/collection", collectionsHandleCreate},
	}
}

func collectionsHandleList(ctx *router.Ctx) {
	list := make([]Collection, 0)

	db := database.Get()
	res := db.Preload("Fields").Find(&list)
	if res.Error != nil {
		ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
		return
	}

	ctx.ResponseOk(http.StatusOK, list)
}

func collectionsHandleCreate(ctx *router.Ctx) {
	r := ctx.Request
	col := new(Collection)

	if err := json.NewDecoder(r.Body).Decode(col); err != nil {
		ctx.ResponseError(http.StatusBadRequest, "Invalid JSON input: "+err.Error())
		return
	}

	// validate collection name format
	if !IsValidCollectionName(col.Name) {
		ctx.ResponseError(http.StatusBadRequest, "Invalid collection name: must start with letter, contain only alphanumeric and underscore, max 64 chars")
		return
	}

	// atomically check if name exists and reserve it (prevents TOCTOU race)
	if !CollectionNameAddIfNotExists(col.Name) {
		ctx.ResponseError(http.StatusBadRequest, "collection name is not unique")
		return
	}

	// check if the collection has id field
	hasID := false
	for i := range col.Fields {
		if col.Fields[i].Name == "id" {
			hasID = true
			break
		}
	}

	// only add default ID field if not already present
	if !hasID {
		id := DefaultIDSchemeField()
		col.Fields = append(col.Fields, id)
	}

	db := database.Get()
	res := db.Create(col)
	if res.Error != nil {
		// rollback the name reservation on failure
		CollectionNameDelete(col.Name)
		ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
		return
	}

	rb := router.Get()
	err := newCollectionRoutes(*col, db, rb)
	if err != nil {
		// rollback on failure
		CollectionNameDelete(col.Name)
		ctx.ResponseError(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.ResponseOk(http.StatusCreated, col)
}
