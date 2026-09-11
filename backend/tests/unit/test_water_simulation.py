import pytest
from app.simulation import water, environment, personnel

def test_water_initialization():
    m_water = water.init_water_state("maitri")
    b_water = water.init_water_state("bharati")

    # Source assertions
    assert "Zub" in m_water["source_type"]
    assert "Quilty Bay" in b_water["source_type"]
    assert m_water["storage_liters"] == 18500.0
    assert b_water["storage_liters"] == 28000.0
    assert m_water["max_storage_liters"] == 25000.0
    assert b_water["max_storage_liters"] == 35000.0

    # Subsystem nodes
    assert m_water["intake_pump"]["status"] == "RUNNING"
    assert b_water["intake_pump"]["status"] == "RUNNING"
    assert m_water["treatment"]["efficiency_pct"] > 95.0
    assert b_water["treatment"]["efficiency_pct"] > 95.0
    assert m_water["thermal_pipeline"]["freeze_risk"] == "Low"
    assert b_water["thermal_pipeline"]["freeze_risk"] == "Low"
    assert m_water["wastewater"]["stp_status"] == "AEROBIC_DIGESTION_OK"

def test_water_consumption_and_thermal_step():
    state = {
        "station_id": "maitri",
        "water": water.init_water_state("maitri"),
        "environment": {"temperature": -25.0, "wind_speed": 28.0},
        "personnel": {"headcount": 25},
        "research": {"active_experiments_count": 3}
    }

    next_state = water.step(state)
    w = next_state["water"]

    assert w["daily_consumption_l"] > 0
    assert w["days_remaining"] > 0
    assert w["thermal_pipeline"]["pipe_temp_c"] > 0.5 # Kept warm by trace heating
    assert w["thermal_pipeline"]["freeze_margin_c"] > 0

def test_water_perturbations():
    base_state = {
        "station_id": "maitri",
        "water": water.init_water_state("maitri"),
        "environment": {"temperature": -25.0, "wind_speed": 30.0},
        "personnel": {"headcount": 25},
        "research": {"active_experiments_count": 3}
    }

    # 1. Trace heating failure drops pipe temp and triggers freeze risk
    heat_fail_state = water.step(base_state, perturbation={"type": "trace_heating_failure"})
    assert heat_fail_state["water"]["trace_heating_active"] is False
    assert heat_fail_state["water"]["pipe_temp_c"] < base_state["water"]["pipe_temp_c"]

    # 2. Pump failure stops production
    pump_fail_state = water.step(base_state, perturbation={"type": "pump_failure"})
    assert pump_fail_state["water"]["production_rate_l_hr"] == 0.0

    # 3. Personnel increase surges consumption
    crew_surge_state = water.step(base_state, perturbation={"type": "personnel_increase", "additional_people": 12})
    assert crew_surge_state["water"]["daily_consumption_l"] > base_state["water"]["daily_consumption_l"]
