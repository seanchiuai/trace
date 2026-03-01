"""
Maigret sidecar — FastAPI wrapper for username search.
Run: uvicorn server:app --port 8000
"""

import asyncio
import json
import tempfile
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Maigret Sidecar")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/search")
async def search_username(username: str = Query(..., description="Username to search")):
    """Run Maigret for a username and return structured results."""
    with tempfile.TemporaryDirectory() as tmpdir:
        output_file = Path(tmpdir) / "results.json"

        cmd = [
            "maigret",
            username,
            "--json", "simple",
            "-o", str(output_file),
            "--top-sites", "100",
            "--timeout", "10",
            "--no-color",
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await asyncio.wait_for(process.communicate(), timeout=60)

            if output_file.exists():
                raw = json.loads(output_file.read_text())
                # Parse into clean format
                results = {}
                if isinstance(raw, dict):
                    for site_name, site_data in raw.items():
                        if isinstance(site_data, dict) and site_data.get("status") == "Claimed":
                            results[site_name.lower()] = {
                                "url": site_data.get("url_user", ""),
                                **{
                                    k: v
                                    for k, v in site_data.get("ids", {}).items()
                                    if v
                                },
                            }
                elif isinstance(raw, list):
                    for entry in raw:
                        if isinstance(entry, dict) and entry.get("url_user"):
                            site = entry.get("site_name", "unknown").lower()
                            results[site] = {
                                "url": entry.get("url_user", ""),
                                **{
                                    k: v
                                    for k, v in entry.get("ids", {}).items()
                                    if v
                                },
                            }

                return {"username": username, "results": results, "count": len(results)}
            else:
                return {
                    "username": username,
                    "results": {},
                    "count": 0,
                    "error": stderr.decode() if stderr else "No output file generated",
                }
        except asyncio.TimeoutError:
            return {
                "username": username,
                "results": {},
                "count": 0,
                "error": "Maigret timed out after 60 seconds",
            }
        except FileNotFoundError:
            return {
                "username": username,
                "results": {},
                "count": 0,
                "error": "Maigret not installed. Run: pip install maigret",
            }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
