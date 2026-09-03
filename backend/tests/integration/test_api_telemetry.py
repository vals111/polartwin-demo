import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "maitri" in data["stations"]

def test_auth_login_and_stations():
    # Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@polartwin.gov.in",
        "password": "Admin@1234"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query stations
    stations_res = client.get("/api/stations", headers=headers)
    assert stations_res.status_code == 200
    st_data = stations_res.json()
    assert len(st_data) >= 2
    ids = [s["station_id"] for s in st_data]
    assert "maitri" in ids
    assert "bharati" in ids

def test_telemetry_endpoint():
    login_res = client.post("/api/auth/login", json={
        "email": "viewer@polartwin.gov.in",
        "password": "Viewer@1234"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/telemetry?station_id=maitri", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
