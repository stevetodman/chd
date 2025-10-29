.PHONY: help dev build preview test lint lint-fix typecheck seed-invite seed-full migrate migrate-dry verify-analytics docker-dev-up docker-dev-down docker-dev-logs

DEV_COMPOSE_FILE := docker-compose.dev.yml
DEV_COMPOSE_ENV := chd-qbank/.env.development

define run_dev_compose
@if [ -f $(DEV_COMPOSE_ENV) ]; then \
docker compose --env-file $(DEV_COMPOSE_ENV) -f $(DEV_COMPOSE_FILE) $(1); \
else \
docker compose -f $(DEV_COMPOSE_FILE) $(1); \
fi
endef

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
        @echo "  make docker-dev-up      Build and start the Docker dev stack"
        @echo "  make docker-dev-down    Stop the Docker dev stack and remove containers"
        @echo "  make docker-dev-logs    Tail logs from the Docker dev stack"

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
	npm run --prefix chd-qbank lint -- --fix

typecheck:
	npm run --prefix chd-qbank typecheck

seed-invite:
	npm run --prefix chd-qbank seed:invite

seed-full:
	npm run --prefix chd-qbank seed:full

migrate:
	npm run --prefix chd-qbank migrate:qbank

migrate-dry:
	npm run --prefix chd-qbank migrate:qbank:dry

verify-analytics:
        npm run --prefix chd-qbank verify:analytics:heatmap

docker-dev-up:
	$(call run_dev_compose,up --build)

docker-dev-down:
	$(call run_dev_compose,down --remove-orphans)

docker-dev-logs:
	$(call run_dev_compose,logs -f)

