# Third-party code

## lib-pq

`lib-pq/` is [`github.com/lib/pq`](https://github.com/lib/pq) v1.12.3, the
PostgreSQL driver for `database/sql`. It is pinned in-tree and wired into
`backend/go.mod` with:

```go
require github.com/lib/pq v1.12.3

replace github.com/lib/pq => ./third_party/lib-pq
```

The driver has no dependencies outside the Go standard library, which keeps the
tree small. Test files, CI configuration and test data were removed from this
copy; `LICENSE`, `README.md` and `CHANGELOG.md` are kept for attribution.

To update, replace the directory contents with a newer release (without
`*_test.go` files) and bump the version in `go.mod`. The backend only needs the
root `pq` package, its `oid`, `pqerror`, `scram` and `internal` packages.

## godotenv

`godotenv/` is [`github.com/joho/godotenv`](https://github.com/joho/godotenv)
v1.5.1, which loads `backend/.env` into the process environment at startup. It
is pinned the same way:

```go
require github.com/joho/godotenv v1.5.1

replace github.com/joho/godotenv => ./third_party/godotenv
```

The module is dependency-free. Only the root package is kept (`godotenv.go`,
`parser.go`) together with `LICENCE` and `README.md`; the `autoload` side-effect
package, tests, fixtures and the `cmd/godotenv` binary are not needed.

Both modules are vendored because the build environment cannot reach the Go
module proxy. Vercel and Docker build from this tree as-is.
