import pytest
from app.simulation import fuel, energy, environment

def test_fuel_initialization():
    m_fuel = fuel.init_fuel_state("maitri")
    b_fuel = fuel.init_fuel_state("bharati")

    # Capacity assertions
    assert m_fuel["total_capacity"] == 180000.0
    assert b_fuel["total_capacity"] == 300000.0
    assert m_fuel["fuel_percentage"] > 50.0
    assert b_fuel["fuel_percentage"] > 50.0
    assert m_fuel["reserve_zone"] == "Normal"
    assert b_fuel["reserve_zone"] == "Normal"

    # Physical tank fleet assertions
    assert len(m_fuel["tanks"]) == 6
    assert len(b_fuel["tanks"]) == 8
    assert m_fuel["total_tanks"] == 6
    assert b_fuel["total_tanks"] == 8

    # Transfer loop assertions
    assert m_fuel["transfer_loop"]["pump_status"] == "RUNNING"
    assert b_fuel["transfer_loop"]["flow_rate_l_min"] > 0

    # Runway & Resupply assertions
    assert m_fuel["runway"]["usable_liters"] > 0
    assert m_fuel["resupply"]["resupply_eta_days"] == 88
    assert b_fuel["resupply"]["resupply_eta_days"] == 102

def test_fuel_consumption_step():
    state = {
        "station_id": "maitri",
        "energy": {"generator_load": 100.0, "solar_output": 0.0},
        "fuel": fuel.init_fuel_state("maitri"),
        "environment": environment.init_environment_state("maitri")
    }

    initial_level = state["fuel"]["current_level"]
    next_state = fuel.step(state)

    assert next_state["fuel"]["current_level"] < initial_level
    # Generator burn: 100 kW * 0.26 L/kWh = 26.0 L/hr, plus auxiliary heating
    assert next_state["fuel"]["drivers"]["generator_burn_l_hr"] == 26.0
    assert next_state["fuel"]["consumption_rate_l_per_hr"] >= 26.0
    assert next_state["fuel"]["days_remaining"] > 0

def test_fuel_perturbations():
    # Test storm perturbation accelerates consumption
    base_state = {
        "station_id": "maitri",
        "energy": {"generator_load": 70.0},
        "fuel": fuel.init_fuel_state("maitri"),
        "environment": {"temperature": -25.0}
    }
    nominal_step = fuel.step(base_state, perturbation=None)
    storm_step = fuel.step(base_state, perturbation={"type": "storm"})
    assert storm_step["fuel"]["consumption_rate_l_per_hr"] > nominal_step["fuel"]["consumption_rate_l_per_hr"]

    # Test resupply delay perturbation
    delay_step = fuel.step(base_state, perturbation={"type": "resupply_delay", "days": 20})
    assert delay_step["fuel"]["resupply_eta_days"] == 108

    # Test fuel leak perturbation
    leak_step = fuel.step(base_state, perturbation={"type": "fuel_leak"})
    assert leak_step["fuel"]["fuel_leak_detected"] is True
    assert leak_step["fuel"]["consumption_rate_l_per_hr"] > nominal_step["fuel"]["consumption_rate_l_per_hr"] * 2.0
