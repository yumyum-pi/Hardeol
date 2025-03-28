package collections

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func JSONResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		// TODO: write proper logger
		fmt.Println("Error encoding response:", err)
	}
}

func ResponseOk(w http.ResponseWriter, status int, data interface{}) {
	wrapper := make(map[string]interface{}, 0)
	wrapper["status"] = status
	wrapper["data"] = data
	JSONResponse(w, status, wrapper)
}

func ResponseError(w http.ResponseWriter, status int, err interface{}) {
	wrapper := make(map[string]interface{}, 0)
	wrapper["status"] = status
	wrapper["error"] = err
	JSONResponse(w, status, wrapper)
}
