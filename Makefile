.PHONY: setup dev backend frontend test test-backend typecheck lint build seed docker-up docker-down

setup:
	cd backend && go mod download
	cd frontend && npm ci

dev:
	./scripts/dev.sh

backend:
	cd backend && go run ./cmd/api

frontend:
	cd frontend && npm run dev

test: test-backend typecheck lint

test-backend:
	cd backend && go test ./...

typecheck:
	cd frontend && npm run typecheck

lint:
	cd frontend && npm run lint

build:
	cd backend && go build ./...
	cd frontend && npm run build

# Fills an empty database with the demo catalogue and exits. Reads backend/.env,
# so `make seed` targets your Supabase project without extra flags.
seed:
	cd backend && go run ./cmd/api -seed

docker-up:
	docker compose up --build

docker-down:
	docker compose down
