package logger

import (
	"log"
	"os"
)

var (
	Info    = log.New(os.Stdout, "INFO: ", log.Ldate|log.Ltime)
	Warning = log.New(os.Stdout, "WARNING: ", log.Ldate|log.Ltime|log.Lshortfile)
	Error   = log.New(os.Stderr, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)
)
