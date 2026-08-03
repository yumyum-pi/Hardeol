package utils

import "math/rand/v2"

const alphaNo string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

var alphaNoLen = len(alphaNo)

func RandName(length int) []byte {
	b := make([]byte, length)

	for i := range b {
		j := rand.IntN(alphaNoLen)
		b[i] = alphaNo[j]
	}

	return b
}
