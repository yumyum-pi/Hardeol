package utils

import (
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
