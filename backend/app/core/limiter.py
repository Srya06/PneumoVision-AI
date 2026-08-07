from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize rate limiter using remote address as key with safe default baseline limits
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    headers_enabled=True,
)
