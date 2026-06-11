from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import connect_db, disconnect_db
from app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    lifespan=lifespan,
)

# Create static directory if it doesn't exist
os.makedirs("app/static", exist_ok=True)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/liff", response_class=HTMLResponse)
async def liff_page_index():
    return await serve_liff_page("index")


@app.get("/liff/{page}", response_class=HTMLResponse)
async def liff_page_dynamic(page: str):
    return await serve_liff_page(page)


async def serve_liff_page(page: str):
    if not page.isalnum() and "_" not in page and "-" not in page:
        return HTMLResponse("Invalid page name", status_code=400)
    liff_path = f"app/static/liff/{page}.html"
    if os.path.exists(liff_path):
        with open(liff_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Inject MAP_API key into page where placeholder exists. This avoids an
        # additional network roundtrip on environments where the backend fetch
        # might fail (e.g., LIFF webview or strict CSP). Placeholder string is
        # '__MAP_API__' in the HTML template.
        if "__MAP_API__" in content:
            content = content.replace("__MAP_API__", settings.GOOGLE_MAPS_API_KEY or "")

        return HTMLResponse(content)
    return HTMLResponse("LIFF page not found.", status_code=404)


@app.get("/maid", response_class=HTMLResponse)
async def maid_page_index():
    return await serve_maid_page("index")


@app.get("/maid/{page}", response_class=HTMLResponse)
async def maid_page_dynamic(page: str):
    return await serve_maid_page(page)


async def serve_maid_page(page: str):
    if not page.isalnum() and "_" not in page and "-" not in page:
        return HTMLResponse("Invalid page name", status_code=400)
    maid_path = f"app/static/maid/{page}.html"
    if os.path.exists(maid_path):
        with open(maid_path, "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("Maid portal page not found.", status_code=404)
