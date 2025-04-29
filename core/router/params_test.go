package router

import "testing"

func TestExtractParamWithoutQuery(t *testing.T) {
	tests := []struct {
		name     string
		nodePath string
		url      string
		start    int
		end      int
		expected Param
	}{
		{
			name:     "simple param extraction",
			nodePath: "/:username",
			url:      "/john",
			start:    0,
			end:      5,
			expected: Param{Key: "username", Value: "john"},
		},
		{
			name:     "param with query string",
			nodePath: "/:id",
			url:      "/12345?sort=asc",
			start:    0,
			end:      len("/12345?sort=asc"),
			expected: Param{Key: "id", Value: "12345"},
		},
		{
			name:     "param without leading slash",
			nodePath: "/:project",
			url:      "/golang",
			start:    0,
			end:      7,
			expected: Param{Key: "project", Value: "golang"},
		},
	}

	for i, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			n := &node{path: tt.nodePath}
			result := extractParamWithoutQuery(n, tt.url, tt.start, tt.end)

			if result.Key != tt.expected.Key || result.Value != tt.expected.Value {
				t.Errorf("expected %+v, got %+v, index:%d", tt.expected, result, i)
			}
		})
	}
}
