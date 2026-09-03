import pytest
from app.intelligence.risk_engine import compute_risk
from app.simulation.engine import initialize_station_state

def test_risk_score_bands():
    state = initialize_station_state("maitri")
    
    # In nominal state, risk should be LOW or MEDIUM
    risk = compute_risk(state)
    assert risk["score"] >= 0 and risk["score"] <= 100
    assert risk["level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(risk["contributing_factors"]) > 0

def test_risk_elevation_under_stress():
    state = initialize_station_state("maitri")
    # Simulate extreme stress
    state["fuel"]["fuel_percentage"] = 12.0 # Critical fuel
    state["energy"]["generator_load"] = 135.0
    state["energy"]["status"] = "Generator Trip - Backup Overload"
    state["environment"]["storm_severity"] = 0.95
    state["environment"]["wind_speed"] = 115.0

    high_risk = compute_risk(state)
    assert high_risk["score"] >= 50.0
    assert high_risk["level"] in ["HIGH", "CRITICAL"]
