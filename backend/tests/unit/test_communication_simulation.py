import copy
import pytest
from app.simulation import communication as comm_sim


def test_init_communication_maitri():
    state = comm_sim.init_communication_state("maitri")
    assert state["station_id"] == "maitri"
    assert "Maitri" in state["station_name"]
    assert state["bandwidth_capacity_mbps"] == 120.0
    assert state["latency_ms"] == 78
    assert state["packet_loss_pct"] == 0.05
    assert state["sync_state"] == "SYNCHRONIZED"
    assert state["data_confidence_pct"] >= 99.0
    assert len(state["qos_tiers"]) == 3
    assert len(state["assets"]) == 4
    assert len(state["domains_freshness"]) == 16
    assert len(state["history"]) == 20


def test_init_communication_bharati():
    state = comm_sim.init_communication_state("bharati")
    assert state["station_id"] == "bharati"
    assert "Bharati" in state["station_name"]
    assert state["bandwidth_capacity_mbps"] == 160.0
    assert state["latency_ms"] == 62
    assert state["packet_loss_pct"] == 0.02
    assert state["sync_state"] == "SYNCHRONIZED"
    assert "Dual 3.0m" in state["antenna_config"]


def test_all_16_domains_present():
    state = comm_sim.init_communication_state("maitri")
    domain_ids = [d["domain_id"] for d in state["domains_freshness"]]
    expected_domains = [
        "energy", "fuel", "water", "waste", "supplies", "infrastructure",
        "equipment", "logistics", "environment", "communication",
        "personnel", "research", "safety", "maintenance", "inventory", "station_ops"
    ]
    for exp in expected_domains:
        assert exp in domain_ids
    assert len(domain_ids) == 16


def test_qos_tiers_structure():
    state = comm_sim.init_communication_state("maitri")
    t1 = next(t for t in state["qos_tiers"] if t["tier_number"] == 1)
    t2 = next(t for t in state["qos_tiers"] if t["tier_number"] == 2)
    t3 = next(t for t in state["qos_tiers"] if t["tier_number"] == 3)

    assert t1["priority"] == "CRITICAL"
    assert t1["status"] == "GUARANTEED"
    assert t2["priority"] == "HIGH"
    assert t3["priority"] == "NORMAL"


def test_communication_assets_structure():
    state = comm_sim.init_communication_state("maitri")
    asset_ids = [a["id"] for a in state["assets"]]
    assert "primary_dish" in asset_ids
    assert "radome_heater" in asset_ids
    assert "backup_terminal" in asset_ids
    assert "ground_gateway" in asset_ids

    for a in state["assets"]:
        assert "health_pct" in a
        assert "power_draw_kw" in a
        assert "status" in a
        assert "source_provenance" in a


def test_step_calm_weather():
    mock_state = {
        "station_id": "maitri",
        "environment": {"wind_speed": 22.0, "storm_severity": 0.05, "temperature": -14.0},
        "communication": comm_sim.init_communication_state("maitri"),
    }
    stepped = comm_sim.step(mock_state)
    c = stepped["communication"]
    assert c["sync_state"] == "SYNCHRONIZED"
    assert c["bandwidth_mbps"] >= 100.0
    assert c["latency_ms"] < 100
    assert c["packet_loss_pct"] < 0.5
    assert c["active_link"] == "PRIMARY"


def test_step_blizzard_attenuation():
    mock_state = {
        "station_id": "maitri",
        "environment": {"wind_speed": 98.0, "storm_severity": 0.85, "temperature": -28.0},
        "communication": comm_sim.init_communication_state("maitri"),
    }
    stepped = comm_sim.step(mock_state)
    c = stepped["communication"]
    assert c["sync_state"] == "DEGRADED"
    assert c["bandwidth_mbps"] < 100.0
    assert c["latency_ms"] > 100
    assert c["packet_loss_pct"] > 0.5
    assert c["radome_heater_active"] is True


def test_whatif_primary_link_failure():
    base = {
        "station_id": "maitri",
        "communication": comm_sim.init_communication_state("maitri"),
    }
    res = comm_sim._compute_what_if_state(base, "primary_link_failure", {})
    assert res["scenario_type"] == "primary_link_failure"
    assert res["baseline"]["bandwidth_mbps"] == 118.5
    assert res["projected"]["bandwidth_mbps"] == 22.0
    assert res["projected"]["sync_state"] == "DEGRADED"
    assert res["projected"]["data_confidence_pct"] < 90.0
    assert res["delta"]["bandwidth_delta_mbps"] < -50
    assert "recommendation" in res
    assert "protocol" in res["recommendation"]


def test_whatif_bandwidth_reduction():
    base = {
        "station_id": "maitri",
        "communication": comm_sim.init_communication_state("maitri"),
    }
    res = comm_sim._compute_what_if_state(base, "bandwidth_reduction", {"reduction_pct": 70.0})
    assert res["projected"]["bandwidth_mbps"] < 50.0
    assert res["delta"]["bandwidth_delta_mbps"] < 0


def test_whatif_high_packet_loss():
    base = {
        "station_id": "maitri",
        "communication": comm_sim.init_communication_state("maitri"),
    }
    res = comm_sim._compute_what_if_state(base, "high_packet_loss", {"packet_loss_pct": 7.5})
    assert res["projected"]["packet_loss_pct"] == 7.5
    assert res["projected"]["sync_state"] == "STALE"
    assert res["projected"]["data_confidence_pct"] <= 75.0


def test_whatif_high_latency():
    base = {
        "station_id": "maitri",
        "communication": comm_sim.init_communication_state("maitri"),
    }
    res = comm_sim._compute_what_if_state(base, "high_latency", {"latency_ms": 550})
    assert res["projected"]["latency_ms"] >= 500
    assert res["delta"]["latency_delta_ms"] > 400


def test_whatif_backup_activation_drill():
    base = {
        "station_id": "maitri",
        "communication": comm_sim.init_communication_state("maitri"),
    }
    res = comm_sim._compute_what_if_state(base, "backup_activation", {})
    assert res["projected"]["bandwidth_mbps"] == 25.0
    assert "Drill" in res["recommendation"]["title"]


def test_whatif_does_not_mutate_base_state():
    base = {
        "station_id": "maitri",
        "communication": comm_sim.init_communication_state("maitri"),
    }
    original_bw = base["communication"]["bandwidth_mbps"]
    original_status = base["communication"]["primary_status"]

    _ = comm_sim._compute_what_if_state(base, "primary_link_failure", {})

    assert base["communication"]["bandwidth_mbps"] == original_bw
    assert base["communication"]["primary_status"] == original_status
