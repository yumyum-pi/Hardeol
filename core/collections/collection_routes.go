package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/logger"
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
	w := ctx.Response
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

func collectionsHandleCreate(ctx *router.Ctx) {
	w := ctx.Response
	r := ctx.Request
	col := new(Collection)

	if err := json.NewDecoder(r.Body).Decode(col); err != nil {
		http.Error(w, "Invalid JSON input", http.StatusBadRequest)
		return
	}

	// run validation
	// collection name should be unique
	if CollectionNameExists(col.Name) {
		ResponseError(w, http.StatusBadRequest, "collection Name is not unique")
		return
	}

	// check if the collection has id
	foundID := false
	for i := range col.Fields {
		if col.Fields[i].Name != "id" {
			foundID = true
		}
	}

	if foundID {
		id := DefaultIDSchemeField()
		col.Fields = append(col.Fields, id)
	}

	db := database.Get()
	res := db.Create(col)
	if res.Error != nil {
		fmt.Println(res.Error.Error())
	}

	rb := router.Get()
	newCollection(*col, db, rb)
	ResponseOk(w, http.StatusOK, col)
}
