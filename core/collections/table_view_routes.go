package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/router"
)

const PARAM_ID = "table-view-id";

// TableViewRouter returns routes for table views for a specific collection
func TableViewRouter(c *Collection) []crudRouterReturnType {
	collectionID := c.ID

	handleList := func(ctx *router.Ctx) {
		db := database.Get()
		var views []TableView
		db.Where("collection_id = ?", collectionID).Order("name").Find(&views)
		ctx.ResponseOk(http.StatusOK, views)
	}

	handleCreate := func(ctx *router.Ctx) {
		db := database.Get()

		var view TableView
		if err := json.NewDecoder(ctx.Request.Body).Decode(&view); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		view.CollectionID = collectionID

		// If this is set as default, unset other defaults
		if view.IsDefault {
			db.Model(&TableView{}).Where("collection_id = ?", collectionID).Update("is_default", false)
		}

		if err := db.Create(&view).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusCreated, view)
	}

	handleUpdate := func(ctx *router.Ctx) {
		viewIdStr := ctx.GetParam(PARAM_ID)
		viewId, err := strconv.Atoi(viewIdStr)
		if err != nil {
			ctx.ResponseError(http.StatusBadRequest, "invalid view ID")
			return
		}

		db := database.Get()

		var existingView TableView
		if err := db.First(&existingView, viewId).Error; err != nil {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		// Verify the view belongs to this collection
		if existingView.CollectionID != collectionID {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		var view TableView
		if err := json.NewDecoder(ctx.Request.Body).Decode(&view); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		// If setting as default, unset others first
		if view.IsDefault && !existingView.IsDefault {
			db.Model(&TableView{}).Where("collection_id = ?", collectionID).Update("is_default", false)
		}

		existingView.Name = view.Name
		existingView.Fields = view.Fields
		existingView.IsDefault = view.IsDefault

		if err := db.Save(&existingView).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusOK, existingView)
	}

	handleDelete := func(ctx *router.Ctx) {
		viewIdStr := ctx.GetParam(PARAM_ID)
		viewId, err := strconv.Atoi(viewIdStr)
		if err != nil {
			ctx.ResponseError(http.StatusBadRequest, "invalid view ID")
			return
		}

		db := database.Get()

		var existingView TableView
		if err := db.First(&existingView, viewId).Error; err != nil {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		// Verify the view belongs to this collection
		if existingView.CollectionID != collectionID {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		if err := db.Delete(&TableView{}, viewId).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusOK, "deleted")
	}

	basePath := fmt.Sprintf("/%s/%s/table-views", CollectionString, c.Name)

	return []crudRouterReturnType{
		{router.MethodGET, basePath, handleList},
		{router.MethodPOST, basePath, handleCreate},
		{router.MethodPUT, fmt.Sprintf("%s/:%s", basePath, PARAM_ID), handleUpdate},
		{router.MethodDELETE, fmt.Sprintf("%s/:%s", basePath, PARAM_ID), handleDelete},
	}
}
