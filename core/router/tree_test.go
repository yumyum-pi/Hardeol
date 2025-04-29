package router

import (
	"errors"
	"reflect"
	"testing"
)

type testRoute struct {
	method string
	path   string
}

var staticPath = []string{
	"/",
	"/cmd.html",
	"/code.html",
	"/contrib.html",
	"/contribute.html",
	"/debugging_with_gdb.html",
	"/docs.html",
	"/effective_go.html",
	"/files.log",
	"/gccgo_contribute.html",
	"/gccgo_install.html",
	"/go-logo-black.png",
	"/go-logo-blue.png",
	"/go-logo-white.png",
	"/go1.1.html",
	"/go1.2.html",
	"/go1.html",
	"/go1compat.html",
	"/go_faq.html",
	"/go_mem.html",
	"/go_spec.html",
	"/help.html",
	"/ie.css",
	"/install-source.html",
	"/install.html",
	"/logo-153x55.png",
	"/Makefile",
	"/root.html",
	"/share.png",
	"/sieve.gif",
	"/tos.html",
	"/articles",
	"/articles/go_command.html",
	"/articles/index.html",
	"/articles/wiki",
	"/articles/wiki/edit.html",
	"/articles/wiki/final-noclosure.go",
	"/articles/wiki/final-noerror.go",
	"/articles/wiki/final-parsetemplate.go",
	"/articles/wiki/final-template.go",
	"/articles/wiki/final.go",
	"/articles/wiki/get.go",
	"/articles/wiki/http-sample.go",
	"/articles/wiki/index.html",
	"/articles/wiki/Makefile",
	"/articles/wiki/notemplate.go",
	"/articles/wiki/part1-noerror.go",
	"/articles/wiki/part1.go",
	"/articles/wiki/part2.go",
	"/articles/wiki/part3-errorhandling.go",
	"/articles/wiki/part3.go",
	"/articles/wiki/test.bash",
	"/articles/wiki/test_edit.good",
	"/articles/wiki/test_Test.txt.good",
	"/articles/wiki/test_view.good",
	"/articles/wiki/view.html",
	"/codewalk",
	"/codewalk/codewalk.css",
	"/codewalk/codewalk.js",
	"/codewalk/codewalk.xml",
	"/codewalk/functions.xml",
	"/codewalk/markov.go",
	"/codewalk/markov.xml",
	"/codewalk/pig.go",
	"/codewalk/popout.png",
	"/codewalk/run",
	"/codewalk/sharemem.xml",
	"/codewalk/urlpoll.go",
	"/devel",
	"/devel/release.html",
	"/devel/weekly.html",
	"/gopher",
	"/gopher/appenginegopher.jpg",
	"/gopher/appenginegophercolor.jpg",
	"/gopher/appenginelogo.gif",
	"/gopher/bumper.png",
	"/gopher/bumper192x108.png",
	"/gopher/bumper320x180.png",
	"/gopher/bumper480x270.png",
	"/gopher/bumper640x360.png",
	"/gopher/doc.png",
	"/gopher/frontpage.png",
	"/gopher/gopherbw.png",
	"/gopher/gophercolor.png",
	"/gopher/gophercolor16x16.png",
	"/gopher/help.png",
	"/gopher/pkg.png",
	"/gopher/project.png",
	"/gopher/ref.png",
	"/gopher/run.png",
	"/gopher/talks.png",
	"/gopher/pencil",
	"/gopher/pencil/gopherhat.jpg",
	"/gopher/pencil/gopherhelmet.jpg",
	"/gopher/pencil/gophermega.jpg",
	"/gopher/pencil/gopherrunning.jpg",
	"/gopher/pencil/gopherswim.jpg",
	"/gopher/pencil/gopherswrench.jpg",
	"/play",
	"/play/fib.go",
	"/play/hello.go",
	"/play/life.go",
	"/play/peano.go",
	"/play/pi.go",
	"/play/sieve.go",
	"/play/solitaire.go",
	"/play/tree.go",
	"/progs",
	"/progs/cgo1.go",
	"/progs/cgo2.go",
	"/progs/cgo3.go",
	"/progs/cgo4.go",
	"/progs/defer.go",
	"/progs/defer.out",
	"/progs/defer2.go",
	"/progs/defer2.out",
	"/progs/eff_bytesize.go",
	"/progs/eff_bytesize.out",
	"/progs/eff_qr.go",
	"/progs/eff_sequence.go",
	"/progs/eff_sequence.out",
	"/progs/eff_unused1.go",
	"/progs/eff_unused2.go",
	"/progs/error.go",
	"/progs/error2.go",
	"/progs/error3.go",
	"/progs/error4.go",
	"/progs/go1.go",
	"/progs/gobs1.go",
	"/progs/gobs2.go",
	"/progs/image_draw.go",
	"/progs/image_package1.go",
	"/progs/image_package1.out",
	"/progs/image_package2.go",
	"/progs/image_package2.out",
	"/progs/image_package3.go",
	"/progs/image_package3.out",
	"/progs/image_package4.go",
	"/progs/image_package4.out",
	"/progs/image_package5.go",
	"/progs/image_package5.out",
	"/progs/image_package6.go",
	"/progs/image_package6.out",
	"/progs/interface.go",
	"/progs/interface2.go",
	"/progs/interface2.out",
	"/progs/json1.go",
	"/progs/json2.go",
	"/progs/json2.out",
	"/progs/json3.go",
	"/progs/json4.go",
	"/progs/json5.go",
	"/progs/run",
	"/progs/slices.go",
	"/progs/timeout1.go",
	"/progs/timeout2.go",
	"/progs/update.bash",
}

func TestNode(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	goodCase := staticPath
	badCase := []string{
		"/v5",
		"/v1/base5",
		"/v1/base7",
		"/v1/base9",
		"/v2/base1",
	}

	// add the goodcase
	for _, c := range goodCase {
		rootNode.Add(c, v)
	}

	// check the good cases
	for _, c := range goodCase {
		if _, _, err := rootNode.Get(c); err != nil {
			t.Errorf("expecting to find: %s", c)
		}
	}

	// check the bad cases
	for _, c := range badCase {
		if _, _, err := rootNode.Get(c); !errors.Is(err, ErrPathNotFound) {
			t.Errorf("expecting not found: %s", c)
		}
	}
}

func TestNodeErrDuplicateRoute(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	tests := []struct {
		name        string
		route       string
		expectError error
	}{
		{"Add unique route 1", "/v1/base/2", nil},
		{"Add unique route 2", "/v1/base/2/3", nil},
		{"Add duplicate route", "/v1/base/2", ErrDuplicateRoute},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := rootNode.Add(tt.route, v)

			if tt.expectError == nil {
				if err != nil {
					t.Errorf("unexpected error adding %q: %v", tt.route, err)
				}
			} else {
				if !errors.Is(err, tt.expectError) {
					t.Errorf("expected error %v for route %q, got: %v", tt.expectError, tt.route, err)
				}
			}
		})
	}
}

func TestNodeErrNotRoot(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	validRoutes := []string{
		"/v1/base/2",
		"/v1/base/2/3",
		"/v1/base/3",
	}

	for _, route := range validRoutes {
		t.Run("Add to root: "+route, func(t *testing.T) {
			if err := rootNode.Add(route, v); err != nil {
				t.Errorf("unexpected error adding route %q to root: %v", route, err)
			}
		})
	}

	t.Run("Add to non-root node", func(t *testing.T) {
		child := rootNode.children[0]
		if err := child.Add("/v1/base/2", v); !errors.Is(err, ErrNotRoot) {
			t.Errorf("expected error %v when adding to non-root node, got: %v", ErrNotRoot, err)
		}
	})
}

func TestNodeErrEmptyParam(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	badRoute := "/v1/:/2"
	goodRoute := "/v1/:a/2"

	if err := rootNode.Add(badRoute, v); !errors.Is(err, ErrEmptyParam) {
		t.Errorf("expected error %v when adding no name param node, got: %v", ErrEmptyParam, err)
	}

	if err := rootNode.Add(goodRoute, v); err != nil {
		t.Errorf("unexpected error %v when adding named param node", err)
	}
}

func TestNodeErrEmptyWild(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	badRoute := "/v1/*/2"
	goodRoute := "/v1/*a/2"

	if err := rootNode.Add(badRoute, v); !errors.Is(err, ErrEmptyWild) {
		t.Errorf("expected error %v when adding no name wild node, got: %v", ErrEmptyWild, err)
	}

	if err := rootNode.Add(goodRoute, v); err != nil {
		t.Errorf("unexpected error %v when adding named wild node", err)
	}
}

func TestNodeGetParam(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}
	route := "/v1/:param1/:param2"

	if err := rootNode.Add(route, v); err != nil {
		t.Fatalf("unexpected error adding route %q: %v", route, err)
	}

	h, params, err := rootNode.Get("/v1/vivek/rawat")
	if err != nil {
		t.Fatalf("unexpected error on Get: %v", err)
	}
	if params == nil {
		t.Fatalf("expected params to be non-nil")
	}
	if len(params) != 2 {
		t.Fatalf("expected 2 params, got %d", len(params))
	}
	if got := params[0]; reflect.DeepEqual(got, Param{
		Key:   "Param1",
		Value: "vivek",
	}) {
		t.Errorf("expected param1 to be 'vivek', got %q", got)
	}
	if got := params[1]; reflect.DeepEqual(got, Param{
		Key:   "Param2",
		Value: "rawat",
	}) {
		t.Errorf("expected param2 to be 'rawat', got %q", got)
	}
	if h == nil {
		t.Fatalf("expected handler to be non-nil")
	}
}

func TestNodeType(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	tests := []struct {
		name         string
		route        string
		expectedType nodeType
		expectedPath string
	}{
		{
			name:         "Static",
			route:        "/v1/base1/2",
			expectedType: nodeTypeStatic,
			expectedPath: "/2",
		},
		{
			name:         "Static",
			route:        "/v1/base2/",
			expectedType: nodeTypeStatic,
			expectedPath: "/",
		},
		{
			name:         "Param",
			route:        "/v1/base3/:asdf",
			expectedType: nodeTypeParams,
			expectedPath: "/:asdf",
		},
		{
			name:         "Wildcard",
			route:        "/v1/base4/*sdfasf",
			expectedType: nodeTypeWild,
			expectedPath: "/*sdfasf",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := rootNode.Add(tt.route, v)
			if err != nil {
				t.Fatalf("%s: unexpected error: %v", tt.name, err)
			}

			// Traverse to the leaf node (assuming depth = 3)
			testNode := rootNode.children[0].children[len(rootNode.children[0].children)-1].children[0]

			if testNode.nodeType != tt.expectedType {
				t.Errorf("%s: expected nodeType=%v, got %v", tt.name, tt.expectedType, testNode.nodeType)
			}

			if tt.expectedPath != "" && testNode.path != tt.expectedPath {
				t.Errorf("%s: expected path=%s, got %s", tt.name, tt.expectedPath, testNode.path)
			}
		})
	}
}

func BenchmarkNodeGet(b *testing.B) {
	goodCase := staticPath

	badCase := []string{
		"/v5",
		"/v1/base5",
		"/v1/base7",
		"/v1/base9",
		"/v2/base1",
	}

	allCase := append(goodCase, badCase...)

	v := func(ctx *Ctx) {}
	rootNode := CreateRootNode()
	for _, c := range goodCase {
		rootNode.Add(c, v)
	}

	for i := 0; i < b.N; i++ {
		for j := range allCase {
			rootNode.Get(allCase[j])
		}
	}
}

func TestNodePrint(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	cases := []string{
		"/v3",
		"/v1/base1/sub-base1",
		"/v1/base2/",
		"/v2/base1",
		"/v1/base1/sub-base2",
		"/v1/base1/sub-base3/:name",
		"/v1/base2/sub-base3/*wild",
		"/v1/base2/sub-base3/:name",
		"/v1/base2/sub-base3/static2",
		"/v1/base2/sub-base3/static",
		"/v1/base2/sub-base4/based-4",
	}

	// add the goodcase
	for _, c := range cases {
		err := rootNode.Add(c, v)
		if err != nil {
			t.Fatalf("unexpected err %v when adding url:%s", err, c)
		}
	}

	if testing.Verbose() {
		rootNode.print()
	}
}

func TestNodeSortNodeType(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	cases := []string{
		"/v1/sub-base3/*wild",
		"/v1/sub-base3/:name",
		"/v1/sub-base3/static2",
		"/v1/sub-base3/static",
	}

	// add the goodcase
	for _, c := range cases {
		err := rootNode.Add(c, v)
		if err != nil {
			t.Fatalf("unexpected err %v when adding url:%s", err, c)
		}
	}

	list := []string{
		"/static2",
		"/static",
		"/:name",
		"/*wild",
	}
	c := rootNode.children[0].children[0]

	// len check
	if len(c.children) != len(list) {
		t.Fatalf("unexpected len diff. c:%d  list:%d", len(c.children), len(list))
	}

	for i := range list {
		if c.children[i].path != list[i] {
			t.Fatalf("path name does not match at index:%d for c:%s. expecting: %s", i, c.children[i].path, list[i])
		}
	}
}

func TestNodeRemove(t *testing.T) {
	rootNode := CreateRootNode()

	v := func(ctx *Ctx) {}

	paths := []string{
		"/v1/base2/",
		"/v1/base1/sub-base1",
		"/v1/base1/sub-base2",
		"/v1/base2/sub-base3/static",
		"/v1/base2/sub-base3/static2",
		"/v1/base2/sub-base3/*wild",
		"/v1/base2/sub-base4/based-4",
		"/v2/base1",
		"/v3",
	}

	// add the cases
	add := func() {
		for _, p := range paths {
			err := rootNode.Add(p, v)
			if err != nil {
				t.Fatalf("unexpected err %v when adding url:%s", err, p)
			}
		}
	}

	remove := func() {
		toRemoveRoot := []string{
			"/v1",
			"/v2",
			"/v3",
		}

		// remove path
		for i, removePath := range toRemoveRoot {
			err := rootNode.remove(removePath)
			if err != nil {
				t.Fatalf("unexpected err %v when remove url:%s index:%d", err, removePath, i)
			}
		}

		// check if path is removed
		for i, path := range paths {
			_, _, err := rootNode.Get(path)
			if !errors.Is(err, ErrPathNotFound) {
				t.Fatalf("path should not exist %v when getting url:%s index:%d", err, path, i)
			}
		}
	}

	rest := func() {
		remove()
		add()
	}

	testCases := func(t *testing.T, testName string, rootNode *node, cases []struct {
		url   string
		found bool
	},
	) {
		t.Run(testName, func(t *testing.T) {
			for i, c := range cases {
				_, _, err := rootNode.Get(c.url)
				if !errors.Is(err, ErrPathNotFound) != c.found {
					t.Fatalf("unexpected err %v when getting url:%s index:%d", err, c.url, i)
				}
			}
		})
	}

	removePath := func(t *testing.T, rootNode *node, removePath string) {
		err := rootNode.remove(removePath)
		if err != nil {
			t.Fatalf("unexpected err %v when remove url:%s", err, removePath)
		}
	}

	add()

	removeLastChildCases := []struct {
		url   string
		found bool
	}{
		{"/v1/base1/sub-base1", true},
		{"/v1/base1/sub-base2", true},
		{"/v1/base2/", true},
		{"/v1/base2/sub-base3/wild1", false},
		{"/v1/base2/sub-base3/static", true},
		{"/v1/base2/sub-base3/static2", true},
		{"/v1/base2/sub-base4/based-4", true},
		{"/v2/base1", true},
		{"/v3", true},
	}

	// remove last child
	removePath(t, rootNode, "/v1/base2/sub-base3/*wild")
	testCases(t, "remove last child", rootNode, removeLastChildCases)

	rest()
	removePath(t, rootNode, "/v1/base2")
	removeParent := []struct {
		url   string
		found bool
	}{
		{"/v1/base1/sub-base1", true},
		{"/v1/base1/sub-base2", true},
		{"/v1/base2/", false},
		{"/v1/base2/sub-base3/wild1", false},
		{"/v1/base2/sub-base3/static", false},
		{"/v1/base2/sub-base3/static2", false},
		{"/v1/base2/sub-base4/based-4", false},
		{"/v2/base1", true},
		{"/v3", true},
	}

	testCases(t, "remove parent", rootNode, removeParent)

	rest()
	t.Run("remove unknown", func(t *testing.T) {
		err := rootNode.remove("/v5")
		if !errors.Is(err, ErrPathNotFound) {
			t.Fatalf("expected err %v when removing url:%s err found:%v", ErrPathNotFound, "/v5", err)
		}

		unknownCases := []struct {
			url   string
			found bool
		}{
			{"/v1/base1/sub-base1", true},
			{"/v1/base1/sub-base2", true},
			{"/v1/base2/", true},
			{"/v1/base2/sub-base3/wild1", true},
			{"/v1/base2/sub-base3/static", true},
			{"/v1/base2/sub-base3/static2", true},
			{"/v1/base2/sub-base4/based-4", true},
			{"/v2/base1", true},
			{"/v3", true},
		}
		for i, c := range unknownCases {
			_, _, err := rootNode.Get(c.url)
			if !errors.Is(err, ErrPathNotFound) != c.found {
				t.Fatalf("unexpected err %v when getting url:%s index:%d", err, c.url, i)
			}
		}
	})
}
