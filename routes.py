"""HTTP routes for the Prompt Craft preset library."""

from aiohttp import web
from server import PromptServer

from . import db

SAVE_ROUTE = "/prompt_craft/layouts"
LIST_ROUTE = "/prompt_craft/layouts"

db.init_db()


async def save_layout(request):
    try:
        payload = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)

    if not isinstance(payload, dict):
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)

    try:
        result = db.save_layout(
            payload.get("name") or "",
            payload.get("description") or "",
            payload.get("slots") or [],
            overwrite=bool(payload.get("overwrite")),
        )
    except Exception as exc:
        return web.json_response({"ok": False, "error": str(exc)}, status=500)

    status = 200 if result.get("ok") else 409 if result.get("conflicts") else 400
    return web.json_response(result, status=status)


async def list_layouts(request):
    try:
        result = db.list_layouts()
    except Exception as exc:
        return web.json_response({"ok": False, "error": str(exc)}, status=500)
    return web.json_response(result)


_existing = {getattr(route, "path", None) for route in PromptServer.instance.routes}
if SAVE_ROUTE not in _existing:
    PromptServer.instance.routes.post(SAVE_ROUTE)(save_layout)
    PromptServer.instance.routes.get(LIST_ROUTE)(list_layouts)
