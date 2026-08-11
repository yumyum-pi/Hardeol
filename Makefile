.PHONY: build build-server build-ui dev dev-server dev-ui install install-server install-ui clean help

export OTOOLCHAIN=local
export BUILD_DIR=./build
export BUILD_NAME=hardeol_server  

# Default target
all: build

# Build targets
build: build-server build-ui

build-server:
	go build -o ${BUILD_DIR}/${BUILD_NAME} ./cmd/main.go

build-ui:
	cd UI && npm run build

# Development servers
dev-server:
	go tool air

dev-ui:
	cd UI && npm run dev

# Run both dev servers (backend + frontend)
dev:
	@echo "Starting backend and frontend dev servers..."
	@make dev-server & make dev-ui

# Install dependencies
install: install-server install-ui

install-server:
	go mod download

install-ui:
	cd UI && npm install

# Clean build artifacts
clean:
	rm -f hardeol_server
	rm -rf build/
	rm -rf UI/dist/
	rm -rf tmp/

# Help
help:
	@echo "Available targets:"
	@echo "  build          - Build both server and UI"
	@echo "  build-server   - Build the Go server"
	@echo "  build-ui       - Build the frontend UI"
	@echo "  dev            - Run both dev servers (backend + frontend)"
	@echo "  dev-server     - Run the Go dev server with hot-reload (air)"
	@echo "  dev-ui         - Run the frontend dev server (vite)"
	@echo "  install        - Install all dependencies"
	@echo "  install-server - Install Go dependencies"
	@echo "  install-ui     - Install UI dependencies"
	@echo "  clean          - Remove build artifacts"
