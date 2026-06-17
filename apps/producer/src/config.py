from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    rabbitmq_host: str = "localhost"
    rabbitmq_user: str = "guest"
    rabbitmq_pass: str = "guest"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/db"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
