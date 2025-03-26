package utils_test

import (
	"testing"
	"yumyum-pi/Hardeol/utils"
)

var tests = []struct {
	input    string
	expected string
}{
	{"CamelCase", "camel_case"},
	{"camelCase", "camel_case"},
	{"HTTPRequest", "http_request"},
	{"JSONParser", "json_parser"},
	{"helloWorld", "hello_world"},
	{"HelloWorld", "hello_world"},
	// {"snake_case", "snake_case"}, // Already snake case
	{"HTTPRequestJSON", "http_request_json"},
	{"ABTest", "ab_test"}, // Edge case: multiple capitals
	{"A", "a"},            // Single letter
	{"a", "a"},            // Single lowercase letter
	{"CamelC", "camel_c"}, // Capital letter at the end
	{"CCamel", "c_camel"}, // Capital letter at the start
	{"CamelIDCase", "camel_id_case"},
	{
		"ThisIsAVeryLongCamelCaseStringWithMultipleUppercaseLettersAndSomeNumbers123",
		"this_is_a_very_long_camel_case_string_with_multiple_uppercase_letters_and_some_numbers123",
	},
}

func TestToSnake(t *testing.T) {
	for _, tt := range tests {
		result := utils.ToSnake(tt.input)
		if result != tt.expected {
			t.Errorf("ToSnake(%q) = %q; want %q", tt.input, result, tt.expected)
		}
	}
}

// BenchmarkToSnake measures the performance of ToSnake for multiple inputs in a single run.
func BenchmarkToSnake(b *testing.B) {
	b.ResetTimer() // Ensures setup time is not included in the benchmark
	testLen := len(tests)
	count := 0
	for i := 0; i < b.N; i++ {
		utils.ToSnake(tests[count].input)
		count++
		if count >= testLen {
			count = 0
		}
	}
}

func TestToSnakeUnsafe(t *testing.T) {
	for _, tt := range tests {
		result := utils.ToSnakeUnsafe(tt.input)
		if result != tt.expected {
			t.Errorf("ToSnake(%q) = %q; want %q", tt.input, result, tt.expected)
		}
	}
}

// BenchmarkToSnake measures the performance of ToSnake for multiple inputs in a single run.
func BenchmarkToSnakeUnsafe(b *testing.B) {
	b.ResetTimer() // Ensures setup time is not included in the benchmark
	testLen := len(tests)
	count := 0
	for i := 0; i < b.N; i++ {
		utils.ToSnakeUnsafe(tests[count].input)
		count++
		if count >= testLen {
			count = 0
		}
	}
}

func TestToCamelCase(t *testing.T) {
	for _, tt := range tests {
		input := tt.expected
		expected := tt.input
		result := utils.ToCamelCase(input)
		if result != expected {
			t.Errorf("ToSnake(%q) = %q; want %q", input, result, expected)
		}
	}
}
