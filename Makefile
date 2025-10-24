.PHONY: help dev build preview test lint lint-fix typecheck seed-invite seed-full migrate migrate-dry verify-analytics docs

help:
	@echo "Available commands:"
	@echo "  make dev                Start the development server"
	@echo "  make build              Build the project"
	@echo "  make preview            Preview the production build"
	@echo "  make test               Run the test suite"
	@echo "  make lint               Run the linter"
	@echo "  make lint-fix           Run the linter with automatic fixes"
	@echo "  make typecheck          Run the type checker"
	@echo "  make seed-invite        Seed invite data"
	@echo "  make seed-full          Run the full database seed"
	@echo "  make migrate            Run database migrations"
	@echo "  make migrate-dry        Run migrations in dry-run mode"
	@echo "  make verify-analytics   Verify analytics setup"
	@echo "  make docs               Build documentation"

dev:
	npm run --prefix chd-qbank dev

build:
	npm run --prefix chd-qbank build

preview:
	npm run --prefix chd-qbank preview

test:
	npm run --prefix chd-qbank test

lint:
	npm run --prefix chd-qbank lint

lint-fix:
	npm run --prefix chd-qbank lint-fix

typecheck:
	npm run --prefix chd-qbank typecheck

seed-invite:
	npm run --prefix chd-qbank seed:invite

seed-full:
	npm run --prefix chd-qbank seed:full

migrate:
	npm run --prefix chd-qbank migrate

migrate-dry:
	npm run --prefix chd-qbank migrate:dry

verify-analytics:
	npm run --prefix chd-qbank verify:analytics

docs:
	npm run --prefix chd-qbank docs

