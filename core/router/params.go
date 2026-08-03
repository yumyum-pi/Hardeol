package router

type Param struct {
	Key   string
	Value string
}

func extractParamWithoutQuery(n *node, url string, start int, end int) Param {
	// find the position for query start
	for i := start; i < end; i++ {
		c := url[i]

		if c == '?' {
			end = i
			break
		}
	}

	// extract key: remove the "/:" prefix from path
	key := ""
	if len(n.path) > 2 {
		key = n.path[2:]
	}

	// extract value: remove the "/" prefix, with bounds checking
	value := ""
	if start+1 < end && start+1 < len(url) && end <= len(url) {
		value = url[start+1 : end]
	}

	return Param{
		Key:   key,
		Value: value,
	}
}
