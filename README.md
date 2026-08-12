# Hardeol

Minimal backend API builder for small projects. Define collections (schemas) and Hardeol generates the CRUD REST API, table/form views, and validation for you — backed by a Go server with a SolidJS admin UI.

## Tech Stack

- **Server:** Go, [GORM](https://gorm.io) (SQLite driver), custom HTTP router
- **UI:** SolidJS, Vite, TypeScript
- **Dev tooling:** [air](https://github.com/air-verse/air) for Go hot-reload

## Project Structure

```
cmd/                 Server entrypoint
core/
  auth/               Authentication & authorization (planned, see core/auth/README.md)
  collections/         Collection schema, CRUD routes, table/form views, validation profiles
  database/            GORM/SQLite setup and migration helpers
  logger/              Logging middleware
  router/              Custom dynamic HTTP router (see core/router/README.md)
  validation/           Expression-based field validation
utils/                Shared helpers (case conversion, random values)
UI/                   SolidJS admin interface (collection & schema builder, views, validation)
```

## Getting Started

Requires Go 1.22+ and Node.js for the UI. The Makefile expects Go installed at `/opt/local/lib/go-1.22`; adjust `GOROOT` in the `Makefile` if yours lives elsewhere.

```bash
# install server + UI dependencies
make install

# run backend (hot-reload via air) and frontend dev servers together
make dev

# or run them separately
make dev-server
make dev-ui

# build production binaries
make build            # server + UI
make build-server     # Go binary -> ./build/hardeol_server
make build-ui         # UI -> UI/dist

# remove build artifacts
make clean
```

Run `make help` to list all available targets.

## Features

- **Collections** — define schemas with typed fields, create/read/update/delete both the collection definition and its records, with dynamic REST routes generated automatically.
- **Table & Form Views** — customizable, saved views for browsing and editing collection data, including sections and a dedicated `TABLE` field type.
- **Validation** — a 3-level validation system with expression-based rules per field/profile.
- **Client-side routing** — SolidJS UI with routing for collections, schema builder, and view management.
- **Authentication & Authorization** — planned; see [core/auth/README.md](core/auth/README.md) for the phased roadmap (registration, login, RBAC/ABAC, and beyond).

## Roadmap

- [x] Create collection
- [x] Create web server
- [x] Create CRUD endpoints
- [x] Table and form views
- [x] 3-level validation system
- [ ] User authentication (sign up, login, token verification)
- [ ] Authorization (permissions, roles)

---

Hardeol is one of the major peaks of the Kumaon Himalaya.

TODO: Fix the router
