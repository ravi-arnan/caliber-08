"""Backend test for the deployment health compatibility criterion.

Verifies GET /api/health returns {status: 'ok', mode: 'frontend_only'} against
the real running uvicorn server (no app import, no mocking).
"""
import httpx

BASE_URL = "http://localhost:8001"


def test_health_returns_ok_frontend_only_mode():
    resp = httpx.get(f"{BASE_URL}/api/health", timeout=10)
    assert resp.status_code == 200, f"expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body == {"status": "ok", "mode": "frontend_only"}, f"unexpected body: {body}"


def test_health_content_type_is_json():
    resp = httpx.get(f"{BASE_URL}/api/health", timeout=10)
    assert resp.status_code == 200
    assert "application/json" in resp.headers.get("content-type", "")
