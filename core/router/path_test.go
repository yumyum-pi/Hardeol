package router

import (
	"testing"
)

func TestFindSegmentEnd(t *testing.T) {
	type testCase struct {
		name  string
		path  string
		start int
		want  string
	}

	tests := []testCase{
		{name: "root", path: "/v1", start: 0, want: "/v1"},
		{name: "base", path: "/v1/base", start: 3, want: "/base"},
		{name: "lastChar", path: "/v1/base", start: 8, want: ""},
		{name: "double_slash", path: "/v1//base", start: 3, want: "/"},
		{name: "start_mid", path: "/abcd/bcd/cde", start: 2, want: "bcd"},
	}
	for _, c := range tests {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			e := findSegmentEnd(c.path, c.start)
			s := c.path[c.start:e]
			if s != c.want {
				t.Errorf("expected string:%s got %s for url:%s startIndex:%d", c.want, s, c.path, c.start)
			}
		})
	}
}

func BenchmarkFindSegmentEnd(b *testing.B) {
	type testCase struct {
		name  string
		path  string
		start int
		want  string
	}

	tests := []testCase{
		{name: "root", path: "/v1", start: 0, want: "/v1"},
		{name: "base", path: "/v1/base", start: 3, want: "/base"},
		{name: "lastChar", path: "/v1/base", start: 8, want: ""},
		{name: "double_slash", path: "/v1//base", start: 3, want: "/"},
		{name: "start_mid", path: "/abcd/bcd/cde", start: 2, want: "bcd"},
	}
	l := len(tests)

	var c testCase
	for i := 0; i < b.N; i++ {
		j := i % l
		c = tests[j]
		findSegmentEnd(c.path, c.start)
	}
}

func TestPathSeperatorLoop(t *testing.T) {
	type testCases struct {
		name  string
		input string
		want  []string
	}

	tests := []testCases{
		{name: "root", input: "/v1", want: []string{"/v1"}},
		{name: "base", input: "/v1/base", want: []string{"/v1", "/base"}},
		{name: "wildcard", input: "/v1/base/*askjhf", want: []string{"/v1", "/base", "/*askjhf"}},
		{name: "empty", input: "", want: []string{}},
		{name: "slash_only", input: "/", want: []string{"/"}},
		{name: "trailing_slash", input: "/v1/base/", want: []string{"/v1", "/base", "/"}},
		{name: "deep_path", input: "/api/v2/users", want: []string{"/api", "/v2", "/users"}},
		{name: "param", input: "/v1/base/:id", want: []string{"/v1", "/base", "/:id"}},
		{name: "double_slash", input: "/v1//base", want: []string{"/v1", "/", "/base"}},
		{name: "multiple_slash", input: "/v1///base", want: []string{"/v1", "/", "/", "/base"}},
		{name: "only_wildcard", input: "/*anything", want: []string{"/*anything"}},
		{name: "mixed_wildcard", input: "/v1/*/users", want: []string{"/v1", "/*", "/users"}},
		{name: "query_param", input: "/v1/base?param=1", want: []string{"/v1", "/base?param=1"}},
		{name: "fragment", input: "/v1/base#section", want: []string{"/v1", "/base#section"}},
		{name: "deep_query_param", input: "/v1/base?param=1/user", want: []string{"/v1", "/base?param=1", "/user"}},
		{name: "deep_fragment", input: "/v1/base#section/user", want: []string{"/v1", "/base#section", "/user"}},
		{name: "unicode", input: "/v1/用户", want: []string{"/v1", "/用户"}},
		{name: "unicode", input: "/v1/用户?param=1", want: []string{"/v1", "/用户?param=1"}},
		{name: "unicode", input: "/v1/用户#section", want: []string{"/v1", "/用户#section"}},
		{name: "multiple_root_slashes", input: "////", want: []string{"/"}},
	}

	for _, c := range tests {
		e := 0
		startIndex := 0
		index := -1
		r := ""
		l := len(c.input)
		resLen := len(c.want)
		for e < l {
			e = findSegmentEnd(c.input, startIndex)
			r = c.input[startIndex:e]
			index++
			if index < resLen {
				if c.want[index] != r {
					t.Errorf(
						"%s: findSegmentEnd start:%d = %d; %s; want %s",
						c.name,
						startIndex,
						e,
						r,
						c.want[index],
					)
					break
				}
			}
			startIndex = e
		}

	}
}

func BenchmarkPathSeperatorLoop(b *testing.B) {
	type testCase struct {
		name  string
		input string
		want  []string
	}

	tests := []testCase{
		{name: "root", input: "/v1", want: []string{"/v1"}},
		{name: "base", input: "/v1/base", want: []string{"/v1", "/base"}},
		{name: "wildcard", input: "/v1/base/*askjhf", want: []string{"/v1", "/base", "/*askjhf"}},
		{name: "empty", input: "", want: []string{}},
		{name: "slash_only", input: "/", want: []string{"/"}},
		{name: "trailing_slash", input: "/v1/base/", want: []string{"/v1", "/base", "/"}},
		{name: "deep_path", input: "/api/v2/users", want: []string{"/api", "/v2", "/users"}},
		{name: "param", input: "/v1/base/:id", want: []string{"/v1", "/base", "/:id"}},
		{name: "double_slash", input: "/v1//base", want: []string{"/v1", "/", "/base"}},
		{name: "multiple_slash", input: "/v1///base", want: []string{"/v1", "/", "/", "/base"}},
		{name: "only_wildcard", input: "/*anything", want: []string{"/*anything"}},
		{name: "mixed_wildcard", input: "/v1/*/users", want: []string{"/v1", "/*", "/users"}},
		{name: "query_param", input: "/v1/base?param=1", want: []string{"/v1", "/base?param=1"}},
		{name: "fragment", input: "/v1/base#section", want: []string{"/v1", "/base#section"}},
		{name: "deep_query_param", input: "/v1/base?param=1/user", want: []string{"/v1", "/base?param=1", "/user"}},
		{name: "deep_fragment", input: "/v1/base#section/user", want: []string{"/v1", "/base#section", "/user"}},
		{name: "unicode", input: "/v1/用户", want: []string{"/v1", "/用户"}},
		{name: "unicode", input: "/v1/用户?param=1", want: []string{"/v1", "/用户?param=1"}},
		{name: "unicode", input: "/v1/用户#section", want: []string{"/v1", "/用户#section"}},
		{name: "multiple_root_slashes", input: "////", want: []string{"/"}},
	}

	var c testCase
	l := len(tests)

	for i := 0; i < b.N; i++ {
		c = tests[i%l]
		e := 0
		startIndex := 0
		l := len(c.input)
		for e < l {
			e = findSegmentEnd(c.input, startIndex)
			startIndex = e
		}

	}
}
