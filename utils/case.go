package utils

import (
	"strings"
	"unsafe"
)

func ToSnake(camel string) string {
	if camel == "" {
		return ""
	}
	// Allocate a byte slice with extra capacity
	buf := make([]byte, 0, len(camel)+5)
	prevLower := false
	diff := 'A' - 'a'
	for i, r := range camel {
		if r >= 'A' && r <= 'Z' {
			if prevLower || (i > 0 && i < len(camel)-1 && (camel[i+1] >= 'a')) {
				buf = append(buf, '_')
			}

			r -= diff
			prevLower = false
		} else {
			prevLower = true
		}

		buf = append(buf, byte(r))
	}
	// Use unsafe conversion to avoid copying the byte slice
	return string(buf)
}

func ToSnakeUnsafe(camel string) string {
	if camel == "" {
		return ""
	}
	// Allocate a byte slice with extra capacity
	buf := make([]byte, 0, len(camel)+5)
	prevLower := false

	diff := 'A' - 'a'
	for i, r := range camel {
		if r >= 'A' && r <= 'Z' {
			if prevLower || (i > 0 && i < len(camel)-1 && (camel[i+1] >= 'a')) {
				buf = append(buf, '_')
			}

			r -= diff
			prevLower = false
		} else {
			prevLower = true
		}

		buf = append(buf, byte(r))
	}
	// Use unsafe conversion to avoid copying the byte slice
	return *(*string)(unsafe.Pointer(&buf))
}

func ToCamelCase(input string) string {
	if input == "" {
		return ""
	}
	parts := strings.Split(input, "_")
	for i, part := range parts {
		if len(part) > 0 {
			parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
		}
	}
	return strings.Join(parts, "")
}

const diff byte = 32

func ToCamelCase2(input string) string {
	if input == "" {
		return ""
	}

	l := len(input)
	s := make([]byte, 0, l)
	underscore := false
	j := 0
	for i := 0; i < l; i++ {
		ic := input[i]
		if ic == '_' {
			underscore = true
			continue
		}

		if underscore {
			s[j] = ic - diff
			underscore = false
		} else {
			s[j] = ic
		}
		j += 1

	}
	return string(s)
}

func CapFirstChar(input string) string {
	// check if the input is empty
	if input == "" {
		return input
	}
	// convert to runes for unicode safty
	r := []rune(input)
	// check if lowercase
	if r[0] >= 'a' && r[0] <= 'z' {
		// convert to uppercase
		r[0] -= 32
		return string(r)
	}

	return input
}
