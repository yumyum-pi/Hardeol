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
				case ':':
					nType = nodeTypeParams
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

func (n *node) Get(url string) (Handler, bool) {
	current := n
	if current.nodeType != nodeTypeRoot {
		// TODO: Throw Error
	}

	allMatch := true
	endIndex := 0
	startIndex := 0
	lenUrl := len(url)

	path := ""
	// loop over the paths
	for endIndex < lenUrl {
		endIndex = findSegmentEnd(url, startIndex)
		path = url[startIndex:endIndex]
		startIndex = endIndex

		// check if the current node has the path
		if path == "" {
			continue
		}
		found := false

		for _, c := range current.children {
			if c.path == path {
				found = true
				current = c
				break
			}
		}

		if !found {
			allMatch = false
			break
		}
	}

	if allMatch {
		return nil, true
	}

	return nil, false
}
