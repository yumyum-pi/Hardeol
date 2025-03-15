package auth

import (
	"yumyum-pi/Hardeol/core/collections"
	"yumyum-pi/Hardeol/core/fields"
)

const userTableName = "user"

func Init() {
	// create a collection for user

	userName := fields.TEXT{}
	userName.SetName("userName")

	pass := fields.TEXT{}
	pass.SetName("pass")

	c := collections.New(userTableName)
	c.AddField(&userName)
	c.AddField(&pass)
}
