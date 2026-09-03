import pytest
from app.simulation.engine import get_current_state
from app.intelligence.monte_carlo import run_monte_carlo_simulation
from app.intelligence.shap_engine import compute_shap_explanation
from app.intelligence.rl_optimizer import get_rl_optimization
from app.intelligence.predictive_maintenance import compute_predictive_maintenance

def test_monte_carlo_simulation():
    """Verify stochastic Monte Carlo runs and returns percentiles"""
    result = run_monte_carlo_simulation("maitri", iterations=15, horizon_days=5)
    assert result["station_id"] == "maitri"
    assert result["iterations"] == 15
    assert "blackout_probability_pct" in result
    assert "percentiles" in result
    assert "p10_worst_case" in result["percentiles"]["fuel_percentage"]
    assert "p50_median" in result["percentiles"]["fuel_percentage"]
    assert "p90_best_case" in result["percentiles"]["fuel_percentage"]
    assert len(result["survival_histogram"]) > 0

def test_shap_explainability():
    """Verify SHAP value decomposition f(x) = E[f(x)] + sum(phi_i)"""
    state = get_current_state("maitri")
    shap = compute_shap_explanation(state, target="risk")
    assert shap["target"] == "risk"
    assert shap["base_value"] == 20.0
    assert len(shap["features"]) > 0
    # Every feature has name, shap_value, direction
    for f in shap["features"]:
        assert "name" in f
        assert "shap_value" in f
        assert "direction" in f
    assert len(shap["waterfall"]) > 0

def test_rl_operational_optimization():
    """Verify Reinforcement Learning microgrid agent selects optimal dispatch policy"""
    state = get_current_state("maitri")
    opt = get_rl_optimization(state)
    assert opt["status"] == "converged"
    assert "optimal_action" in opt
    assert opt["generator_1_dispatch_kw"] > 0
    assert opt["fuel_savings_percentage"] > 0
    assert len(opt["candidate_policies"]) == 5
    assert len(opt["learning_curve"]) > 0

def test_predictive_maintenance_rul():
    """Verify Weibull hazard and Remaining Useful Life calculation"""
    state = get_current_state("maitri")
    pm = compute_predictive_maintenance(state)
    assert pm["station_id"] == "maitri"
    assert pm["fleet_average_rul_days"] > 0
    assert len(pm["assets"]) > 0
    for a in pm["assets"]:
        assert a["remaining_useful_life_days"] > 0
        assert 0 <= a["weibull_reliability_pct"] <= 100
        assert a["urgency"] in ["NOMINAL", "MONITOR", "ACTION_REQUIRED", "CRITICAL"]
