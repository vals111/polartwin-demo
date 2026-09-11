"""
Unit tests for the Personnel, Occupancy & Human Factors simulation module.
Validates state initialization, cross-domain coupling, What-If perturbations,
diurnal demand, field exposure, and workforce condition logic.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from app.simulation.personnel import init_personnel_state, step, _compute_what_if_state


class TestPersonnelInitialization:
    def test_maitri_headcount(self):
        state = init_personnel_state("maitri")
        assert state["headcount"] == 25
        assert state["bed_capacity"] == 30

    def test_bharati_headcount(self):
        state = init_personnel_state("bharati")
        assert state["headcount"] == 22
        assert state["bed_capacity"] == 47

    def test_maitri_has_four_role_groups(self):
        state = init_personnel_state("maitri")
        assert len(state["role_groups"]) == 4

    def test_bharati_has_four_role_groups(self):
        state = init_personnel_state("bharati")
        assert len(state["role_groups"]) == 4

    def test_maitri_zone_map(self):
        state = init_personnel_state("maitri")
        assert len(state["zone_map"]) == 6
        total_capacity = sum(z["capacity"] for z in state["zone_map"])
        assert total_capacity >= state["headcount"]

    def test_bharati_zone_map(self):
        state = init_personnel_state("bharati")
        assert len(state["zone_map"]) == 7

    def test_resource_demand_coupling_populated(self):
        for station in ["maitri", "bharati"]:
            state = init_personnel_state(station)
            rc = state["resource_demand_coupling"]
            assert rc["energy_personnel_load_kw"] > 0
            assert rc["water_demand_l_day"] > 0
            assert rc["food_demand_kcal_day"] > 0
            assert rc["waste_generation_kg_day"] > 0

    def test_maitri_occupancy_pct(self):
        state = init_personnel_state("maitri")
        expected = round((25 / 30) * 100.0, 1)
        assert abs(state["occupancy_pct"] - expected) < 1.0

    def test_deployment_map_present(self):
        state = init_personnel_state("maitri")
        dm = state["deployment_map"]
        assert "station_interior" in dm
        assert "field_deployed" in dm
        assert dm["station_interior"] + dm["field_deployed"] <= state["headcount"]

    def test_life_support_populated(self):
        state = init_personnel_state("maitri")
        ls = state["life_support"]
        assert ls["o2_pct"] > 19.0
        assert ls["co2_ppm"] < 1000.0
        assert ls["medical_officer_available"] is True

    def test_personnel_risk_present(self):
        for station in ["maitri", "bharati"]:
            state = init_personnel_state(station)
            risk = state["personnel_risk"]
            assert "score" in risk
            assert "level" in risk
            assert 0.0 <= risk["score"] <= 100.0
            assert risk["level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TestPersonnelStep:
    def _make_full_state(self, station_id):
        """Build a minimal simulation state for step() testing."""
        pers = init_personnel_state(station_id)
        return {
            "station_id": station_id,
            "personnel": pers,
            "environment": {
                "temperature": -21.0 if station_id == "maitri" else -14.0,
                "wind_speed": 28.0 if station_id == "maitri" else 22.0,
                "blizzard_active": False,
            },
            "research": {"active_experiments_count": 4},
        }

    def test_step_nominal_maitri(self):
        state = self._make_full_state("maitri")
        result = step(state)
        assert result["personnel"]["headcount"] == 25

    def test_step_nominal_bharati(self):
        state = self._make_full_state("bharati")
        result = step(state)
        assert result["personnel"]["headcount"] == 22

    def test_step_blizzard_recalls_field_teams(self):
        state = self._make_full_state("maitri")
        state["environment"]["blizzard_active"] = True
        result = step(state)
        fe = result["personnel"]["field_exposure"]
        assert fe["field_team_deployed"] is False
        assert fe["field_team_count"] == 0
        assert "Blizzard" in result["personnel"]["safety_status"]

    def test_step_extreme_wind_restricts_deployment(self):
        state = self._make_full_state("maitri")
        state["environment"]["wind_speed"] = 70.0
        result = step(state)
        fe = result["personnel"]["field_exposure"]
        assert fe["exposure_risk"] in ["CRITICAL", "High"]

    def test_step_personnel_increase_perturbation(self):
        state = self._make_full_state("maitri")
        result = step(state, perturbation={"type": "personnel_increase", "additional_people": 10})
        assert result["personnel"]["headcount"] == 35

    def test_step_does_not_mutate_input(self):
        state = self._make_full_state("maitri")
        original_headcount = state["personnel"]["headcount"]
        step(state, perturbation={"type": "personnel_increase", "additional_people": 10})
        # Original state should be unchanged (deep copy in step)
        assert state["personnel"]["headcount"] == original_headcount

    def test_resource_coupling_diurnal_scaling(self):
        """Resource demand coupling energy should be > 0 under normal conditions."""
        state = self._make_full_state("maitri")
        result = step(state)
        rc = result["personnel"]["resource_demand_coupling"]
        assert rc["energy_personnel_load_kw"] > 0
        assert rc["water_demand_l_day"] > 0


class TestPersonnelWhatIf:
    def _base_state(self, station_id="maitri"):
        pers = init_personnel_state(station_id)
        return {"station_id": station_id, "personnel": pers, "environment": {"temperature": -21.0, "wind_speed": 28.0, "blizzard_active": False}, "research": {}}

    def test_whatif_personnel_increase_raises_headcount(self):
        state = self._base_state()
        result = _compute_what_if_state(state, "personnel_increase", {"additional_people": 12})
        assert result["personnel"]["headcount"] == 37

    def test_whatif_personnel_increase_raises_resource_demand(self):
        state = self._base_state()
        original_water = state["personnel"]["resource_demand_coupling"]["water_demand_l_day"]
        result = _compute_what_if_state(state, "personnel_increase", {"additional_people": 12})
        new_water = result["personnel"]["resource_demand_coupling"]["water_demand_l_day"]
        assert new_water > original_water

    def test_whatif_personnel_increase_does_not_mutate_source(self):
        state = self._base_state()
        original_headcount = state["personnel"]["headcount"]
        _compute_what_if_state(state, "personnel_increase", {"additional_people": 12})
        assert state["personnel"]["headcount"] == original_headcount  # Deep-copy guarantee

    def test_whatif_severe_weather_recalls_field_teams(self):
        state = self._base_state()
        result = _compute_what_if_state(state, "severe_weather", {})
        fe = result["personnel"]["field_exposure"]
        assert fe["field_team_count"] == 0
        assert "BLIZZARD" in fe["deployment_restriction"]

    def test_whatif_field_deployment_increases_exposure_risk(self):
        state = self._base_state()
        result = _compute_what_if_state(state, "field_deployment", {"extra_field_personnel": 4})
        fe = result["personnel"]["field_exposure"]
        assert fe["exposure_risk"] == "High"
        assert fe["research_feasibility"] == "REDUCED"

    def test_whatif_research_increase_raises_energy(self):
        state = self._base_state()
        original_energy = state["personnel"]["resource_demand_coupling"]["energy_personnel_load_kw"]
        result = _compute_what_if_state(state, "research_increase", {"extra_kw": 14.0})
        new_energy = result["personnel"]["resource_demand_coupling"]["energy_personnel_load_kw"]
        assert new_energy > original_energy

    def test_whatif_personnel_decrease_reduces_demand(self):
        state = self._base_state()
        original_water = state["personnel"]["resource_demand_coupling"]["water_demand_l_day"]
        result = _compute_what_if_state(state, "personnel_decrease", {"reduction": 8})
        new_water = result["personnel"]["resource_demand_coupling"]["water_demand_l_day"]
        assert new_water < original_water
