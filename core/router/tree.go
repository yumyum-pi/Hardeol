package router

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
)

type nodeType int

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

type Params struct {
	Key   string
	Value string
}

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
			slices.SortFunc(current.children, nodeSort)
			current = &c
		}
	}

	return nil
}

func nodeSort(a, b *node) int {
	return int(a.nodeType - b.nodeType)
}

func (n *node) Get(url string) (h Handler, allMatch bool, params []Params, err error) {
	current := n
	if current.nodeType != nodeTypeRoot {
		return nil, false, nil, ErrNotRoot
	}

	params = make([]Params, 0)

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
				params = append(params, extractParamWithoutQuery(c, url, s, endIndex))
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
				params = append(params, extractParamWithoutQuery(c, url, s, endIndex))
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

func (n *node) print() {
	if n.nodeType != nodeTypeRoot {
		return
	}

	rows := addToRow(n, -1)

	for _, r := range rows {

		prefix := ""
		if r.level == 0 {
			prefix = "|-"
		} else if r.level >= 1 {
			prefix = strings.Repeat("| ", r.level-1)
			prefix = fmt.Sprintf("%s|-", prefix)
		}
		path := fmt.Sprintf("%s%s", prefix, r.path)
		fmt.Printf("%-20s | %d | %d | %v\n", path, r.level, r.nodeType, r.handler)
	}
}

type printRow struct {
	path     string
	nodeType nodeType
	handler  bool
	level    int
}

func addToRow(n *node, parentLevel int) []printRow {
	// add to the rows
	level := parentLevel + 1

	rows := make([]printRow, 0)

	p := printRow{
		path:     n.path,
		nodeType: n.nodeType,
		handler:  n.handler != nil,
		level:    level,
	}
	rows = append(rows, p)

	// loop each children
	for _, c := range n.children {
		rows = append(rows, addToRow(c, level)...)
	}
	return rows
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
