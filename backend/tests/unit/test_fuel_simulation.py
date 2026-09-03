import pytest
from app.simulation import fuel, energy, environment

def test_fuel_initialization():
    m_fuel = fuel.init_fuel_state("maitri")
    b_fuel = fuel.init_fuel_state("bharati")

    assert m_fuel["total_capacity"] == 180000.0
    assert b_fuel["total_capacity"] == 300000.0
    assert m_fuel["fuel_percentage"] > 50.0
    assert m_fuel["reserve_zone"] == "Normal"

def test_fuel_consumption_step():
    state = {
        "station_id": "maitri",
        "energy": {"generator_load": 100.0},
        "fuel": fuel.init_fuel_state("maitri"),
        "environment": environment.init_environment_state("maitri")
    }

    initial_level = state["fuel"]["current_level"]
    next_state = fuel.step(state)

    assert next_state["fuel"]["current_level"] < initial_level
    assert next_state["fuel"]["consumption_rate_l_per_hr"] == 26.0 # 100 kW * 0.26 L/kWh
    assert next_state["fuel"]["days_remaining"] > 0
