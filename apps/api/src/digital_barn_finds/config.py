from __future__ import annotations

from functools import lru_cache
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


RUNNING_ON_AZURE = bool(os.getenv("WEBSITE_SITE_NAME"))
ENV_FILE = ".env" if os.getenv("DBF_APP_ENV", "development") == "development" and not RUNNING_ON_AZURE else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_prefix="DBF_")

    app_env: str = "development"
    database_url: str
    admin_token: str
    public_base_url: str | None = None
    allowed_origins: str = "http://localhost:3000"
    artcurial_base_url: str = "https://www.artcurial.com"
    artcurial_discovery_paths: str = "/en/sales/6144"
    artcurial_fallback_detail_urls: str = (
        "https://www.artcurial.com/en/sales/6144/lots/1-a,"
        "https://www.artcurial.com/en/sales/6144/lots/310-a"
    )
    artcurial_request_timeout_seconds: float = 20.0
    artcurial_max_attempts: int = 2
    barchetta_base_url: str = "http://www.barchetta.cc"
    barchetta_discovery_paths: str = (
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index/"
        "model-summary/250-gt-boano-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index-60-64/"
        "model-summary/250-gt-l-part-1-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index-60-64/"
        "model-summary/275-gtb-part-1-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index-60-64/"
        "model-summary/275-gtb-part-2-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index-60-64/"
        "model-summary/275-gtb-part-3-index/index.html,"
        "/all.ferraris/by-serial-number/ferrari-by-serial-number/model-index-72-89/"
        "model-summary/bb-512-lm-index/index.html,"
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
    barchetta_fallback_detail_urls: str = (
        "http://www.barchetta.cc/english/All.Ferraris/Detail/5161.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6003.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6357.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6437.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6449.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6457.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6471.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6489.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6505.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6507.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6517.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6521.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6527.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6529.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6543.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6557.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6563.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6569.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6575.275GTB.htm,"
        "http://www.barchetta.cc/english/All.Ferraris/Detail/6585.275GTB.htm"
    )
    user_agent_override: str | None = None
    respectful_user_agent: str = (
        "DigitalBarnFindsBot/1.0"
    )
    request_delay_seconds: float = 2.0
    barchetta_request_timeout_seconds: float = 20.0
    barchetta_max_attempts: int = 2
    barchetta_max_media_per_car: int = 60
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
    def artcurial_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.artcurial_discovery_paths.split(",") if path.strip()]

    @property
    def artcurial_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.artcurial_fallback_detail_urls.split(",") if url.strip()]

    @property
    def barchetta_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.barchetta_fallback_detail_urls.split(",") if url.strip()]

    @property
    def allowed_request_lab_hosts(self) -> list[str]:
        return [host.strip().lower() for host in self.request_lab_allowed_hosts.split(",") if host.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
