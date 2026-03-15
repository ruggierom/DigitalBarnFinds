from __future__ import annotations

from functools import lru_cache
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = ".env" if os.getenv("DBF_APP_ENV", "development") == "development" else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_prefix="DBF_")

    app_env: str = "development"
    database_url: str
    admin_token: str
    allowed_origins: str = "http://localhost:3000"
    barchetta_base_url: str = "http://www.barchetta.cc"
    barchetta_discovery_paths: str = (
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-boano-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-ellena-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-pf-coupe-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-lwb-california-spider-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-swb-california-spider-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-swb-berlinetta-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-tdf-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gto-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-europa-gt-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-testa-rossa-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/275-gtb-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/275-gts-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/330-gt-22-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/330-gts-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/365-gtb4-daytona-index/index.html"
    )
    user_agent_override: str | None = None
    respectful_user_agent: str = (
        "DigitalBarnFindsBot/1.0"
    )
    request_delay_seconds: float = 2.0
    request_lab_allowed_hosts: str = "localhost,127.0.0.1"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin]

    @property
    def effective_user_agent(self) -> str:
        return self.user_agent_override or self.respectful_user_agent

    @property
    def barchetta_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.barchetta_discovery_paths.split(",") if path.strip()]

    @property
    def allowed_request_lab_hosts(self) -> list[str]:
        return [host.strip().lower() for host in self.request_lab_allowed_hosts.split(",") if host.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
