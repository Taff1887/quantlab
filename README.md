# QuantLab

A professional, long-term quantitative research and systematic trading platform.

## Architecture

```
quantlab/
├── applications/          # Self-contained trading apps / signal generators
│   └── first_app/         # Placeholder for first application
├── src/
│   └── quant_core/        # Shared library — data, features, models, risk, portfolio
│       ├── data/          # Data loaders, normalisers, universe definitions
│       ├── features/      # Factor construction, signal engineering
│       ├── models/        # Statistical & ML model wrappers
│       ├── portfolio/     # Optimisation, weighting, rebalancing
│       ├── risk/          # Risk analytics, drawdown, VaR, stress tests
│       └── utils/         # Dates, logging, config helpers
├── research/
│   ├── notebooks/         # Exploratory analysis (never production code)
│   ├── papers/            # Literature & reference papers
│   └── reports/           # Structured research outputs
├── strategies/            # Strategy definitions and parameters
├── backtests/
│   ├── configs/           # Backtest configuration files
│   └── results/           # Output artefacts (gitignored by default)
├── data/
│   ├── raw/               # Immutable source data (gitignored)
│   ├── processed/         # Transformed, reproducible outputs (gitignored)
│   └── external/          # Third-party vendor data (gitignored)
├── tests/
│   ├── unit/              # Fast, isolated unit tests
│   └── integration/       # End-to-end pipeline tests
├── infrastructure/
│   ├── configs/           # Environment / deployment configs
│   └── scripts/           # Automation scripts
└── docs/                  # Architecture decisions, runbooks
```

## Quick Start

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install core dependencies
uv sync

# Install all optional dependency groups
uv sync --extra all

# Activate environment (Windows)
.venv\Scripts\activate

# Run tests
uv run pytest

# Start JupyterLab
uv run jupyter lab
```

## Key Library Groups

| Group | Purpose | Install |
|---|---|---|
| `quant` | statsmodels, arch, pyportfolioopt, empyrical, quantstats | `uv sync --extra quant` |
| `ml` | scikit-learn, lightgbm, xgboost, shap | `uv sync --extra ml` |
| `backtest` | vectorbt, zipline-reloaded | `uv sync --extra backtest` |
| `viz` | matplotlib, seaborn, plotly, dash | `uv sync --extra viz` |
| `research` | jupyterlab, ipywidgets | `uv sync --extra research` |
| `dev` | pytest, ruff, mypy, pre-commit | `uv sync --extra dev` |
| `all` | Everything above | `uv sync --extra all` |

## Development Standards

- **Formatting / linting**: `ruff` — `uv run ruff check . && uv run ruff format .`
- **Type checking**: `mypy` — `uv run mypy src/`
- **Tests**: `pytest` — `uv run pytest`
- **Data**: never commit data files; use the `data/` structure with descriptive READMEs
- **Notebooks**: exploratory only; production logic lives in `src/quant_core/`
