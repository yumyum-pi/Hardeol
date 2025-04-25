package router

type Params struct {
	Key   string
	Value string
}

func extractParamWithoutQuery(n *node, url string, start int, end int) Params {
	// find the position for query start
	for i := start; i < end; i++ {
		c := url[i]

		if c == '?' {
			end = i
		}
	}
	// for key remove the "/:" from path
	// for value the "/" from path
	return Params{
		Key:   n.path[2:],
		Value: url[start+1 : end],
	}
}
