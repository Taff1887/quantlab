"""Smoke tests to verify quant_core is importable and version is set."""

import quant_core


def test_version_is_set():
    assert quant_core.__version__ == "0.1.0"


def test_submodules_importable():
    from quant_core import data, features, models, portfolio, risk, utils

    assert all(m is not None for m in [data, features, models, portfolio, risk, utils])
