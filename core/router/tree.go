package router

import (
	"errors"
	"net/http"
)

type nodeType uint8

const (
	nodeTypeStatic nodeType = iota
	nodeTypeParams
	nodeTypeWild
	nodeTypeRoot
)

type Handler func(http.ResponseWriter, *http.Request)

// node represents part of the URL path in the trie.
type node struct {
	// path the represents the node
	path     string
	children []*node
	nodeType nodeType
	handler  Handler
}

// CreateRootNode initializes and returns an empty root node.
func CreateRootNode() *node {
	return &node{
		path:     "",
		children: make([]*node, 0),
		nodeType: nodeTypeRoot,
	}
}

var (
	ErrDuplicateRoute = errors.New("duplicate path not allowed")
	ErrNotRoot        = errors.New("not root")
	// TODO:check of this error
	ErrSegmentAfterWild = errors.New("segment after wild entry is not allowed")
	ErrHandlerNotFound  = errors.New("handler not found")
	ErrEmptyParam       = errors.New("empty param not allowed")
	ErrEmptyWild        = errors.New("empty wild not allowed")
)

// TODO:
// check priority for same level of children node
// When error, how to correct the newely created child
func (n *node) Add(url string, handle Handler) error {
	current := n
	if current.nodeType != nodeTypeRoot {
		return ErrNotRoot
	}

	// var for looping the findSegmentEnd
	endIndex := 0
	startIndex := 0
	lenUrl := len(url)

	path := ""

	// loop over the paths
	for endIndex < lenUrl {
		// get the path segment by segment
		endIndex = findSegmentEnd(url, startIndex)
		path = url[startIndex:endIndex]
		startIndex = endIndex

		// check if the current node has the path
		if path == "" {
			continue
		}

		found := false
		// check if path exist in children
		for _, c := range current.children {
			if c.path == path {
				current = c
				found = true
				// check if the last path
				if endIndex >= lenUrl {
					if c.handler != nil {
						return ErrDuplicateRoute
					}
					c.handler = handle
				}

				break
			}
		}

		if !found {
			// path does not exist in the children
			// append a new children with path

			nType := nodeTypeStatic
			if len(path) > 1 {
				char := path[1]
				switch char {
				case '*':
					nType = nodeTypeWild
					if len(path) < 3 {
						return ErrEmptyWild
					}
				case ':':
					nType = nodeTypeParams
					if len(path) < 3 {
						return ErrEmptyParam
					}
				}
			}
			c := node{
				path:     path,
				children: make([]*node, 0),
				nodeType: nType,
				handler:  nil,
			}

			// check if the last path
			if endIndex >= lenUrl {
				c.handler = handle
			}

			// add to the current node
			current.children = append(current.children, &c)
			current = &c
		}
	}

	return nil
}

func (n *node) Get(url string) (h Handler, allMatch bool, params map[string]string, err error) {
	current := n
	if current.nodeType != nodeTypeRoot {
		return nil, false, nil, ErrNotRoot
	}

	params = make(map[string]string)

	allMatch = true
	endIndex := 0
	startIndex := 0
	lenUrl := len(url)

	path := ""
	// loop over the paths
	for endIndex < lenUrl {
		endIndex = findSegmentEnd(url, startIndex)
		path = url[startIndex:endIndex]
		// store for param and wild name
		s := startIndex
		// change the startIndex for the next loop
		startIndex = endIndex

		// check if the current node has the path
		if path == "" {
			continue
		}
		found := false

	matchLoop:
		for _, c := range current.children {
			// switch based on nodetype
			switch c.nodeType {
			case nodeTypeParams:
				// store the value of param
				extractParam(params, c, url, s, endIndex)
				found = true
				current = c
				// checking if the last child
				if endIndex >= lenUrl {
					h = c.handler
					// the last path should have a handler
					if h == nil {
						allMatch = false
						err = ErrHandlerNotFound
					}
					return
				}
				break matchLoop
			case nodeTypeWild:
				endIndex = lenUrl
				// store the value of wild
				extractParam(params, c, url, s, endIndex)
				params[c.path] = url[s:endIndex]
				h = c.handler
				if h == nil {
					allMatch = false
					err = ErrHandlerNotFound
				}
				return

			default:
				// handle the static node type
				if c.path == path {
					found = true
					current = c
					// checking if the last child
					if endIndex >= lenUrl {
						h = c.handler
						// the last path should have a handler
						if h == nil {
							allMatch = false
							err = ErrHandlerNotFound
						}
						return
					}
					break matchLoop
				}
			}
		}

		if !found {
			allMatch = false
			return
		}
	}
	return
}

func extractParam(params map[string]string, c *node, url string, s int, endIndex int) {
	// for key remove the "/:" from path
	// for value the "/" from path
	// TODO: remove query params from the param value
	params[c.path[2:]] = url[s+1 : endIndex]
}
