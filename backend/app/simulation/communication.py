import random

def init_communication_state(station_id: str) -> dict:
    return {
        "primary_link": "High-Bandwidth Polar LEO Satellite",
        "backup_link": "Inmarsat BGAN / Iridium L-Band",
        "primary_status": "Online",
        "backup_status": "Standby Ready",
        "bandwidth_mbps": 120.0,
        "latency_ms": 78,
        "packet_loss_pct": 0.2,
        "radome_heater_active": True,
        "link_health": "Optimal"
    }

def step(state: dict, perturbation: dict = None) -> dict:
    comm = dict(state.get("communication", {}))
    env = state.get("environment", {})
    energy = state.get("energy", {})

    wind = env.get("wind_speed", 30.0)
    storm = env.get("storm_severity", 0.1)

    # High winds/blizzard attenuate tracking radome
    if storm > 0.7 or wind > 85.0:
        comm["bandwidth_mbps"] = round(max(5.0, 120.0 * (1.0 - storm * 0.6)), 1)
        comm["latency_ms"] = int(78 + storm * 180 + random.randint(-10, 20))
        comm["packet_loss_pct"] = round(min(18.0, storm * 12.0 + random.uniform(0.1, 1.5)), 1)
        comm["link_health"] = "Degraded by Blizzard Attenuation"
    else:
        comm["bandwidth_mbps"] = round(120.0 + random.uniform(-5.0, 5.0), 1)
        comm["latency_ms"] = int(75 + random.randint(-4, 6))
        comm["packet_loss_pct"] = round(random.uniform(0.1, 0.4), 1)
        comm["link_health"] = "Optimal"

    state["communication"] = comm
    return state
