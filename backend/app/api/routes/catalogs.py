from fastapi import APIRouter, Header, HTTPException, Query, Response
from fastapi.responses import JSONResponse

from app.services.catalogs import get_catalog, get_search_index, searchable

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
    try:
        index = get_search_index(name)
    except KeyError:
        raise HTTPException(status_code=404, detail={"code": "CATALOG_NOT_FOUND"})
    needle = searchable(q.strip())

    # A match at the beginning of a name/city is more useful than a match
    # hidden inside a word such as "Súkromnej".
    ranked: list[list[dict[str, object]]] = [[], [], []]
    for item, fields in index:
        if not any(needle in value for value in fields):
            continue
        if any(value.startswith(needle) for value in fields):
            rank = 0
        elif any(f" {needle}" in value for value in fields):
            rank = 1
        else:
            rank = 2
        # Four per rank is sufficient: lower-ranked records cannot displace
        # a better match and we never allocate a huge intermediate result list.
        if len(ranked[rank]) < limit:
            ranked[rank].append(item)

    return {"name": name, "items": (ranked[0] + ranked[1] + ranked[2])[:limit]}


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
