package validation

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/expr-lang/expr"
)

// ExpressionEnv provides the environment for expression evaluation
type ExpressionEnv struct {
	Data  map[string]interface{}
	Value interface{} // Current field value for field-level expressions
}

// Field returns a field value from the data
func (e ExpressionEnv) Field(name string) interface{} {
	if val, ok := e.Data[name]; ok {
		return val
	}
	return nil
}

// IsEmpty checks if a value is empty
func (e ExpressionEnv) IsEmpty(v interface{}) bool {
	if v == nil {
		return true
	}
	switch val := v.(type) {
	case string:
		return strings.TrimSpace(val) == ""
	case []interface{}:
		return len(val) == 0
	case map[string]interface{}:
		return len(val) == 0
	case int, int64, int32:
		return false // numbers are never "empty"
	case float64, float32:
		return false
	case bool:
		return false
	default:
		return false
	}
}

// Len returns the length of a value
func (e ExpressionEnv) Len(v interface{}) int {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case string:
		return len(val)
	case []interface{}:
		return len(val)
	case map[string]interface{}:
		return len(val)
	default:
		return 0
	}
}

// Contains checks if a string contains a substring
func (e ExpressionEnv) Contains(s, substr interface{}) bool {
	str, ok1 := s.(string)
	sub, ok2 := substr.(string)
	if !ok1 || !ok2 {
		return false
	}
	return strings.Contains(str, sub)
}

// StartsWith checks if a string starts with a prefix
func (e ExpressionEnv) StartsWith(s, prefix interface{}) bool {
	str, ok1 := s.(string)
	pre, ok2 := prefix.(string)
	if !ok1 || !ok2 {
		return false
	}
	return strings.HasPrefix(str, pre)
}

// EndsWith checks if a string ends with a suffix
func (e ExpressionEnv) EndsWith(s, suffix interface{}) bool {
	str, ok1 := s.(string)
	suf, ok2 := suffix.(string)
	if !ok1 || !ok2 {
		return false
	}
	return strings.HasSuffix(str, suf)
}

// Matches checks if a string matches a regex pattern
func (e ExpressionEnv) Matches(s, pattern interface{}) bool {
	str, ok1 := s.(string)
	pat, ok2 := pattern.(string)
	if !ok1 || !ok2 {
		return false
	}
	re, err := regexp.Compile(pat)
	if err != nil {
		return false
	}
	return re.MatchString(str)
}

// Now returns the current time as a string
func (e ExpressionEnv) Now() string {
	return time.Now().Format("2006-01-02")
}

// EvaluateExpression evaluates an expression string against the provided data
func EvaluateExpression(expression string, data map[string]interface{}, currentValue interface{}) (bool, error) {
	env := ExpressionEnv{
		Data:  data,
		Value: currentValue,
	}

	// Define the expression options with environment functions
	options := []expr.Option{
		expr.Env(env),
		expr.AsBool(),
	}

	program, err := expr.Compile(expression, options...)
	if err != nil {
		return false, fmt.Errorf("failed to compile expression: %w", err)
	}

	result, err := expr.Run(program, env)
	if err != nil {
		return false, fmt.Errorf("failed to evaluate expression: %w", err)
	}

	boolResult, ok := result.(bool)
	if !ok {
		return false, fmt.Errorf("expression did not return a boolean")
	}

	return boolResult, nil
}

// ParseDateExpression parses date expressions like "now", "now+7d", "now-1m"
func ParseDateExpression(expr string) (time.Time, error) {
	expr = strings.TrimSpace(strings.ToLower(expr))

	// Handle "now"
	if expr == "now" {
		return time.Now(), nil
	}

	// Handle relative dates like "now+7d", "now-1m", "now+1y"
	if strings.HasPrefix(expr, "now") {
		offset := strings.TrimPrefix(expr, "now")
		if len(offset) < 2 {
			return time.Time{}, fmt.Errorf("invalid date expression: %s", expr)
		}

		// Parse the sign
		sign := 1
		if offset[0] == '-' {
			sign = -1
			offset = offset[1:]
		} else if offset[0] == '+' {
			offset = offset[1:]
		}

		// Parse the number and unit
		unit := offset[len(offset)-1]
		numStr := offset[:len(offset)-1]
		var num int
		_, err := fmt.Sscanf(numStr, "%d", &num)
		if err != nil {
			return time.Time{}, fmt.Errorf("invalid date expression: %s", expr)
		}

		num *= sign

		now := time.Now()
		switch unit {
		case 'd':
			return now.AddDate(0, 0, num), nil
		case 'w':
			return now.AddDate(0, 0, num*7), nil
		case 'm':
			return now.AddDate(0, num, 0), nil
		case 'y':
			return now.AddDate(num, 0, 0), nil
		default:
			return time.Time{}, fmt.Errorf("invalid date unit in expression: %s", expr)
		}
	}

	// Try parsing as a standard date
	layouts := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05",
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, expr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("could not parse date expression: %s", expr)
}
