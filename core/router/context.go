package router

import "net/http"

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
