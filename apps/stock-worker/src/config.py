from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/db"
    processing_delay_min: float = 0.2
    processing_delay_max: float = 1.0
    metrics_port: int = 9102
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
