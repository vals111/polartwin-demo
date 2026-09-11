import copy
import random
from datetime import datetime, timezone
from typing import Dict, Any, List

# ── 16 Domains Registry ────────────────────────────────────────────────────────
DOMAINS_16 = [
    {"domain_id": "energy", "name": "Energy & Microgrid Power", "route": "energy", "nominal_hz": 1.0},
    {"domain_id": "fuel", "name": "Fuel Storage & Burn Management", "route": "fuel", "nominal_hz": 0.5},
    {"domain_id": "water", "name": "Water Supply & Thermal Pipeline", "route": "water", "nominal_hz": 0.5},
    {"domain_id": "waste", "name": "Solid & Wastewater Treatment", "route": "waste", "nominal_hz": 0.2},
    {"domain_id": "supplies", "name": "Food & Life Support Supplies", "route": "inventory", "nominal_hz": 0.2},
    {"domain_id": "infrastructure", "name": "Building Structural Integrity", "route": "domains", "nominal_hz": 0.25},
    {"domain_id": "equipment", "name": "Equipment Fleet & Machinery", "route": "fleet", "nominal_hz": 0.5},
    {"domain_id": "logistics", "name": "Transportation & Overland Traverse", "route": "logistics", "nominal_hz": 0.2},
    {"domain_id": "environment", "name": "Meteorological & Atmospheric", "route": "environment", "nominal_hz": 1.0},
    {"domain_id": "communication", "name": "Satellite Link & Sync Gateway", "route": "communication", "nominal_hz": 1.0},
    {"domain_id": "personnel", "name": "Personnel, Occupancy & Human Factors", "route": "personnel", "nominal_hz": 0.5},
    {"domain_id": "research", "name": "Scientific Experiments & Lab Ops", "route": "domains", "nominal_hz": 0.5},
    {"domain_id": "safety", "name": "Life Safety & Emergency Systems", "route": "risk", "nominal_hz": 1.0},
    {"domain_id": "maintenance", "name": "Predictive Maintenance & Work Orders", "route": "domains", "nominal_hz": 0.2},
    {"domain_id": "inventory", "name": "Storage, Spares & Materials", "route": "inventory", "nominal_hz": 0.2},
    {"domain_id": "station_ops", "name": "Station Operations & Readiness", "route": "dashboard", "nominal_hz": 0.5},
]


def _build_domain_freshness_list(latency_ms: float, packet_loss_pct: float, sync_state: str) -> List[Dict[str, Any]]:
    """Generate live status for all 16 domains based on current link conditions."""
    results = []
    base_latency_sec = max(0.5, latency_ms / 1000.0)

    for item in DOMAINS_16:
        is_tier1 = item["domain_id"] in ["energy", "safety", "communication", "water"]
        is_tier2 = item["domain_id"] in ["fuel", "equipment", "personnel", "environment", "research"]

        if sync_state == "DISCONNECTED":
            freshness_sec = round(35.0 + random.uniform(5.0, 20.0), 1)
            freshness_state = "STALE"
            quality_score = round(max(30.0, 50.0 - random.uniform(5.0, 15.0)), 1)
        elif sync_state == "STALE":
            multiplier = 3.0 if is_tier1 else 6.0
            freshness_sec = round(base_latency_sec * multiplier + random.uniform(3.0, 8.0), 1)
            freshness_state = "STALE" if freshness_sec > 8.0 else "DELAYED"
            quality_score = round(max(60.0, 80.0 - packet_loss_pct * 3.5), 1)
        elif sync_state == "DEGRADED":
            multiplier = 1.2 if is_tier1 else (2.0 if is_tier2 else 3.5)
            freshness_sec = round(base_latency_sec * multiplier + random.uniform(0.5, 2.0), 1)
            freshness_state = "DELAYED" if freshness_sec > 3.0 else "LIVE"
            quality_score = round(max(75.0, 92.0 - packet_loss_pct * 2.0), 1)
        else:  # SYNCHRONIZED
            jitter = random.uniform(0.1, 0.6) if is_tier1 else random.uniform(0.3, 1.1)
            freshness_sec = round(base_latency_sec + jitter, 1)
            freshness_state = "LIVE"
            quality_score = round(min(100.0, 99.5 - packet_loss_pct * 0.5), 1)

        samples_min = int(item["nominal_hz"] * 60 * (quality_score / 100.0))

        results.append({
            "domain_id": item["domain_id"],
            "name": item["name"],
            "route": item["route"],
            "last_update_sec": freshness_sec,
            "freshness_state": freshness_state,
            "samples_per_min": samples_min,
            "quality_score_pct": quality_score,
            "packet_arrival_rate": f"{round(max(0.0, 100.0 - packet_loss_pct), 1)}%",
            "tier": 1 if is_tier1 else (2 if is_tier2 else 3),
        })
    return results


def _build_history_series(bandwidth_nominal: float, latency_nominal: float, loss_nominal: float) -> List[Dict[str, Any]]:
    """Build a realistic 20-point historical telemetry buffer for ECharts."""
    points = []
    for i in range(20, 0, -1):
        t_sec = i * 4
        bw_jitter = random.uniform(-4.0, 4.0)
        lat_jitter = random.randint(-5, 8)
        loss_jitter = random.uniform(-0.02, 0.03)

        bw = round(max(10.0, bandwidth_nominal + bw_jitter), 1)
        lat = int(max(40, latency_nominal + lat_jitter))
        loss = round(max(0.01, loss_nominal + loss_jitter), 2)
        fresh = round(max(0.8, lat / 1000.0 + random.uniform(0.2, 0.6)), 1)

        points.append({
            "t_minus_sec": t_sec,
            "bandwidth_mbps": bw,
            "latency_ms": lat,
            "packet_loss_pct": loss,
            "freshness_sec": fresh,
        })
    return points


def init_communication_state(station_id: str) -> dict:
    is_maitri = station_id == "maitri"

    if is_maitri:
        station_name = "Maitri Antarctic Station"
        antenna_config = "Single 2.4m Tracking Radome (Polar LEO X/S/Ku Band)"
        backup_config = "Inmarsat BGAN Global Broadband Terminal (L-Band)"
        ground_gateway = "NCAOR Ground Sync Gateway (Goa, India)"
        bw_cap = 120.0
        bw_curr = 118.5
        bw_util = 68.2
        latency_nom = 78
        loss_nom = 0.05
        stream_rate = 250
        power_draw = 3.8
        radome_temp = 3.8
        tracking_err = 0.03
        dishes_count = 1
    else:
        station_name = "Bharati Antarctic Station"
        antenna_config = "Dual 3.0m Tracking Radomes (LEO + Geostationary Ku-Band Overlay)"
        backup_config = "Iridium Certus 700 Multi-Orbit Terminal (L-Band)"
        ground_gateway = "NCAOR Goa Primary + IMD Colaba Secondary"
        bw_cap = 160.0
        bw_curr = 157.2
        bw_util = 62.4
        latency_nom = 62
        loss_nom = 0.02
        stream_rate = 350
        power_draw = 5.2
        radome_temp = 4.5
        tracking_err = 0.02
        dishes_count = 2

    qos_tiers = [
        {
            "id": "tier_1",
            "tier_number": 1,
            "name": "Tier 1: Life Safety, SCADA & Power Telemetry",
            "short_name": "Life Safety & SCADA",
            "priority": "CRITICAL",
            "status": "GUARANTEED",
            "allocation_pct": 35,
            "current_mbps": round(bw_curr * 0.35 * (bw_util / 100.0), 1),
            "guaranteed_mbps": 15.0,
            "packets_dropped": 0,
            "color": "text-emerald-400",
            "bg_color": "bg-emerald-500/20 border-emerald-500/40",
            "description": "Life-support monitors, HVAC, microgrid relays, fire alarms, and personnel vitals.",
        },
        {
            "id": "tier_2",
            "tier_number": 2,
            "name": "Tier 2: Scientific Data & Earth Observations",
            "short_name": "Scientific & Earth Obs",
            "priority": "HIGH",
            "status": "NORMAL",
            "allocation_pct": 45,
            "current_mbps": round(bw_curr * 0.45 * (bw_util / 100.0), 1),
            "guaranteed_mbps": 20.0,
            "packets_dropped": 12 if is_maitri else 5,
            "color": "text-cyan-400",
            "bg_color": "bg-cyan-500/20 border-cyan-500/40",
            "description": "Seismological telemetry, atmospheric lidar, magnetosphere, and oceanographic data.",
        },
        {
            "id": "tier_3",
            "tier_number": 3,
            "name": "Tier 3: Crew Welfare, Voice & General Traffic",
            "short_name": "Crew Welfare & Voice",
            "priority": "NORMAL",
            "status": "NORMAL",
            "allocation_pct": 20,
            "current_mbps": round(bw_curr * 0.20 * (bw_util / 100.0), 1),
            "guaranteed_mbps": 5.0,
            "packets_dropped": 28 if is_maitri else 14,
            "color": "text-slate-300",
            "bg_color": "bg-slate-500/20 border-slate-500/40",
            "description": "VoIP voice calls, personal email, web access, telemedicine, and logistics dispatch.",
        },
    ]

    assets = [
        {
            "id": "primary_dish",
            "name": "Primary Tracking Antenna Dish",
            "subsystem": "Tracking & RF Feed",
            "status": "ONLINE",
            "health_pct": 98.5,
            "power_draw_kw": power_draw,
            "power_source": "Essential Instrumentation Bus (Grid Fed)",
            "operating_condition": f"Dual-Axis Tracking • {dishes_count}x Dish Active",
            "tracking_error_deg": tracking_err,
            "recent_event": "Pass acquisition lock confirmed at 52° elevation",
            "maintenance_status": "Inspected 14 days ago — Motor bearings nominal",
            "backup_available": True,
            "source_provenance": "ENGINEERING ASSUMPTION",
        },
        {
            "id": "radome_heater",
            "name": "Radome Shell De-icer & Environmental Shield",
            "subsystem": "Thermal Enclosure",
            "status": "OPERATIONAL",
            "health_pct": 96.0,
            "power_draw_kw": 2.2 if is_maitri else 3.0,
            "power_source": "Heating & Auxiliary Sub-panel",
            "operating_condition": f"Temperature {radome_temp}°C • De-icer Active",
            "wind_limit_kmh": 120.0,
            "recent_event": "Thermostatic heating pulse cycled (Duty Cycle 65%)",
            "maintenance_status": "Heating elements impedance balanced",
            "backup_available": True,
            "source_provenance": "ENGINEERING ASSUMPTION",
        },
        {
            "id": "backup_terminal",
            "name": "Emergency Secondary Terminal",
            "subsystem": "Autonomous Failover Link",
            "status": "STANDBY READY",
            "health_pct": 100.0,
            "power_draw_kw": 0.4,
            "power_source": "Uninterruptible DC Battery Bank (UPS)",
            "operating_condition": "Continuous Carrier Beacon Monitoring",
            "switchover_time_sec": 12,
            "bandwidth_cap_mbps": 25.0,
            "recent_event": "Automated heartbeat loop test verified at 04:00 UTC",
            "maintenance_status": "Ready for instant automated failover switch",
            "backup_available": True,
            "source_provenance": "SIMULATED",
        },
        {
            "id": "ground_gateway",
            "name": "NCAOR Goa Ground Sync Gateway",
            "subsystem": "Mainland Ingestion Bridge",
            "status": "CONNECTED",
            "health_pct": 99.4,
            "power_draw_kw": 0.0,
            "power_source": "NCAOR Goa Data Center Dual Grid + Diesel Generator",
            "operating_condition": "Bi-directional WebSocket & Kafka Stream Ingestion",
            "rx_buffer_mb": 4.2,
            "packets_received": 1420800 if is_maitri else 1856200,
            "recent_event": "Digital Twin ingestion sync acknowledged (CRC verified)",
            "maintenance_status": "Cluster node redundancy active",
            "backup_available": True,
            "source_provenance": "REFERENCE",
        },
    ]

    sync_state = "SYNCHRONIZED"
    domain_freshness = _build_domain_freshness_list(latency_nom, loss_nom, sync_state)
    history = _build_history_series(bw_curr, latency_nom, loss_nom)

    return {
        "station_id": station_id,
        "station_name": station_name,
        "antenna_config": antenna_config,
        "backup_config": backup_config,
        "ground_gateway": ground_gateway,
        "primary_link": "High-Bandwidth Polar LEO Satellite",
        "backup_link": backup_config,
        "primary_status": "ONLINE",
        "backup_status": "STANDBY READY",
        "active_link": "PRIMARY",
        "bandwidth_mbps": bw_curr,
        "bandwidth_capacity_mbps": bw_cap,
        "bandwidth_utilization_pct": bw_util,
        "available_capacity_mbps": round(bw_cap - bw_curr * (bw_util / 100.0), 1),
        "traffic_trend": "NORMAL",
        "latency_ms": latency_nom,
        "latency_avg_ms": latency_nom - 2,
        "latency_peak_ms": latency_nom + 16,
        "latency_jitter_ms": 3 if is_maitri else 2,
        "latency_trend": "STABLE",
        "packet_loss_pct": loss_nom,
        "packets_sent": 842100 if is_maitri else 1120400,
        "packets_received": 841678 if is_maitri else 1120176,
        "packets_dropped": 422 if is_maitri else 224,
        "packet_loss_status": "OPTIMAL",
        "telemetry_freshness_sec": 1.4 if is_maitri else 1.1,
        "expected_interval_sec": 2.0,
        "sync_state": sync_state,
        "data_completeness_pct": 99.8 if is_maitri else 99.9,
        "data_confidence_pct": 99.4 if is_maitri else 99.8,
        "link_health": "Optimal",
        "stream_rate_samples_sec": stream_rate,
        "last_sync_timestamp": datetime.now(timezone.utc).isoformat(),
        "radome_heater_active": True,
        "power_draw_kw": power_draw,
        "radome_temp_c": radome_temp,
        "tracking_error_deg": tracking_err,
        "qos_tiers": qos_tiers,
        "assets": assets,
        "domains_freshness": domain_freshness,
        "history": history,
        "anomalies": [],
        "communication_risk": {
            "overall_risk_score": 2.0 if is_maitri else 1.5,
            "level": "LOW",
            "link_health_factor": 98.5,
            "freshness_factor": 99.0,
            "packet_integrity_factor": 99.8,
            "backup_readiness_factor": 100.0,
            "operational_visibility_impact": "Minimal — 100% Digital Twin telemetry coverage intact across all 16 domains.",
            "station_risk_contribution": 1.5,
        },
    }


def step(state: dict, perturbation: dict = None) -> dict:
    """
    Simulation step for Communication domain.
    Couples with Environment:
    - High winds (>85 km/h) or Blizzard: RF attenuation, servo tracking wobble, latency surge.
    - Cold ambient: increases radome heating power draw.
    - QoS traffic shaping: throttles Tier 3 then Tier 2 if bandwidth drops, protecting Tier 1.
    - Updates 16-domain telemetry freshness and computes real-time data confidence.
    """
    station_id = state.get("station_id", "maitri")
    comm = dict(state.get("communication", {}))
    if not comm.get("qos_tiers"):
        comm = init_communication_state(station_id)

    env = state.get("environment", {})
    wind = env.get("wind_speed", 30.0)
    storm = env.get("storm_severity", 0.1)
    temp = env.get("temperature", -20.0)

    is_primary_failed = False
    bandwidth_override = None
    packet_loss_spike = None
    latency_spike = None

    if perturbation:
        if perturbation.get("primary_link_failed"):
            is_primary_failed = True
        if "comm_bandwidth_mbps" in perturbation:
            bandwidth_override = float(perturbation["comm_bandwidth_mbps"])
        if "comm_packet_loss_pct" in perturbation:
            packet_loss_spike = float(perturbation["comm_packet_loss_pct"])
        if "comm_latency_ms" in perturbation:
            latency_spike = int(perturbation["comm_latency_ms"])

    bw_cap = float(comm.get("bandwidth_capacity_mbps", 120.0))
    nom_latency = 78 if station_id == "maitri" else 62
    weather_attenuation = storm > 0.65 or wind > 80.0

    if is_primary_failed:
        comm["active_link"] = "BACKUP"
        comm["primary_status"] = "OFFLINE"
        comm["backup_status"] = "ACTIVE (FAILOVER)"
        comm["bandwidth_mbps"] = 22.0
        comm["bandwidth_utilization_pct"] = 92.5
        comm["latency_ms"] = 480 + random.randint(-20, 30)
        comm["packet_loss_pct"] = round(4.2 + random.uniform(-0.3, 0.5), 2)
        comm["link_health"] = "Degraded (Operating on Inmarsat/Iridium Backup)"
        comm["sync_state"] = "DEGRADED"
        comm["data_confidence_pct"] = 81.5
        comm["telemetry_freshness_sec"] = 14.5
    elif weather_attenuation:
        attenuation_factor = min(0.6, storm * 0.5 + (wind - 70.0) * 0.005)
        comm["active_link"] = "PRIMARY"
        comm["primary_status"] = "ONLINE"
        comm["bandwidth_mbps"] = round(max(35.0, bw_cap * (1.0 - attenuation_factor)), 1)
        comm["bandwidth_utilization_pct"] = round(min(98.0, 75.0 + storm * 20.0), 1)
        comm["latency_ms"] = int(nom_latency + storm * 120 + random.randint(-8, 15))
        comm["packet_loss_pct"] = round(min(3.5, 0.2 + storm * 2.8 + random.uniform(0.05, 0.2)), 2)
        comm["link_health"] = "Blizzard Atmospheric Attenuation"
        comm["sync_state"] = "DEGRADED"
        comm["data_confidence_pct"] = round(max(78.0, 99.0 - storm * 18.0), 1)
        comm["telemetry_freshness_sec"] = round(2.8 + storm * 3.5, 1)
        comm["tracking_error_deg"] = round(min(0.25, 0.04 + (wind / 100.0) * 0.12), 3)
    else:
        comm["active_link"] = "PRIMARY"
        comm["primary_status"] = "ONLINE"
        comm["backup_status"] = "STANDBY READY"
        comm["bandwidth_mbps"] = round(bw_cap + random.uniform(-3.5, 2.5), 1)
        comm["bandwidth_utilization_pct"] = round(64.0 + random.uniform(-3.0, 3.0), 1)
        comm["latency_ms"] = int(nom_latency + random.randint(-4, 5))
        comm["packet_loss_pct"] = round(max(0.01, 0.04 + random.uniform(-0.02, 0.02)), 2)
        comm["link_health"] = "Optimal"
        comm["sync_state"] = "SYNCHRONIZED"
        comm["data_confidence_pct"] = round(99.4 + random.uniform(-0.2, 0.3), 1)
        comm["telemetry_freshness_sec"] = round(1.2 + random.uniform(-0.2, 0.3), 1)
        comm["tracking_error_deg"] = round(0.02 + random.uniform(0.005, 0.015), 3)

    if bandwidth_override is not None:
        comm["bandwidth_mbps"] = bandwidth_override
    if packet_loss_spike is not None:
        comm["packet_loss_pct"] = packet_loss_spike
    if latency_spike is not None:
        comm["latency_ms"] = latency_spike

    if temp < -15.0:
        comm["radome_heater_active"] = True
        comm["radome_temp_c"] = round(3.5 + random.uniform(-0.4, 0.4), 1)
        comm["power_draw_kw"] = round(comm["power_draw_kw"] * 1.15, 2)
    else:
        comm["radome_temp_c"] = round(5.2 + random.uniform(-0.3, 0.5), 1)

    # Dynamic QoS Traffic Shaping
    curr_bw = comm["bandwidth_mbps"]
    qos = copy.deepcopy(comm.get("qos_tiers", []))
    if curr_bw < 30.0:
        for t in qos:
            if t["tier_number"] == 1:
                t["status"] = "GUARANTEED (PROTECTED)"
                t["current_mbps"] = round(min(18.0, curr_bw * 0.70), 1)
                t["packets_dropped"] = 0
            elif t["tier_number"] == 2:
                t["status"] = "THROTTLED (50% REDUCED)"
                t["current_mbps"] = round(curr_bw * 0.25, 1)
                t["packets_dropped"] = random.randint(45, 120)
            elif t["tier_number"] == 3:
                t["status"] = "SUSPENDED"
                t["current_mbps"] = round(curr_bw * 0.05, 1)
                t["packets_dropped"] = random.randint(150, 320)
    elif curr_bw < 60.0:
        for t in qos:
            if t["tier_number"] == 1:
                t["status"] = "GUARANTEED"
                t["current_mbps"] = round(curr_bw * 0.40, 1)
                t["packets_dropped"] = 0
            elif t["tier_number"] == 2:
                t["status"] = "ACTIVE"
                t["current_mbps"] = round(curr_bw * 0.45, 1)
                t["packets_dropped"] = random.randint(5, 20)
            elif t["tier_number"] == 3:
                t["status"] = "THROTTLED (QoS CAPPED)"
                t["current_mbps"] = round(curr_bw * 0.15, 1)
                t["packets_dropped"] = random.randint(25, 60)
    else:
        for t in qos:
            t["status"] = "GUARANTEED" if t["tier_number"] == 1 else "NORMAL"
            share = 0.35 if t["tier_number"] == 1 else (0.45 if t["tier_number"] == 2 else 0.20)
            t["current_mbps"] = round(curr_bw * share * (comm["bandwidth_utilization_pct"] / 100.0), 1)
            t["packets_dropped"] = 0 if t["tier_number"] == 1 else random.randint(1, 10)

    comm["qos_tiers"] = qos
    comm["domains_freshness"] = _build_domain_freshness_list(
        comm["latency_ms"], comm["packet_loss_pct"], comm["sync_state"]
    )

    vis_loss = 0.0
    if comm["sync_state"] == "DEGRADED":
        vis_loss = 12.0
    elif comm["sync_state"] == "STALE":
        vis_loss = 28.0
    elif comm["sync_state"] == "DISCONNECTED":
        vis_loss = 45.0

    comm_risk_score = round(min(100.0, 2.0 + vis_loss + comm["packet_loss_pct"] * 2.0), 1)
    comm["communication_risk"] = {
        "overall_risk_score": comm_risk_score,
        "level": "CRITICAL" if comm_risk_score > 60 else ("HIGH" if comm_risk_score > 35 else ("MEDIUM" if comm_risk_score > 15 else "LOW")),
        "link_health_factor": round(max(10.0, 100.0 - (comm["packet_loss_pct"] * 10.0)), 1),
        "freshness_factor": round(max(20.0, 100.0 - (comm["telemetry_freshness_sec"] * 3.5)), 1),
        "packet_integrity_factor": round(max(50.0, 100.0 - comm["packet_loss_pct"]), 1),
        "backup_readiness_factor": 100.0 if comm["backup_status"] in ["STANDBY READY", "ACTIVE (FAILOVER)"] else 40.0,
        "operational_visibility_impact": (
            "Severe operational visibility impairment — Digital Twin telemetry delayed."
            if comm_risk_score > 35
            else "Minor/nominal visibility impact — Telemetry stream healthy."
        ),
        "station_risk_contribution": round(comm_risk_score * 0.15, 1),
    }

    anomalies = []
    if comm["latency_ms"] > 250:
        anomalies.append({
            "id": "lat_spike",
            "title": "Severe Latency Surge Detected",
            "metric": f"{comm['latency_ms']} ms",
            "threshold": "250 ms",
            "severity": "CRITICAL" if comm["latency_ms"] > 400 else "HIGH",
            "description": "Round-trip ping exceeds threshold. Remote command responsiveness degraded.",
            "impact": "Operator control loop delayed. Telemetry sync interval extended.",
        })
    if comm["packet_loss_pct"] > 2.0:
        anomalies.append({
            "id": "loss_spike",
            "title": "Elevated Packet Drop Rate",
            "metric": f"{comm['packet_loss_pct']}%",
            "threshold": "2.0%",
            "severity": "HIGH",
            "description": "Excessive packet loss causing TCP retransmissions and buffer queuing.",
            "impact": "Lower tier science telemetry streams throttled to protect SCADA.",
        })
    if comm["telemetry_freshness_sec"] > 5.0:
        anomalies.append({
            "id": "freshness_stale",
            "title": "Digital Twin Telemetry Stale",
            "metric": f"{comm['telemetry_freshness_sec']}s",
            "threshold": "5.0s",
            "severity": "MEDIUM",
            "description": "Station telemetry updates arriving slower than nominal 2-second rate.",
            "impact": "Ground station twins reflect delayed states; predictive confidence reduced.",
        })
    comm["anomalies"] = anomalies

    hist = list(comm.get("history", []))
    hist.append({
        "t_minus_sec": 0,
        "bandwidth_mbps": comm["bandwidth_mbps"],
        "latency_ms": comm["latency_ms"],
        "packet_loss_pct": comm["packet_loss_pct"],
        "freshness_sec": comm["telemetry_freshness_sec"],
    })
    if len(hist) > 20:
        hist = hist[-20:]
    for idx, item in enumerate(hist):
        item["t_minus_sec"] = (len(hist) - 1 - idx) * 4
    comm["history"] = hist

    comm["last_sync_timestamp"] = datetime.now(timezone.utc).isoformat()
    state["communication"] = comm
    return state


def _compute_what_if_state(base_state: dict, scenario_type: str, params: dict) -> dict:
    """
    Executes an isolated What-If scenario on a deep copy of base_state.
    Never modifies live Digital Twin state.
    """
    cloned_state = copy.deepcopy(base_state)
    station_id = cloned_state.get("station_id", "maitri")

    comm = cloned_state.get("communication", {})
    if not comm.get("qos_tiers"):
        comm = init_communication_state(station_id)
        cloned_state["communication"] = comm

    base_comm = copy.deepcopy(comm)

    if scenario_type == "primary_link_failure":
        cloned_state["communication"]["active_link"] = "BACKUP"
        cloned_state["communication"]["primary_status"] = "OFFLINE"
        cloned_state["communication"]["backup_status"] = "ACTIVE (FAILOVER)"
        cloned_state["communication"]["bandwidth_mbps"] = 22.0
        cloned_state["communication"]["bandwidth_utilization_pct"] = 94.0
        cloned_state["communication"]["latency_ms"] = 480
        cloned_state["communication"]["packet_loss_pct"] = 4.8
        cloned_state["communication"]["telemetry_freshness_sec"] = 14.5
        cloned_state["communication"]["sync_state"] = "DEGRADED"
        cloned_state["communication"]["data_confidence_pct"] = 81.0
        cloned_state["communication"]["link_health"] = "Degraded (BGAN/Iridium Failover Active)"

        for a in cloned_state["communication"].get("assets", []):
            if a["id"] == "primary_dish":
                a["status"] = "OFFLINE (AZIMUTH SERVO FAULT)"
                a["health_pct"] = 15.0
            elif a["id"] == "backup_terminal":
                a["status"] = "ACTIVE (TRANSMITTING)"
                a["health_pct"] = 98.0

        rec = {
            "title": "Primary Tracking Dish Failure & Failover Protocol",
            "rationale": "Primary Polar LEO satellite tracking antenna lost RF lock. Autonomous failover seamlessly switched traffic to secondary L-band satellite link.",
            "actions": [
                "Automated QoS Tier 1 priority established: 100% Life Safety, HVAC, Microgrid, and SCADA telemetry protected.",
                "Throttled Tier 2 (Science) to 4 Mbps; suspended Tier 3 (Crew personal voice/video uplink) to conserve 22 Mbps pipe.",
                "Local station edge buffer storing high-frequency science logs for batch sync upon primary dish restoration.",
                "Dispatching outdoor engineering team to inspect 2.4m radome azimuth drive once wind speed drops below 60 km/h.",
            ],
            "protocol": "SOP-COMM-FAILOVER-04: L-Band Emergency Bandwidth Conservation",
        }

    elif scenario_type == "bandwidth_reduction":
        drop_pct = params.get("reduction_pct", 65.0)
        curr_bw = base_comm.get("bandwidth_mbps", 120.0)
        new_bw = round(max(18.0, curr_bw * (1.0 - drop_pct / 100.0)), 1)

        cloned_state["communication"]["bandwidth_mbps"] = new_bw
        cloned_state["communication"]["bandwidth_utilization_pct"] = 96.0
        cloned_state["communication"]["latency_ms"] = base_comm["latency_ms"] + 45
        cloned_state["communication"]["packet_loss_pct"] = round(base_comm["packet_loss_pct"] + 1.2, 2)
        cloned_state["communication"]["telemetry_freshness_sec"] = 4.2
        cloned_state["communication"]["sync_state"] = "DEGRADED"
        cloned_state["communication"]["data_confidence_pct"] = 89.0
        cloned_state["communication"]["link_health"] = f"Constrained Capacity ({drop_pct}% Reduction)"

        rec = {
            "title": "Transponder Capacity Throttling & Traffic Shaping",
            "rationale": f"Transponder contention reduced available bandwidth by {drop_pct}%. Dynamic QoS enforcement prevents packet drop on critical SCADA telemetry.",
            "actions": [
                "Enforce Tier 3 rate limit (capped at 2 Mbps) to preserve headroom for microgrid and life support telemetry.",
                "Pause uncompressed hyperspectral satellite downlink transfers; queue archives locally.",
                "Telemetry freshness stabilized at 4.2s — Digital Twin state remains operational with 89% confidence.",
            ],
            "protocol": "SOP-COMM-QOS-02: Dynamic Congestion Management",
        }

    elif scenario_type == "high_packet_loss":
        target_loss = params.get("packet_loss_pct", 6.8)
        cloned_state["communication"]["packet_loss_pct"] = target_loss
        cloned_state["communication"]["latency_ms"] = base_comm["latency_ms"] + 95
        cloned_state["communication"]["telemetry_freshness_sec"] = 9.8
        cloned_state["communication"]["sync_state"] = "STALE"
        cloned_state["communication"]["data_confidence_pct"] = 74.0
        cloned_state["communication"]["link_health"] = f"Severe Packet Drop ({target_loss}%)"

        rec = {
            "title": "Ionospheric Scintillation & Packet Loss Surge",
            "rationale": f"Severe auroral/ionospheric disturbance induced {target_loss}% packet loss, causing TCP retransmission congestion and delayed frame validation.",
            "actions": [
                "Switch critical telemetry protocol from TCP to lightweight redundant UDP-FEC forward error correction.",
                "Increase ground gateway sync acknowledgment timeout from 2.0s to 8.0s.",
                "Alert operators that Digital Twin state reflects 9.8-second delayed telemetry until solar flare subsides.",
            ],
            "protocol": "SOP-COMM-SCINT-01: Auroral Ionospheric Mitigation",
        }

    elif scenario_type == "high_latency":
        target_lat = params.get("latency_ms", 520)
        cloned_state["communication"]["latency_ms"] = target_lat
        cloned_state["communication"]["latency_peak_ms"] = target_lat + 80
        cloned_state["communication"]["latency_jitter_ms"] = 35
        cloned_state["communication"]["telemetry_freshness_sec"] = 3.8
        cloned_state["communication"]["sync_state"] = "DEGRADED"
        cloned_state["communication"]["data_confidence_pct"] = 91.0
        cloned_state["communication"]["link_health"] = f"High Latency Delay ({target_lat}ms)"

        rec = {
            "title": "Multi-hop Satellite Routing Delay Mitigation",
            "rationale": f"Ground gateway routing reconfigured via multi-hop inter-satellite cross-links, elevating latency to {target_lat}ms.",
            "actions": [
                "Inhibit automated closed-loop remote actuation from mainland India; switch critical systems to local autonomous control.",
                "Maintain continuous telemetry streaming while logging timestamped packet sequencing.",
                "Verify ground gateway clock synchronization via PTP/NTP time servers.",
            ],
            "protocol": "SOP-COMM-LAT-03: Autonomous Remote Safety Interlock",
        }

    else:  # backup_activation
        cloned_state["communication"]["active_link"] = "BACKUP"
        cloned_state["communication"]["primary_status"] = "STANDBY (MAINTENANCE)"
        cloned_state["communication"]["backup_status"] = "ACTIVE (TEST DRILL)"
        cloned_state["communication"]["bandwidth_mbps"] = 25.0
        cloned_state["communication"]["bandwidth_utilization_pct"] = 72.0
        cloned_state["communication"]["latency_ms"] = 390
        cloned_state["communication"]["packet_loss_pct"] = 0.8
        cloned_state["communication"]["telemetry_freshness_sec"] = 4.5
        cloned_state["communication"]["sync_state"] = "DEGRADED"
        cloned_state["communication"]["data_confidence_pct"] = 92.5
        cloned_state["communication"]["link_health"] = "Operational Drill (Secondary BGAN Active)"

        rec = {
            "title": "Scheduled Secondary Communication Link Verification Drill",
            "rationale": "Routine quarterly failover drill to validate autonomous switchover times, throughput, and QoS enforcement on backup L-band carrier.",
            "actions": [
                "Verified switchover completed in 11.4 seconds with zero loss of Tier 1 SCADA telemetry.",
                "Confirmed Tier 1 Life Safety queue guaranteed 15 Mbps with 0 dropped frames.",
                "Drill successful: Return to Primary high-bandwidth LEO dish scheduled in 30 minutes.",
            ],
            "protocol": "SOP-COMM-DRILL-07: Secondary Uplink Compliance Verification",
        }

    # Apply QoS and domain updates to projected clone
    curr_bw = cloned_state["communication"]["bandwidth_mbps"]
    qos = copy.deepcopy(cloned_state["communication"].get("qos_tiers", []))
    if curr_bw < 30.0:
        for t in qos:
            if t["tier_number"] == 1:
                t["status"] = "GUARANTEED (PROTECTED)"
                t["current_mbps"] = round(min(18.0, curr_bw * 0.70), 1)
                t["packets_dropped"] = 0
            elif t["tier_number"] == 2:
                t["status"] = "THROTTLED (50% REDUCED)"
                t["current_mbps"] = round(curr_bw * 0.25, 1)
                t["packets_dropped"] = 65
            elif t["tier_number"] == 3:
                t["status"] = "SUSPENDED"
                t["current_mbps"] = round(curr_bw * 0.05, 1)
                t["packets_dropped"] = 210
    elif curr_bw < 60.0:
        for t in qos:
            if t["tier_number"] == 1:
                t["status"] = "GUARANTEED"
                t["current_mbps"] = round(curr_bw * 0.40, 1)
                t["packets_dropped"] = 0
            elif t["tier_number"] == 2:
                t["status"] = "ACTIVE"
                t["current_mbps"] = round(curr_bw * 0.45, 1)
                t["packets_dropped"] = 12
            elif t["tier_number"] == 3:
                t["status"] = "THROTTLED (QoS CAPPED)"
                t["current_mbps"] = round(curr_bw * 0.15, 1)
                t["packets_dropped"] = 45
    else:
        for t in qos:
            t["status"] = "GUARANTEED" if t["tier_number"] == 1 else "NORMAL"
            share = 0.35 if t["tier_number"] == 1 else (0.45 if t["tier_number"] == 2 else 0.20)
            t["current_mbps"] = round(curr_bw * share * (cloned_state["communication"].get("bandwidth_utilization_pct", 65.0) / 100.0), 1)
            t["packets_dropped"] = 0 if t["tier_number"] == 1 else 5

    cloned_state["communication"]["qos_tiers"] = qos
    cloned_state["communication"]["domains_freshness"] = _build_domain_freshness_list(
        cloned_state["communication"]["latency_ms"],
        cloned_state["communication"]["packet_loss_pct"],
        cloned_state["communication"]["sync_state"]
    )

    vis_loss = 0.0
    s_state = cloned_state["communication"]["sync_state"]
    if s_state == "DEGRADED":
        vis_loss = 15.0
    elif s_state == "STALE":
        vis_loss = 28.0
    elif s_state == "DISCONNECTED":
        vis_loss = 45.0

    comm_risk_score = round(min(100.0, 2.0 + vis_loss + cloned_state["communication"]["packet_loss_pct"] * 2.0), 1)
    cloned_state["communication"]["communication_risk"] = {
        "overall_risk_score": comm_risk_score,
        "level": "CRITICAL" if comm_risk_score > 60 else ("HIGH" if comm_risk_score > 35 else ("MEDIUM" if comm_risk_score > 15 else "LOW")),
        "link_health_factor": round(max(10.0, 100.0 - (cloned_state["communication"]["packet_loss_pct"] * 10.0)), 1),
        "freshness_factor": round(max(20.0, 100.0 - (cloned_state["communication"]["telemetry_freshness_sec"] * 3.5)), 1),
        "packet_integrity_factor": round(max(50.0, 100.0 - cloned_state["communication"]["packet_loss_pct"]), 1),
        "backup_readiness_factor": 100.0,
        "operational_visibility_impact": (
            "Severe operational visibility impairment — Digital Twin telemetry delayed."
            if comm_risk_score > 35
            else "Minor/nominal visibility impact — Telemetry stream healthy."
        ),
        "station_risk_contribution": round(comm_risk_score * 0.15, 1),
    }
    proj_comm = cloned_state["communication"]

    return {
        "scenario_type": scenario_type,
        "baseline": {
            "bandwidth_mbps": base_comm.get("bandwidth_mbps", 120.0),
            "latency_ms": base_comm.get("latency_ms", 78),
            "packet_loss_pct": base_comm.get("packet_loss_pct", 0.05),
            "telemetry_freshness_sec": base_comm.get("telemetry_freshness_sec", 1.4),
            "sync_state": base_comm.get("sync_state", "SYNCHRONIZED"),
            "data_confidence_pct": base_comm.get("data_confidence_pct", 99.4),
            "link_health": base_comm.get("link_health", "Optimal"),
            "tier1_status": "GUARANTEED",
            "tier2_status": "NORMAL",
            "tier3_status": "NORMAL",
            "risk_score": base_comm.get("communication_risk", {}).get("overall_risk_score", 2.0),
        },
        "projected": {
            "bandwidth_mbps": proj_comm.get("bandwidth_mbps", 22.0),
            "latency_ms": proj_comm.get("latency_ms", 480),
            "packet_loss_pct": proj_comm.get("packet_loss_pct", 4.8),
            "telemetry_freshness_sec": proj_comm.get("telemetry_freshness_sec", 14.5),
            "sync_state": proj_comm.get("sync_state", "DEGRADED"),
            "data_confidence_pct": proj_comm.get("data_confidence_pct", 81.0),
            "link_health": proj_comm.get("link_health", "Degraded"),
            "tier1_status": proj_comm.get("qos_tiers", [{}])[0].get("status", "GUARANTEED"),
            "tier2_status": proj_comm.get("qos_tiers", [{}, {}])[1].get("status", "THROTTLED"),
            "tier3_status": proj_comm.get("qos_tiers", [{}, {}, {}])[2].get("status", "SUSPENDED"),
            "risk_score": proj_comm.get("communication_risk", {}).get("overall_risk_score", 22.0),
        },
        "delta": {
            "bandwidth_delta_mbps": round(proj_comm.get("bandwidth_mbps", 22.0) - base_comm.get("bandwidth_mbps", 120.0), 1),
            "latency_delta_ms": proj_comm.get("latency_ms", 480) - base_comm.get("latency_ms", 78),
            "packet_loss_delta_pct": round(proj_comm.get("packet_loss_pct", 4.8) - base_comm.get("packet_loss_pct", 0.05), 2),
            "freshness_delta_sec": round(proj_comm.get("telemetry_freshness_sec", 14.5) - base_comm.get("telemetry_freshness_sec", 1.4), 1),
            "confidence_delta_pct": round(proj_comm.get("data_confidence_pct", 81.0) - base_comm.get("data_confidence_pct", 99.4), 1),
            "risk_delta_pts": round(proj_comm.get("communication_risk", {}).get("overall_risk_score", 22.0) - base_comm.get("communication_risk", {}).get("overall_risk_score", 2.0), 1),
        },
        "recommendation": rec,
        "cloned_state": proj_comm,
    }
