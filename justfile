# Soralia Village - Just Commands

# Default recipe - show help
default:
    @just --list

# Development
dev:
    pnpm dev

dev_turbo:
    pnpm dev --turbo

start:
    pnpm start

# Build
build:
    pnpm build

build_analyze:
    ANALYZE=true pnpm build

# Database
db_push:
    pnpm db:push

db_seed:
    pnpm db:seed

db_seed_village:
    pnpm db:seed:village

db_seed_solaris:
    pnpm db:seed:solaris

db_check:
    pnpm db:check

db_studio:
    pnpm db:studio

db_studio_drizzle:
    pnpm db:studio:drizzle

db_generate:
    prisma generate

# API
api_generate:
    pnpm api:generate

api_lint:
    pnpm api:lint

api_ci:
    pnpm api:ci

# FSD Architecture
fsd_check:
    pnpm fsd:check

fsd_graph:
    pnpm fsd:graph

fsd_graph_detailed:
    pnpm fsd:graph:detailed

# Issue tracking
bd_ready:
    bd ready

bd_list:
    bd list

bd_sync:
    bd sync

# Quality gates
lint:
    pnpm lint

lint_report:
    -pnpm lint > lint_report.md 2>&1

typecheck:
    pnpm typecheck

format:
    pnpm format

check: lint typecheck build

# Testing
test:
    pnpm test

test_run:
    pnpm test:run

test_coverage:
    pnpm test:coverage

# Clean
clean:
    rm -rf .next
    rm -rf node_modules/.cache

clean_all: clean
    rm -rf node_modules
    rm -rf .turbo

# Report

tree:
    tree -I node_modules > tree.md 2>&1

# Code

code:
    opencode -c

apacheflush:
    sudo systemctl stop apache2 && sudo resolvectl flush-caches
