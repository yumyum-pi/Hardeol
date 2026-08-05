package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/router"
	"yumyum-pi/Hardeol/core/validation"
)

// ValidationProfileRouter returns routes for validation profiles for a specific collection
func ValidationProfileRouter(c *Collection) []crudRouterReturnType {
	collectionID := c.ID

	handleList := func(ctx *router.Ctx) {
		db := database.Get()
		var profiles []ValidationProfile
		db.Where("collection_id = ?", collectionID).Order("name").Find(&profiles)
		ctx.ResponseOk(http.StatusOK, profiles)
	}

	handleCreate := func(ctx *router.Ctx) {
		db := database.Get()

		var profile ValidationProfile
		if err := json.NewDecoder(ctx.Request.Body).Decode(&profile); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		// Validate action type
		if profile.ActionType != ActionCreate && profile.ActionType != ActionUpdate && profile.ActionType != ActionAll {
			ctx.ResponseError(http.StatusBadRequest, "action_type must be CREATE, UPDATE, or ALL")
			return
		}

		// Validate field rules reference valid fields
		fieldNames := make(map[string]bool)
		for _, f := range c.Fields {
			fieldNames[f.Name] = true
		}
		for _, rule := range profile.FieldRules {
			if !fieldNames[rule.FieldName] {
				ctx.ResponseError(http.StatusBadRequest, fmt.Sprintf("field '%s' does not exist in collection", rule.FieldName))
				return
			}
		}

		profile.CollectionID = collectionID

		if err := db.Create(&profile).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusCreated, profile)
	}

	handleUpdate := func(ctx *router.Ctx) {
		profileIdStr := ctx.GetParam("profileId")
		profileId, err := strconv.Atoi(profileIdStr)
		if err != nil {
			ctx.ResponseError(http.StatusBadRequest, "invalid profile ID")
			return
		}

		db := database.Get()

		var existingProfile ValidationProfile
		if err := db.First(&existingProfile, profileId).Error; err != nil {
			ctx.ResponseError(http.StatusNotFound, "profile not found")
			return
		}

		// Verify the profile belongs to this collection
		if existingProfile.CollectionID != collectionID {
			ctx.ResponseError(http.StatusNotFound, "profile not found")
			return
		}

		var profile ValidationProfile
		if err := json.NewDecoder(ctx.Request.Body).Decode(&profile); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		// Validate action type
		if profile.ActionType != ActionCreate && profile.ActionType != ActionUpdate && profile.ActionType != ActionAll {
			ctx.ResponseError(http.StatusBadRequest, "action_type must be CREATE, UPDATE, or ALL")
			return
		}

		// Validate field rules reference valid fields
		fieldNames := make(map[string]bool)
		for _, f := range c.Fields {
			fieldNames[f.Name] = true
		}
		for _, rule := range profile.FieldRules {
			if !fieldNames[rule.FieldName] {
				ctx.ResponseError(http.StatusBadRequest, fmt.Sprintf("field '%s' does not exist in collection", rule.FieldName))
				return
			}
		}

		existingProfile.Name = profile.Name
		existingProfile.ActionType = profile.ActionType
		existingProfile.IsActive = profile.IsActive
		existingProfile.FieldRules = profile.FieldRules
		existingProfile.SectionRules = profile.SectionRules
		existingProfile.CollectionRules = profile.CollectionRules

		if err := db.Save(&existingProfile).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusOK, existingProfile)
	}

	handleDelete := func(ctx *router.Ctx) {
		profileIdStr := ctx.GetParam("profileId")
		profileId, err := strconv.Atoi(profileIdStr)
		if err != nil {
			ctx.ResponseError(http.StatusBadRequest, "invalid profile ID")
			return
		}

		db := database.Get()

		var existingProfile ValidationProfile
		if err := db.First(&existingProfile, profileId).Error; err != nil {
			ctx.ResponseError(http.StatusNotFound, "profile not found")
			return
		}

		// Verify the profile belongs to this collection
		if existingProfile.CollectionID != collectionID {
			ctx.ResponseError(http.StatusNotFound, "profile not found")
			return
		}

		if err := db.Delete(&ValidationProfile{}, profileId).Error; err != nil {
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}

		ctx.ResponseOk(http.StatusOK, "deleted")
	}

	// handleValidate validates data without saving
	handleValidate := func(ctx *router.Ctx) {
		var request struct {
			Data      map[string]interface{} `json:"data"`
			ProfileID *int                   `json:"profile_id,omitempty"`
			Action    string                 `json:"action"` // "CREATE" or "UPDATE"
		}

		if err := json.NewDecoder(ctx.Request.Body).Decode(&request); err != nil {
			ctx.ResponseError(http.StatusBadRequest, "Invalid JSON: "+err.Error())
			return
		}

		if request.Action != "CREATE" && request.Action != "UPDATE" {
			request.Action = "CREATE"
		}

		db := database.Get()

		// Get active validation profiles
		var profiles []ValidationProfile
		query := db.Where("collection_id = ? AND is_active = ?", collectionID, true)

		// Filter by action type
		actionType := ActionType(request.Action)
		query = query.Where("action_type = ? OR action_type = ?", actionType, ActionAll)

		// If specific profile requested, use only that one
		if request.ProfileID != nil {
			query = query.Where("id = ?", *request.ProfileID)
		}

		query.Find(&profiles)

		if len(profiles) == 0 {
			// No active profiles, validation passes
			ctx.ResponseOk(http.StatusOK, validation.ValidationResult{Valid: true, Errors: []validation.ValidationError{}})
			return
		}

		// Build field map for validation
		fields := make(map[string]SchemaField)
		for _, f := range c.Fields {
			fields[f.Name] = f
		}

		// Run validation against all active profiles
		var allErrors []validation.ValidationError
		for _, profile := range profiles {
			result := validation.ValidateRecord(
				convertProfile(profile),
				convertFields(fields),
				request.Data,
				request.Action,
				c.Name,
				nil, // No DB check for uniqueness in validate-only endpoint
			)
			allErrors = append(allErrors, result.Errors...)
		}

		ctx.ResponseOk(http.StatusOK, validation.ValidationResult{
			Valid:  len(allErrors) == 0,
			Errors: allErrors,
		})
	}

	basePath := fmt.Sprintf("/%s/%s/validation-profiles", CollectionString, c.Name)

	return []crudRouterReturnType{
		{router.MethodGET, basePath, handleList},
		{router.MethodPOST, basePath, handleCreate},
		{router.MethodPUT, fmt.Sprintf("%s/:profileId", basePath), handleUpdate},
		{router.MethodDELETE, fmt.Sprintf("%s/:profileId", basePath), handleDelete},
		{router.MethodPOST, fmt.Sprintf("/%s/%s/validate", CollectionString, c.Name), handleValidate},
	}
}

// convertProfile converts a ValidationProfile to the validation package format
func convertProfile(p ValidationProfile) validation.Profile {
	fieldRules := make([]validation.FieldRule, len(p.FieldRules))
	for i, r := range p.FieldRules {
		fieldRules[i] = validation.FieldRule{
			FieldName:    r.FieldName,
			MinLength:    r.MinLength,
			MaxLength:    r.MaxLength,
			Regex:        r.Regex,
			Min:          r.Min,
			Max:          r.Max,
			IntegerOnly:  r.IntegerOnly,
			MinDate:      r.MinDate,
			MaxDate:      r.MaxDate,
			MinRows:      r.MinRows,
			MaxRows:      r.MaxRows,
			JSONSchema:   r.JSONSchema,
			CustomExpr:   r.CustomExpr,
			ErrorMessage: r.ErrorMessage,
		}
	}

	sectionRules := make([]validation.SectionRule, len(p.SectionRules))
	for i, r := range p.SectionRules {
		conditions := make([]validation.ConditionalRule, len(r.Conditions))
		for j, c := range r.Conditions {
			conditions[j] = validation.ConditionalRule{
				IfField:       c.IfField,
				IfCondition:   c.IfCondition,
				IfValue:       c.IfValue,
				ThenField:     c.ThenField,
				ThenCondition: c.ThenCondition,
				ErrorMessage:  c.ErrorMessage,
			}
		}
		sectionRules[i] = validation.SectionRule{
			SectionID:       r.SectionID,
			MinFieldsFilled: r.MinFieldsFilled,
			MaxFieldsFilled: r.MaxFieldsFilled,
			Conditions:      conditions,
			CustomExpr:      r.CustomExpr,
			ErrorMessage:    r.ErrorMessage,
		}
	}

	collectionRules := make([]validation.CollectionRule, len(p.CollectionRules))
	for i, r := range p.CollectionRules {
		crossSectionConditions := make([]validation.CrossSectionCondition, len(r.CrossSectionConditions))
		for j, c := range r.CrossSectionConditions {
			crossSectionConditions[j] = validation.CrossSectionCondition{
				IfSectionID:   c.IfSectionID,
				IfField:       c.IfField,
				IfCondition:   c.IfCondition,
				IfValue:       c.IfValue,
				ThenSectionID: c.ThenSectionID,
				ThenField:     c.ThenField,
				ThenCondition: c.ThenCondition,
				ErrorMessage:  c.ErrorMessage,
			}
		}
		collectionRules[i] = validation.CollectionRule{
			RuleType:               r.RuleType,
			UniqueFields:           r.UniqueFields,
			CrossSectionConditions: crossSectionConditions,
			CustomExpr:             r.CustomExpr,
			ErrorMessage:           r.ErrorMessage,
		}
	}

	return validation.Profile{
		FieldRules:      fieldRules,
		SectionRules:    sectionRules,
		CollectionRules: collectionRules,
	}
}

// convertFields converts schema fields to validation package format
func convertFields(fields map[string]SchemaField) map[string]validation.Field {
	result := make(map[string]validation.Field)
	for name, f := range fields {
		result[name] = validation.Field{
			Name:          f.Name,
			Type:          string(f.Type),
			Required:      f.Required,
			SelectOptions: f.SelectOptions,
			SectionID:     f.SectionID,
		}
	}
	return result
}

// ValidateRecordForCollection validates a record against active validation profiles
func ValidateRecordForCollection(c *Collection, data map[string]interface{}, action ActionType) error {
	db := database.Get()

	var profiles []ValidationProfile
	db.Where("collection_id = ? AND is_active = ? AND (action_type = ? OR action_type = ?)",
		c.ID, true, action, ActionAll).Find(&profiles)

	if len(profiles) == 0 {
		return nil
	}

	fields := make(map[string]SchemaField)
	for _, f := range c.Fields {
		fields[f.Name] = f
	}

	var allErrors []validation.ValidationError
	for _, profile := range profiles {
		result := validation.ValidateRecord(
			convertProfile(profile),
			convertFields(fields),
			data,
			string(action),
			c.Name,
			db,
		)
		allErrors = append(allErrors, result.Errors...)
	}

	if len(allErrors) > 0 {
		return &validation.ValidationErrors{Errors: allErrors}
	}

	return nil
}
