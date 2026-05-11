# first_app

Placeholder for the first QuantLab application.

Replace this README when the app's purpose is defined.

## Structure (suggested)

```
first_app/
├── __init__.py
├── main.py          # Entry point / CLI
├── config.py        # App-specific settings
├── signals.py       # Alpha signal generation
├── execution.py     # Order / execution logic
└── tests/
    └── test_signals.py
```

## How this app relates to quant_core

This app **imports** from `quant_core` for shared functionality
(data loading, risk metrics, portfolio math) and keeps only
app-specific logic here.
