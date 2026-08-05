package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/router"
)

// FormViewRouter returns routes for form views for a specific collection
func FormViewRouter(c *Collection) []crudRouterReturnType {
	collectionID := c.ID

	handleList := func(ctx *router.Ctx) {
		db := database.Get()
		var views []FormView
		db.Where("collection_id = ?", collectionID).Order("name").Find(&views)
		ctx.ResponseOk(http.StatusOK, views)
	}

	handleCreate := func(ctx *router.Ctx) {
		db := database.Get()

		var view FormView
		if err := json.NewDecoder(ctx.Request.Body).Decode(&view); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		// Validate action type
		if view.ActionType != ActionCreate && view.ActionType != ActionUpdate && view.ActionType != ActionAll {
			ctx.ResponseError(http.StatusBadRequest, "action_type must be CREATE, UPDATE, or ALL")
			return
		}

		// Validate width values
		for _, field := range view.Fields {
			if field.Width != "full" && field.Width != "half" && field.Width != "third" {
				ctx.ResponseError(http.StatusBadRequest, fmt.Sprintf("field %s has invalid width: must be full, half, or third", field.Name))
				return
			}
		}

		// Check at least one visible field
		hasVisible := false
		for _, field := range view.Fields {
			if field.Visible {
				hasVisible = true
				break
			}
		}
		if !hasVisible {
			ctx.ResponseError(http.StatusBadRequest, "at least one field must be visible")
			return
		}

		view.CollectionID = collectionID

		// If this is set as default, unset other defaults for the same action type
		if view.IsDefault {
			db.Model(&FormView{}).
				Where("collection_id = ? AND (action_type = ? OR action_type = 'ALL' OR ? = 'ALL')", collectionID, view.ActionType, view.ActionType).
				Update("is_default", false)
		}

		if err := db.Create(&view).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusCreated, view)
	}

	handleUpdate := func(ctx *router.Ctx) {
		viewIdStr := ctx.GetParam("viewId")
		viewId, err := strconv.Atoi(viewIdStr)
		if err != nil {
			ctx.ResponseError(http.StatusBadRequest, "invalid view ID")
			return
		}

		db := database.Get()

		var existingView FormView
		if err := db.First(&existingView, viewId).Error; err != nil {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		// Verify the view belongs to this collection
		if existingView.CollectionID != collectionID {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		var view FormView
		if err := json.NewDecoder(ctx.Request.Body).Decode(&view); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		// Validate action type
		if view.ActionType != ActionCreate && view.ActionType != ActionUpdate && view.ActionType != ActionAll {
			ctx.ResponseError(http.StatusBadRequest, "action_type must be CREATE, UPDATE, or ALL")
			return
		}

		// Validate width values
		for _, field := range view.Fields {
			if field.Width != "full" && field.Width != "half" && field.Width != "third" {
				ctx.ResponseError(http.StatusBadRequest, fmt.Sprintf("field %s has invalid width: must be full, half, or third", field.Name))
				return
			}
		}

		// Check at least one visible field
		hasVisible := false
		for _, field := range view.Fields {
			if field.Visible {
				hasVisible = true
				break
			}
		}
		if !hasVisible {
			ctx.ResponseError(http.StatusBadRequest, "at least one field must be visible")
			return
		}

		// If setting as default, unset others for the same action type first
		if view.IsDefault && !existingView.IsDefault {
			db.Model(&FormView{}).
				Where("collection_id = ? AND (action_type = ? OR action_type = 'ALL' OR ? = 'ALL')", collectionID, view.ActionType, view.ActionType).
				Update("is_default", false)
		}

		existingView.Name = view.Name
		existingView.ActionType = view.ActionType
		existingView.Fields = view.Fields
		existingView.IsDefault = view.IsDefault

		if err := db.Save(&existingView).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusOK, existingView)
	}

	handleDelete := func(ctx *router.Ctx) {
		viewIdStr := ctx.GetParam("viewId")
		viewId, err := strconv.Atoi(viewIdStr)
		if err != nil {
			ctx.ResponseError(http.StatusBadRequest, "invalid view ID")
			return
		}

		db := database.Get()

		var existingView FormView
		if err := db.First(&existingView, viewId).Error; err != nil {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		// Verify the view belongs to this collection
		if existingView.CollectionID != collectionID {
			ctx.ResponseError(http.StatusNotFound, "view not found")
			return
		}

		if err := db.Delete(&FormView{}, viewId).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusOK, "deleted")
	}

	basePath := fmt.Sprintf("/%s/%s/form-views", CollectionString, c.Name)

	return []crudRouterReturnType{
		{router.MethodGET, basePath, handleList},
		{router.MethodPOST, basePath, handleCreate},
		{router.MethodPUT, fmt.Sprintf("%s/:viewId", basePath), handleUpdate},
		{router.MethodDELETE, fmt.Sprintf("%s/:viewId", basePath), handleDelete},
	}
}
