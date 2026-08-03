.PHONY: build build-server build-ui dev dev-server dev-ui install install-server install-ui clean help

# Go environment for macOS 10.15 compatibility
export GOROOT=/opt/local/lib/go-1.22
export GOTOOLCHAIN=local
GO=$(GOROOT)/bin/go

# Default target
all: build

# Build targets
build: build-server build-ui

build-server:
	$(GO) build -o ./hardeol_server ./cmd/main.go

build-ui:
	cd UI && npm run build

# Development servers
dev-server:
	air

dev-ui:
	cd UI && npm run dev

# Run both dev servers (backend + frontend)
dev:
	@echo "Starting backend and frontend dev servers..."
	@make dev-server & make dev-ui

# Install dependencies
install: install-server install-ui

install-server:
	$(GO) mod download

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
