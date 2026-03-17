from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from digital_barn_finds.config import get_settings
from digital_barn_finds.database import get_db


def require_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if x_admin_token != settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token.",
        )


AdminToken = Depends(require_admin_token)
DbSession = Depends(get_db)
