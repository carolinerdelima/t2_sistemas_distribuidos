from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/db"
    processing_delay_min: float = 0.1
    processing_delay_max: float = 0.5
    metrics_port: int = 9103
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
