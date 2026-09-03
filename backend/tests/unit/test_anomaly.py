import pytest
from app.intelligence.anomaly import assess

def test_hard_rule_violation():
    # Extreme temperature out of range
    res = assess("maitri", "temperature", -75.0)
    assert res["is_anomaly"] is True
    assert res["rule_flag"] is True

def test_nominal_parameter():
    # Normal temperature
    res = assess("maitri", "temperature", -25.0)
    assert res["rule_flag"] is False
