from unicodedata import combining, normalize

from fastapi import APIRouter, Header, HTTPException, Query, Response
from fastapi.responses import JSONResponse

from app.services.catalogs import get_catalog

router = APIRouter(prefix="/catalogs", tags=["catalogs"])


def catalog_or_404(name: str):
    try:
        return get_catalog(name)
    except KeyError:
        raise HTTPException(status_code=404, detail={"code": "CATALOG_NOT_FOUND"})


@router.get("/{name}/version")
def catalog_version(name: str):
    version, items = catalog_or_404(name)
    return {"name": name, "version": version, "count": len(items)}


@router.get("/{name}/search")
def catalog_search(name: str, q: str = Query(min_length=1, max_length=100), limit: int = Query(default=4, ge=1, le=4)):
    """Small type-ahead result set; never return the complete catalogue."""
    _, items = catalog_or_404(name)

    def text(value: str) -> str:
        return "".join(character for character in normalize("NFD", value.casefold()) if not combining(character))

    needle = text(q.strip())
    if name == "schools":
        results = [item for item in items if needle in text(f"{item['name']} {item['municipality']}")]
        fields = lambda item: (text(item["name"]), text(item["municipality"]))
    elif name == "district-cities":
        results = [item for item in items if needle in text(f"{item['name']} {item['district']}")]
        fields = lambda item: (text(item["name"]), text(item["district"]))
    else:
        results = []
        fields = lambda item: ()

    # A match at the beginning of a name/city is more useful than a match
    # hidden inside a word such as "Súkromnej".
    def rank(item):
        searchable_fields = fields(item)
        if any(value.startswith(needle) for value in searchable_fields):
            return 0
        if any(f" {needle}" in value for value in searchable_fields):
            return 1
        return 2

    results.sort(key=rank)
    return {"name": name, "items": results[:limit]}


@router.get("/{name}")
def catalog_data(name: str, if_none_match: str | None = Header(default=None)):
    version, items = catalog_or_404(name)
    etag = f'"{version}"'
    if if_none_match == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "public, max-age=0, must-revalidate"})
    return JSONResponse(
        content={"name": name, "version": version, "items": items},
        headers={"ETag": etag, "Cache-Control": "public, max-age=0, must-revalidate"},
    )
