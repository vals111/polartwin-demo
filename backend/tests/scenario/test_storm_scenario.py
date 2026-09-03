import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_storm_whatif_scenario():
    # Login as operator
    login_res = client.post("/api/auth/login", json={
        "email": "operator@polartwin.gov.in",
        "password": "Operator@1234"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Execute 3-day severe storm scenario
    payload = {
        "station_id": "maitri",
        "definition": {
            "name": "3-Day Severe Antarctic Storm Test",
            "perturbation": {"type": "storm", "intensity": 0.6},
            "duration_ticks": 12
        }
    }

    res = client.post("/api/scenarios", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "result" in data
    result = data["result"]
    assert "comparison" in result
    assert "station_risk_score" in result["comparison"]
    
    # Assert risk rises in projected scenario vs baseline
    proj_risk = result["projected_risk"]["score"]
    base_risk = result["baseline_risk"]["score"]
    assert proj_risk >= base_risk
