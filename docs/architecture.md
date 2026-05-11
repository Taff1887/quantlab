# Architecture Decision Records

## ADR-001: Monorepo structure

**Decision**: All quant work lives in a single repository.

**Reason**: Data loaders, risk models, and portfolio utilities are shared across strategies. A monorepo makes it trivial to import `quant_core` from any application without publishing a package. As the repo matures, applications can be broken out if needed.

## ADR-002: src layout

**Decision**: Production code lives under `src/quant_core/`, not at the repo root.

**Reason**: Python's default import resolution means code at the repo root can be imported accidentally without installation. The `src/` layout forces explicit packaging and catches import errors early.

## ADR-003: Data is never committed to git

**Decision**: All directories under `data/` are gitignored.

**Reason**: Financial data is often licensed, large, and changes frequently. Use an external data store (S3, local NAS, DVC) and document how to acquire data in each module's README.

## ADR-004: uv for package management

**Decision**: Use `uv` instead of `pip`/`poetry`/`conda`.

**Reason**: `uv` is an order of magnitude faster than pip, has a lockfile for reproducibility, supports optional dependency groups, and is increasingly the community standard for new Python projects.

## ADR-005: Optional dependency groups

**Decision**: Heavy dependencies (backtest engines, ML frameworks, Dash) are optional extras.

**Reason**: Not every environment needs every library. A lightweight data collection job shouldn't pull in scikit-learn. Install only what each environment needs.
