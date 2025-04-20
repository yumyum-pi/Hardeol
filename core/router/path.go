package router

type PathType uint16

const (
	StaticPath PathType = iota
	ParamPath
	WildPath
)

// parse the url and get the parameter

// findSegmentEnd finds the the end index of the next path segement(excluding the leading '/').
// It advances through the url starting at startIndex and returns the positions just before the the following '/'
// if no further '/' is found, it returns len(url).
func findSegmentEnd(path string, start int) int {
	l := len(path)
	if start >= l {
		return l
	}

	i := start + 1
	for i < l {
		if path[i] == '/' {
			return i
		}
		i++
	}

	return l
}
