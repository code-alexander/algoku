set working-directory := "projects/algoku-frontend"

# default shows the list of recipes when you just run `just`
default:
    @just --list

# dev loops
dev:
    npm run dev

build:
    npm run build

preview:
    npm run preview

# formatting / linting / typechecking
format:
    npm run format

format-check:
    npm run format-check

lint:
    npm run lint

tc:
    npm run typecheck

check:
    just format-check && just lint && just tc

# unit + e2e
unit filter="":
    npm run unit-test -- {{filter}}

coverage:
    npm run coverage

e2e filter="":
    npm run playwright:test -- --grep="{{filter}}"

test:
    just unit && just e2e

ci:
    just check && just test

# -----------------------------------------------------------------------------
# Contract-side commands (Python / poetry)
# -----------------------------------------------------------------------------

[working-directory: 'projects/algoku-contracts']
contracts-build:
    algokit project run build

[working-directory: 'projects/algoku-contracts']
contracts-test:
    poetry run pytest tests/ -v

[working-directory: 'projects/algoku-contracts']
contracts-bootstrap:
    algokit project bootstrap all

# LocalNet sandbox management
localnet-start:
    algokit localnet start

localnet-stop:
    algokit localnet stop

localnet-reset:
    algokit localnet reset
