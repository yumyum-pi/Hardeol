package router

var HTTPMethod = []string{
	"GET",
	"POST",
	"PUT",
	"DELETE",
}

const (
	MethodGET int = iota
	MethodPOST
	MethodPUT
	MethodDELETE
)

var lenHTTPMehod = len(HTTPMethod)

func HTTPMethodToIndex(method string) int {
	for i := range HTTPMethod {
		if HTTPMethod[i] == method {
			return i
		}
	}
	return -1
}
