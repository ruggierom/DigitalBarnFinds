from __future__ import annotations

from functools import lru_cache
import os
from pathlib import Path

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
    media_storage_mode: str = "filesystem"
    media_local_root: str = "media"
    media_storage_connection_string: str | None = None
    media_storage_container: str = "car-media"
    media_download_timeout_seconds: float = 20.0
    media_download_max_bytes: int = 15_000_000
    max_media_per_car: int = 10
    search_request_timeout_seconds: float = 20.0
    google_search_api_key: str | None = None
    google_search_cx: str | None = None
    research_request_timeout_seconds: float = 20.0
    enrichment_candidate_limit_per_query: int = 5
    aguttes_base_url: str = "https://www.aguttes.com"
    aguttes_discovery_paths: str = "/catalogue/134922"
    aguttes_fallback_detail_urls: str = (
        "https://www.aguttes.com/lot/147038/24510161,"
        "https://www.aguttes.com/lot/134922/21969237-1953-jaguar-xk-120-cabriolet-carte-grise-francaise-chassis"
    )
    aguttes_request_timeout_seconds: float = 20.0
    aguttes_max_attempts: int = 2
    artcurial_base_url: str = "https://www.artcurial.com"
    artcurial_discovery_paths: str = "/en/sales/6144"
    artcurial_fallback_detail_urls: str = (
        "https://www.artcurial.com/en/sales/6144/lots/1-a,"
        "https://www.artcurial.com/en/sales/6144/lots/310-a"
    )
    artcurial_request_timeout_seconds: float = 20.0
    artcurial_max_attempts: int = 2
    bat_base_url: str = "https://bringatrailer.com"
    bat_discovery_paths: str = "/auctions/results/"
    bat_fallback_detail_urls: str = (
        "https://bringatrailer.com/listing/1991-ferrari-348-27/,"
        "https://bringatrailer.com/listing/1994-ferrari-348-38/"
    )
    bat_request_timeout_seconds: float = 20.0
    bat_max_attempts: int = 2
    gooding_base_url: str = "https://www.goodingco.com"
    gooding_discovery_paths: str = "/auction/european-sporting-historic-collection/"
    gooding_fallback_detail_urls: str = (
        "https://www.goodingco.com/lot/1934-packard-eight-1101-convertible-sedan,"
        "https://www.goodingco.com/lot/1967-ferrari-275-gtb-4/,"
        "https://www.goodingco.com/lot/1963-aston-martin-db5-convertible/,"
        "https://www.goodingco.com/lot/1961-aston-martin-db4-gt/,"
        "https://www.goodingco.com/lot/1963-mercedes-benz-300-sl-roadster/,"
        "https://www.goodingco.com/lot/1930-bentley-4-1-2-litre-sports-tourer/"
    )
    gooding_request_timeout_seconds: float = 20.0
    gooding_max_attempts: int = 2
    historics_base_url: str = "https://www.historics.co.uk"
    historics_discovery_paths: str = "/auction/search/?au=55&g=1&pn=5&pp=24&sd=1&so=0&st=&sto=0"
    historics_fallback_detail_urls: str = (
        "https://www.historics.co.uk/auction/lot/lot-197---1967-volkswagen--samba-split-screen-t1-21-window-camper/?lot=6522&sd=1,"
        "https://www.historics.co.uk/auction/lot/lot-57---1964-oldsmobile-ninety-eight-custom-sports-coupe/?lot=14833&sd=1"
    )
    historics_request_timeout_seconds: float = 20.0
    historics_max_attempts: int = 2
    iconic_base_url: str = "https://www.iconicauctioneers.com"
    iconic_discovery_paths: str = "/the-classic-sale-at-wheeler-dealer-live-2025/2025-06-01/page-7/session-219/ipp-2"
    iconic_fallback_detail_urls: str = (
        "https://www.iconicauctioneers.com/1980-datsun-280-zx-rec15176-1-bicester-0625,"
        "https://www.iconicauctioneers.com/1971-bond-bug-700es-rec14985-1-nec-1124"
    )
    iconic_request_timeout_seconds: float = 20.0
    iconic_max_attempts: int = 2
    lp112_base_url: str = "https://www.lp112.com"
    lp112_discovery_paths: str = "/Lamborghini/Search.asp"
    lp112_fallback_detail_urls: str = (
        "https://www.lp112.com/Lamborghini/Detail.asp?Model=Countach&Version=LP400&ChassisNumber=1120106,"
        "https://www.lp112.com/Lamborghini/Detail.asp?Model=Countach&Version=LPI800-4&ChassisNumber=ZHWEA9ZD7NLA10702"
    )
    lp112_request_timeout_seconds: float = 20.0
    lp112_max_attempts: int = 2
    mecum_base_url: str = "https://www.mecum.com"
    mecum_discovery_paths: str = "/auctions/orlando-2021/lots/?auction%5B0%5D=Orlando+Summer+Special+2021%7C1627430400%7C1627689600&configure%5Bfilters%5D=&configure%5BruleContexts%5D%5B0%5D=pin_items&page=3"
    mecum_fallback_detail_urls: str = (
        "https://www.mecum.com/lots/480219/2002-ferrari-360-spider/,"
        "https://www.mecum.com/lots/1144807/2024-chevrolet-corvette-z06-3lz-convertible/,"
        "https://www.mecum.com/lots/1127243/2005-ferrari-360-spider/,"
        "https://www.mecum.com/lots/1138757/2001-ferrari-360-spider/,"
        "https://www.mecum.com/lots/1148960/2003-ferrari-360-spider/,"
        "https://www.mecum.com/lots/1151340/2002-ferrari-360-spider/"
    )
    mecum_request_timeout_seconds: float = 20.0
    mecum_max_attempts: int = 2
    osenat_base_url: str = "https://www.osenat.com"
    osenat_discovery_paths: str = "/catalogue/155250"
    osenat_fallback_detail_urls: str = (
        "https://www.osenat.com/lot/155250/26974415-1956-jaguar-type-c-replica-numero-de-serie-5940780-numero,"
        "https://www.osenat.com/lot/168038/30187861-ferrari-testarossa-coupE-1992"
    )
    osenat_request_timeout_seconds: float = 20.0
    osenat_max_attempts: int = 2
    rm_sothebys_base_url: str = "https://rmsothebys.com"
    rm_sothebys_discovery_paths: str = "/auctions/pa25/,/auctions/pa25/lots/"
    rm_sothebys_fallback_detail_urls: str = (
        "https://rmsothebys.com/auctions/pa25/lots/r0010-2015-ferrari-laferrari/,"
        "https://rmsothebys.com/auctions/pa25/lots/r0016-1972-ferrari-dino-246-gt-by-scaglietti/,"
        "https://rmsothebys.com/auctions/pa25/lots/r0008-1964-ferrari-250-lm-by-scaglietti/,"
        "https://rmsothebys.com/auctions/pa25/lots/r0033-2010-ferrari-599-gto/,"
        "https://rmsothebys.com/auctions/pa25/lots/r0027-1981-ferrari-512-bblm/"
    )
    rm_sothebys_request_timeout_seconds: float = 20.0
    rm_sothebys_max_attempts: int = 2
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
    classic_base_url: str = "https://www.classic.com"
    classic_discovery_paths: str = (
        "/m/ferrari/dino/246-gts/,"
        "/m/ferrari/275/gtb4/,"
        "/m/ferrari/daytona/365-gtb4/,"
        "/m/lamborghini/miura/p400/,"
        "/m/lamborghini/miura/p400s/,"
        "/m/lamborghini/miura/p400sv/,"
        "/m/lamborghini/countach/lp400/"
    )
    classic_fallback_detail_urls: str = (
        "https://www.classic.com/veh/1972-ferrari-dino-246-gts-4250-4VA2vDp,"
        "https://www.classic.com/veh/1973-ferrari-dino-246-gts-06210-4RDaNVn,"
        "https://www.classic.com/veh/1972-ferrari-dino-246-gts-03980-Z4X6D8n,"
        "https://www.classic.com/veh/1971-ferrari-dino-246-gt-02234-4l01Xyn,"
        "https://www.classic.com/veh/1972-ferrari-dino-246-gts-03476-RpM2gA4"
    )
    classic_request_timeout_seconds: float = 30.0
    classic_max_attempts: int = 2
    request_lab_allowed_hosts: str = "localhost,127.0.0.1"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin]

    @property
    def effective_user_agent(self) -> str:
        return self.user_agent_override or self.respectful_user_agent

    @property
    def media_local_root_path(self) -> Path:
        candidate = Path(self.media_local_root)
        if candidate.is_absolute():
            return candidate
        return (Path(__file__).resolve().parents[2] / candidate).resolve()

    @property
    def barchetta_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.barchetta_discovery_paths.split(",") if path.strip()]

    @property
    def classic_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.classic_discovery_paths.split(",") if path.strip()]

    @property
    def aguttes_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.aguttes_discovery_paths.split(",") if path.strip()]

    @property
    def aguttes_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.aguttes_fallback_detail_urls.split(",") if url.strip()]

    @property
    def artcurial_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.artcurial_discovery_paths.split(",") if path.strip()]

    @property
    def artcurial_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.artcurial_fallback_detail_urls.split(",") if url.strip()]

    @property
    def historics_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.historics_discovery_paths.split(",") if path.strip()]

    @property
    def historics_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.historics_fallback_detail_urls.split(",") if url.strip()]

    @property
    def bat_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.bat_discovery_paths.split(",") if path.strip()]

    @property
    def bat_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.bat_fallback_detail_urls.split(",") if url.strip()]

    @property
    def gooding_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.gooding_discovery_paths.split(",") if path.strip()]

    @property
    def gooding_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.gooding_fallback_detail_urls.split(",") if url.strip()]

    @property
    def iconic_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.iconic_discovery_paths.split(",") if path.strip()]

    @property
    def iconic_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.iconic_fallback_detail_urls.split(",") if url.strip()]

    @property
    def lp112_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.lp112_discovery_paths.split(",") if path.strip()]

    @property
    def lp112_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.lp112_fallback_detail_urls.split(",") if url.strip()]

    @property
    def mecum_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.mecum_discovery_paths.split(",") if path.strip()]

    @property
    def mecum_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.mecum_fallback_detail_urls.split(",") if url.strip()]

    @property
    def osenat_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.osenat_discovery_paths.split(",") if path.strip()]

    @property
    def osenat_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.osenat_fallback_detail_urls.split(",") if url.strip()]

    @property
    def rm_sothebys_seed_paths(self) -> list[str]:
        return [path.strip() for path in self.rm_sothebys_discovery_paths.split(",") if path.strip()]

    @property
    def rm_sothebys_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.rm_sothebys_fallback_detail_urls.split(",") if url.strip()]

    @property
    def barchetta_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.barchetta_fallback_detail_urls.split(",") if url.strip()]

    @property
    def classic_fallback_urls(self) -> list[str]:
        return [url.strip() for url in self.classic_fallback_detail_urls.split(",") if url.strip()]

    @property
    def allowed_request_lab_hosts(self) -> list[str]:
        return [host.strip().lower() for host in self.request_lab_allowed_hosts.split(",") if host.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
