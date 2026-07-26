"""Read-only, versioned catalog datasets shipped with the API."""
from functools import lru_cache
from hashlib import sha256
import json
from pathlib import Path


CATALOG_DIR = Path(__file__).resolve().parent.parent / "catalog_data"


@lru_cache
def get_catalog(name: str) -> tuple[str, list[dict[str, object]]]:
    path = CATALOG_DIR / f"{name}.json"
    if not path.is_file():
        raise KeyError(name)
    content = path.read_bytes()
    # The content hash is the version. Publishing changed data automatically
    # creates a new version without maintaining a separate counter by hand.
    return sha256(content).hexdigest(), json.loads(content)
