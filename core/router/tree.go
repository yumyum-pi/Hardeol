package router

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
)

// TODO: check for cuncurrency stafty
type nodeType int

// TODO: throw error children have two (wild or param)
const (
	nodeTypeStatic nodeType = iota
	nodeTypeParams
	nodeTypeWild
	nodeTypeRoot
)

type Handle func(http.ResponseWriter, *http.Request, []Param)

// node represents part of the URL path in the trie.
type node struct {
	// path the represents the node
	mu       sync.RWMutex
	path     string
	children []*node
	nodeType nodeType
	handler  Handle
}

// CreateRootNode initializes and returns an empty root node.
func CreateRootNode() *node {
	return &node{
		path:     "",
		children: make([]*node, 0),
		nodeType: nodeTypeRoot,
	}
}

func (n *node) Add(url string, handle Handle) error {
	n.mu.Lock()
	defer n.mu.Unlock()
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

		var child *node
		// check if path exist in children
		for _, c := range current.children {
			if c.path == path {
				child = c
				break
			}
		}

		if child == nil {
			nType, err := segmentType(path)
			if err != nil {
				return err
			}

			child = &node{
				path:     path,
				children: make([]*node, 0),
				nodeType: nType,
				handler:  nil,
			}

			// add to the current node
			current.children = append(current.children, child)
			slices.SortFunc(current.children, nodeSort)
		}

		current = child

		// check if the last path
		if endIndex >= lenUrl {
			if current.handler != nil {
				return ErrDuplicateRoute
			}
			current.handler = handle
		}
	}

	return nil
}

func segmentType(seg string) (nodeType, error) {
	const minBuffer = 3
	l := len(seg)
	if l > 1 {
		char := seg[1]
		switch char {
		case '*':
			if l < minBuffer {
				return nodeTypeWild, ErrEmptyWild
			}
			return nodeTypeWild, nil
		case ':':
			if l < minBuffer {
				return nodeTypeParams, ErrEmptyParam
			}

			return nodeTypeParams, nil
		}
	}

	return nodeTypeStatic, nil
}

func nodeSort(a, b *node) int {
	return int(a.nodeType - b.nodeType)
}

func (n *node) Get(url string) (Handle, []Param, error) {
	n.mu.RLock()
	defer n.mu.RUnlock()
	current := n
	if current.nodeType != nodeTypeRoot {
		return nil, nil, ErrNotRoot
	}

	params := make([]Param, 0)

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
		var match *node

	matchBreak:
		for _, child := range current.children {
			// switch based on nodetype
			switch child.nodeType {
			case nodeTypeParams:
				// store the value of param
				params = append(params, extractParamWithoutQuery(child, url, s, endIndex))
				match = child
				break matchBreak
			case nodeTypeWild:
				endIndex = lenUrl
				// store the value of wild
				params = append(params, extractParamWithoutQuery(child, url, s, endIndex))
				match = child
				break matchBreak
			default:
				// handle the static node type
				if child.path == path {
					match = child
					break matchBreak
				}
			}
		}

		if match == nil {
			return nil, nil, ErrPathNotFound
		}
		current = match
	}

	if current.handler == nil {
		return nil, nil, ErrHandlerNotFound
	}
	return current.handler, params, nil
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

func (n *node) remove(url string) error {
	n.mu.Lock()
	defer n.mu.Unlock()
	current := n
	if current.nodeType != nodeTypeRoot {
		return ErrNotRoot
	}

	endIndex := 0
	startIndex := 0
	lenUrl := len(url)

	// loop over the paths
	for endIndex < lenUrl {
		endIndex = findSegmentEnd(url, startIndex)
		path := url[startIndex:endIndex]
		// change the startIndex for the next loop
		startIndex = endIndex

		// check if the current node has the path
		if path == "" {
			continue
		}
		found := false

		for i, child := range current.children {
			// handle the static node type
			if child.path == path {
				found = true
				// checking if the last child
				if endIndex >= lenUrl {
					// DeleteNode
					temp := slices.Delete(current.children, i, i+1)
					current.children = slices.Clone(temp)

					return nil
				}

				current = child
			}
		}

		if !found {
			return ErrPathNotFound
		}
	}
	return ErrPathNotFound
}
