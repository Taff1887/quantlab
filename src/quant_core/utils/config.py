"""Environment and application configuration via pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Data paths
    data_raw_dir: str = "data/raw"
    data_processed_dir: str = "data/processed"
    data_external_dir: str = "data/external"

    # API keys (add your own as needed)
    alpha_vantage_api_key: str = ""
    polygon_api_key: str = ""
    quandl_api_key: str = ""

    # Logging
    log_level: str = "INFO"


settings = Settings()
