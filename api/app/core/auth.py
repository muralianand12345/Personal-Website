from fastapi import HTTPException, status, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated

from api.app.core.config import Settings, get_settings

security = HTTPBearer()


def verify_api_key(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(security)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> bool:
    """Verify API key from Authorization header."""
    if credentials.credentials != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True


# Dependency for protected routes
APIKeyDep = Depends(verify_api_key)
