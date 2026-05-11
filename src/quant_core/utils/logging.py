"""Centralised logging configuration using loguru."""

import sys
from loguru import logger


def configure_logging(level: str = "INFO") -> None:
    logger.remove()
    logger.add(
        sys.stderr,
        level=level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level:<8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> — <level>{message}</level>",
        colorize=True,
    )
    logger.add(
        "logs/quantlab.log",
        level="DEBUG",
        rotation="10 MB",
        retention="30 days",
        compression="gz",
    )
