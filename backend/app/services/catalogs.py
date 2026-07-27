"""Read-only, versioned catalog datasets shipped with the API."""
from functools import lru_cache
from hashlib import sha256
import json
from pathlib import Path
from unicodedata import combining, normalize


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


def searchable(value: str) -> str:
    return "".join(character for character in normalize("NFD", value.casefold()) if not combining(character))


@lru_cache
def get_search_index(name: str) -> tuple[tuple[dict[str, object], tuple[str, str]], ...]:
    """Pre-normalized fields keep every type-ahead request CPU-cheap."""
    _, items = get_catalog(name)
    if name == "schools":
        return tuple((item, (searchable(str(item["name"])), searchable(str(item["municipality"])))) for item in items)
    if name == "district-cities":
        return tuple((item, (searchable(str(item["name"])), searchable(str(item["district"])))) for item in items)
    raise KeyError(name)
