package router

import "errors"

var (
	ErrDuplicateRoute = errors.New("duplicate path not allowed")
	ErrNotRoot        = errors.New("not root")
	// TODO:check of this error
	ErrSegmentAfterWild  = errors.New("segment after wild entry is not allowed")
	ErrHandlerNotFound   = errors.New("handler not found")
	ErrEmptyParam        = errors.New("empty param not allowed")
	ErrEmptyWild         = errors.New("empty wild not allowed")
	ErrPathNotFound      = errors.New("path not found")
	ErrInvalidMethodInit = errors.New("invalid method init")
)
