package database

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

var DatabasePath = "/Users/vivekrawat/project/Hardeol/database/test.db"

// Initialize GORM DB connection
func InitSqlite() {
	var err error
	db, err = gorm.Open(sqlite.Open(DatabasePath), &gorm.Config{
		TranslateError: true,
	})
	if err != nil {
		panic("failed to connect database")
	}
}

func Get() *gorm.DB {
	return db
}

func Migrate(dst ...any) {
	err := db.AutoMigrate(dst...)
	if err != nil {
		panic("failed to migrate")
	}
}
