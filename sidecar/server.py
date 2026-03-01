"""
Maigret sidecar — FastAPI wrapper for username OSINT search.
Run: python server.py
"""

import asyncio
import json
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("maigret-sidecar")

app = FastAPI(title="Maigret Sidecar", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Platform categories for enrichment
PLATFORM_CATEGORIES = {
    "instagram": "social",
    "facebook": "social",
    "twitter": "social",
    "x": "social",
    "tiktok": "social",
    "snapchat": "social",
    "threads": "social",
    "mastodon": "social",
    "bluesky": "social",
    "linkedin": "professional",
    "github": "professional",
    "gitlab": "professional",
    "bitbucket": "professional",
    "stackoverflow": "professional",
    "behance": "professional",
    "dribbble": "professional",
    "angellist": "professional",
    "youtube": "media",
    "twitch": "media",
    "soundcloud": "media",
    "spotify": "media",
    "vimeo": "media",
    "dailymotion": "media",
    "reddit": "forum",
    "hackernews": "forum",
    "quora": "forum",
    "discord": "forum",
    "telegram": "messaging",
    "signal": "messaging",
    "whatsapp": "messaging",
    "skype": "messaging",
    "steam": "gaming",
    "xbox": "gaming",
    "playstation": "gaming",
    "epicgames": "gaming",
    "roblox": "gaming",
    "chess.com": "gaming",
    "lichess": "gaming",
    "pinterest": "lifestyle",
    "tumblr": "lifestyle",
    "flickr": "lifestyle",
    "medium": "writing",
    "substack": "writing",
    "wordpress": "writing",
    "blogger": "writing",
    "devto": "writing",
    "venmo": "finance",
    "cashapp": "finance",
    "paypal": "finance",
}


def get_category(site_name: str) -> str:
    """Categorize a site by its name."""
    key = site_name.lower().replace(" ", "").replace(".", "")
    for pattern, category in PLATFORM_CATEGORIES.items():
        if pattern in key:
            return category
    return "other"


def parse_maigret_output(raw: dict | list) -> dict:
    """Parse Maigret v0.5.0 JSON output into clean structured results.

    Real format (v0.5.0 --json simple):
    {
      "GitHub": {
        "url_user": "https://github.com/username",
        "status": {
          "status": "Claimed",
          "ids": { "fullname": "...", "location": "...", ... }
        },
        ...
      }
    }
    """
    results = {}

    if isinstance(raw, dict):
        for site_name, site_data in raw.items():
            if not isinstance(site_data, dict):
                continue

            url = site_data.get("url_user", "")
            if not url:
                continue

            # v0.5.0: status is a nested object with its own "status" and "ids"
            status_obj = site_data.get("status", {})
            if isinstance(status_obj, dict):
                claim_status = status_obj.get("status", "").lower()
                if claim_status not in ("claimed", "found", ""):
                    continue
                ids = {}
                raw_ids = status_obj.get("ids", {})
                if isinstance(raw_ids, dict):
                    ids = {k: v for k, v in raw_ids.items() if v}
            elif isinstance(status_obj, str):
                # Fallback for older format where status is a plain string
                if status_obj.lower() not in ("claimed", "found", ""):
                    continue
                ids = {}
                raw_ids = site_data.get("ids", {})
                if isinstance(raw_ids, dict):
                    ids = {k: v for k, v in raw_ids.items() if v}
            else:
                continue

            results[site_name.lower()] = {
                "url": url,
                "site_name": site_name,
                "category": get_category(site_name),
                **ids,
            }

    elif isinstance(raw, list):
        for entry in raw:
            if not isinstance(entry, dict):
                continue
            url = entry.get("url_user", "")
            if not url:
                continue

            site_name = entry.get("site_name", "unknown")
            ids = {}
            status_obj = entry.get("status", {})
            if isinstance(status_obj, dict):
                raw_ids = status_obj.get("ids", {})
            else:
                raw_ids = entry.get("ids", {})
            if isinstance(raw_ids, dict):
                ids = {k: v for k, v in raw_ids.items() if v}

            results[site_name.lower()] = {
                "url": url,
                "site_name": site_name,
                "category": get_category(site_name),
                **ids,
            }

    return results


@app.get("/search")
async def search_username(
    username: str = Query(..., description="Username to search"),
    top_sites: int = Query(100, description="Number of top sites to check (default 100)"),
    timeout: int = Query(10, description="Per-site timeout in seconds"),
):
    """Run Maigret for a username and return structured results."""
    if not username or len(username) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")

    # Sanitize username — only allow alphanumeric, underscores, dots, hyphens
    clean_username = "".join(c for c in username if c.isalnum() or c in "_.-")
    if clean_username != username:
        logger.warning(f"Sanitized username: {username!r} → {clean_username!r}")

    logger.info(f"Starting search for username: {clean_username} (top {top_sites} sites)")

    with tempfile.TemporaryDirectory() as tmpdir:
        reports_dir = Path(tmpdir) / "reports"
        reports_dir.mkdir(exist_ok=True)

        # Maigret v0.5.0 CLI: -J simple for JSON, --folderoutput for output dir
        cmd = [
            "maigret",
            clean_username,
            "-J", "simple",
            "--folderoutput", str(reports_dir),
            "--top-sites", str(min(top_sites, 500)),
            "--timeout", str(min(timeout, 30)),
            "--no-color",
            "--no-progressbar",
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)

            if stderr:
                logger.info(f"Maigret stderr: {stderr.decode()[:500]}")

            # Maigret writes to reports/report_{username}_simple.json
            output_file = reports_dir / f"report_{clean_username}_simple.json"
            # Also check default location in case folderoutput is ignored
            alt_output = Path(tmpdir) / "reports" / f"report_{clean_username}_simple.json"

            found_file = None
            if output_file.exists():
                found_file = output_file
            elif alt_output.exists():
                found_file = alt_output
            else:
                # Search for any JSON file in the reports dir
                json_files = list(reports_dir.glob("*.json"))
                if json_files:
                    found_file = json_files[0]

            if found_file:
                raw_text = found_file.read_text()
                if not raw_text.strip():
                    return {
                        "username": clean_username,
                        "results": {},
                        "count": 0,
                        "error": "Maigret produced empty output",
                    }

                try:
                    raw = json.loads(raw_text)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse Maigret JSON: {e}")
                    return {
                        "username": clean_username,
                        "results": {},
                        "count": 0,
                        "error": f"Invalid JSON from Maigret: {str(e)}",
                    }

                results = parse_maigret_output(raw)
                logger.info(f"Search complete: {len(results)} profiles found for {clean_username}")

                return {
                    "username": clean_username,
                    "results": results,
                    "count": len(results),
                    "categories": _count_categories(results),
                }
            else:
                # Check stdout for any useful output
                stdout_text = stdout.decode()[:500] if stdout else ""
                error_msg = stderr.decode()[:500] if stderr else "No output file generated"
                logger.warning(f"No output file found. stdout: {stdout_text}, stderr: {error_msg}")
                return {
                    "username": clean_username,
                    "results": {},
                    "count": 0,
                    "error": error_msg or "No JSON output generated",
                }

        except asyncio.TimeoutError:
            logger.error(f"Maigret timed out for {clean_username}")
            # Try to kill the process
            try:
                process.kill()
            except Exception:
                pass
            return {
                "username": clean_username,
                "results": {},
                "count": 0,
                "error": "Maigret timed out after 120 seconds",
            }
        except FileNotFoundError:
            logger.error("Maigret binary not found")
            return {
                "username": clean_username,
                "results": {},
                "count": 0,
                "error": "Maigret not installed. Run: pip install maigret",
            }


@app.get("/batch")
async def batch_search(
    usernames: str = Query(..., description="Comma-separated usernames to search"),
    top_sites: int = Query(50, description="Number of top sites per username"),
):
    """Search multiple usernames in parallel. Returns results keyed by username."""
    username_list = [u.strip() for u in usernames.split(",") if u.strip()]
    if not username_list:
        raise HTTPException(status_code=400, detail="No usernames provided")
    if len(username_list) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 usernames per batch")

    # Run searches concurrently
    tasks = []
    for uname in username_list:
        tasks.append(search_username(username=uname, top_sites=top_sites, timeout=10))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    batch_results = {}
    for uname, result in zip(username_list, results):
        if isinstance(result, Exception):
            batch_results[uname] = {"error": str(result), "results": {}, "count": 0}
        else:
            batch_results[uname] = result

    return {"usernames": username_list, "results": batch_results}


@app.get("/health")
async def health():
    """Health check — also verifies Maigret is installed."""
    maigret_installed = shutil.which("maigret") is not None
    return {
        "status": "ok" if maigret_installed else "degraded",
        "maigret_installed": maigret_installed,
        "maigret_path": shutil.which("maigret"),
    }


@app.get("/info")
async def info():
    """Get Maigret version and sidecar info."""
    version = "unknown"
    try:
        proc = await asyncio.create_subprocess_exec(
            "maigret", "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
        version = stdout.decode().strip()
    except Exception:
        pass

    return {
        "sidecar_version": "1.0.0",
        "maigret_version": version,
        "maigret_installed": shutil.which("maigret") is not None,
        "endpoints": ["/search", "/batch", "/health", "/info"],
    }


def _count_categories(results: dict) -> dict:
    """Count results by category."""
    counts: dict[str, int] = {}
    for site_data in results.values():
        cat = site_data.get("category", "other")
        counts[cat] = counts.get(cat, 0) + 1
    return counts


@app.on_event("startup")
async def startup_check():
    """Check Maigret installation on startup."""
    if shutil.which("maigret"):
        logger.info("✓ Maigret found at: %s", shutil.which("maigret"))
    else:
        logger.warning("✗ Maigret not found! Install with: pip install maigret")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
