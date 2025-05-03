package router

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Ctx struct {
	Request  *http.Request
	Response http.ResponseWriter
	params   []Param
}

func CreateCtx(response http.ResponseWriter, request *http.Request, params []Param) *Ctx {
	c := Ctx{}
	c.Response = response
	c.Request = request
	c.params = params
	return &c
}

func (c *Ctx) GetParam(key string) string {
	for i := range c.params {
		if c.params[i].Key == key {
			return c.params[i].Value
		}
	}
	return ""
}

func (c *Ctx) JSON(status int, data any) {
	w := c.Response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		// TODO: write proper logger
		fmt.Println("Error encoding response:", err)
	}
}

func (c *Ctx) ResponseOk(status int, data any) {
	wrapper := make(map[string]any, 0)
	wrapper["status"] = status
	wrapper["data"] = data
	c.JSON(status, wrapper)
}

func (c *Ctx) ResponseError(status int, err any) {
	wrapper := make(map[string]any, 0)
	wrapper["status"] = status
	wrapper["error"] = err
	c.JSON(status, wrapper)
}
