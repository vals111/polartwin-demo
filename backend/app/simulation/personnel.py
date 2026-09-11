"""
Personnel, Occupancy & Human Factors Simulation Module for POLARTWIN
Implements the core Antarctic Digital Twin lifecycle:
Personnel → Role → Location → Activity → Occupancy → Resource Demand → Operational Impact → Safety/Risk

This is a socio-technical domain, not a headcount page.
- Personnel activity drives Energy, Water, Food, Waste, Equipment, Research demand
- Field deployment links to Weather/Environment and Exposure risk
- Workforce condition (aggregate fatigue) links to operational coverage and risk
- Each role group is modeled with activity, deployment, and resource contribution

Cross-domain coupling outputs:
  energy.personnel_base_load_kw  ← headcount × per_capita_kw + activity_kw
  water.personnel_demand_l_day   ← headcount × per_capita_water_l
  supplies.food_demand_kcal_day  ← headcount × per_capita_kcal
  waste.personnel_waste_kg_day   ← headcount × per_capita_waste_kg
  equipment.operator_coverage_pct ← engineer availability
  research.research_readiness_pct ← scientist availability
  safety.field_exposure_risk      ← field team count + weather
"""
import copy
import math
from typing import Dict, Any

# ─── Diurnal schedule: 8 time blocks driving demand multiplier ───────────────
DIURNAL_BLOCKS = [
    {"hour_start": 0,  "hour_end": 6,  "label": "Night Watch",             "demand_mult": 0.40, "primary_activity": "Night systems monitoring; minimal station movement", "color": "indigo"},
    {"hour_start": 6,  "hour_end": 8,  "label": "Morning Prep",            "demand_mult": 0.85, "primary_activity": "Wake-up routines; galley food prep begins; water draw rising", "color": "blue"},
    {"hour_start": 8,  "hour_end": 10, "label": "Breakfast & Day Sync",    "demand_mult": 1.30, "primary_activity": "Full galley active; all crew briefing; lab activation begins", "color": "amber"},
    {"hour_start": 10, "hour_end": 13, "label": "Lab Operations Peak",     "demand_mult": 1.50, "primary_activity": "All science labs active; equipment at peak load; field teams deployed", "color": "cyan"},
    {"hour_start": 13, "hour_end": 15, "label": "Midday Galley",           "demand_mult": 1.45, "primary_activity": "Galley peak draw; lab operations continue; maintenance window", "color": "amber"},
    {"hour_start": 15, "hour_end": 19, "label": "Afternoon Operations",    "demand_mult": 1.35, "primary_activity": "Field team activity peak; maintenance; research instruments recording", "color": "teal"},
    {"hour_start": 19, "hour_end": 22, "label": "Evening Dinner & Defrost","demand_mult": 1.40, "primary_activity": "Full galley; HVAC heating cycle; defrost loops; crew debriefing", "color": "orange"},
    {"hour_start": 22, "hour_end": 24, "label": "Wind-Down & Handoff",     "demand_mult": 0.65, "primary_activity": "Shift handoff; reduced lighting; scientific instruments in unattended record mode", "color": "slate"},
]

def _get_current_diurnal_block(current_hour: int = None) -> dict:
    """Return the active diurnal block for the given hour (defaults to Python's current hour)."""
    import datetime
    if current_hour is None:
        current_hour = datetime.datetime.now().hour
    for block in DIURNAL_BLOCKS:
        if block["hour_start"] <= current_hour < block["hour_end"]:
            return block
    return DIURNAL_BLOCKS[0]  # fallback Night Watch

def init_personnel_state(station_id: str) -> dict:
    is_maitri = (station_id == "maitri")
    import datetime
    current_hour = datetime.datetime.now().hour
    diurnal_block = _get_current_diurnal_block(current_hour)
    demand_mult = diurnal_block["demand_mult"]

    if is_maitri:
        # ── Maitri: 45th Indian Scientific Expedition (Winter-Over) ──────────
        headcount = 25
        bed_capacity = 30
        expedition_day = 142
        station_name = "Maitri Antarctic Research Station"
        location_type = "Inland Schirmacher Oasis, Queen Maud Land"
        season = "Polar Winter"

        # Role groups: each with full operational sub-state
        role_groups = [
            {
                "role": "Research Scientists",
                "abbrev": "Scientists",
                "icon": "microscope",
                "color": "pink",
                "count": 10,
                "on_station": 6,
                "field_deployed": 4,
                "in_transit": 0,
                "in_rest": 0,
                "on_maintenance": 0,
                "activity_level": "HIGH",
                "specializations": ["Meteorology", "Glaciology", "Seismology", "Atmospheric Science"],
                "active_projects": 4,
                "field_teams": 2,
                "lab_teams": 2,
                "equipment_required": 6,
                "research_readiness_pct": 88.0,
                "energy_contribution_kw": round(8.4 * demand_mult, 1),
                "water_contribution_l_day": round(480.0, 1),
                "food_demand_kcal_day": round(10 * 3200, 0),
                "waste_contribution_kg_day": round(10 * 1.8, 1),
                "current_activity_desc": "Lab data acquisition + field sensor arrays; 2 teams at AWS sites",
                "equipment_dependency": ["Radiosonde Array", "Magnetometer", "Seismograph Network", "LiDAR Unit", "Ice Core Drill"],
                "domain_impact": "research",
                "availability": "FULL",
            },
            {
                "role": "Engineers & Technicians",
                "abbrev": "Engineers",
                "icon": "wrench",
                "color": "cyan",
                "count": 10,
                "on_station": 9,
                "field_deployed": 0,
                "in_transit": 0,
                "in_rest": 1,
                "on_maintenance": 8,
                "activity_level": "HIGH",
                "specializations": ["Diesel Generators", "HVAC Systems", "Electrical Grid", "Water Systems", "Vehicle Maintenance"],
                "active_maintenance_work_orders": 4,
                "operator_coverage_pct": 100.0,
                "equipment_systems_covered": ["Generator G1/G2", "HVAC", "Water Pump pump_m01", "Electrical Grid", "Tracked Vehicles"],
                "energy_contribution_kw": round(4.2 * demand_mult, 1),
                "water_contribution_l_day": round(480.0, 1),
                "food_demand_kcal_day": round(10 * 3500, 0),
                "waste_contribution_kg_day": round(10 * 1.9, 1),
                "current_activity_desc": "Scheduled Gen-2 maintenance; HVAC filter service; pump inspection",
                "domain_impact": "equipment",
                "availability": "NOMINAL",
            },
            {
                "role": "Medical Officer",
                "abbrev": "Medical",
                "icon": "heart",
                "count": 1,
                "on_station": 1,
                "field_deployed": 0,
                "in_transit": 0,
                "in_rest": 0,
                "on_maintenance": 0,
                "activity_level": "STANDBY",
                "color": "emerald",
                "specializations": ["Polar Emergency Medicine", "Trauma", "Telemedicine"],
                "medical_facility_status": "OPERATIONAL",
                "telemedicine_link": "CONNECTED",
                "telemedicine_partner": "AIIMS / NCAOR",
                "energy_contribution_kw": round(1.8 * demand_mult, 1),
                "water_contribution_l_day": 48.0,
                "food_demand_kcal_day": 2800,
                "waste_contribution_kg_day": 1.5,
                "current_activity_desc": "Medical bay on-call; weekly health check administration",
                "domain_impact": "safety",
                "availability": "FULL",
            },
            {
                "role": "Logistics & Galley",
                "abbrev": "Logistics",
                "icon": "package",
                "color": "amber",
                "count": 4,
                "on_station": 4,
                "field_deployed": 0,
                "in_transit": 0,
                "in_rest": 0,
                "on_maintenance": 0,
                "activity_level": "HIGH",
                "specializations": ["Food Preparation", "Supply Management", "Polar Tractor Operations", "Waste Management"],
                "energy_contribution_kw": round(6.8 * demand_mult, 1),
                "water_contribution_l_day": round(192.0, 1),
                "food_demand_kcal_day": round(4 * 3000, 0),
                "waste_contribution_kg_day": round(4 * 1.6, 1),
                "current_activity_desc": "Galley meal preparation; cold store inventory; tractor daily check",
                "domain_impact": "inventory",
                "availability": "FULL",
            },
        ]

        # Station zones (occupancy)
        zone_map = [
            {"zone": "Habitat Module A", "capacity": 10, "current": 9, "primary_use": "Sleeping berths, personal quarters"},
            {"zone": "Habitat Module B", "capacity": 10, "current": 8, "primary_use": "Sleeping berths, recreation area"},
            {"zone": "Science Laboratories", "capacity": 8,  "current": 6, "primary_use": "Research instruments, data processing"},
            {"zone": "Workshop & Engineering", "capacity": 6,  "current": 5, "primary_use": "Maintenance, electrical, mechanical"},
            {"zone": "Operations & Comms", "capacity": 4,  "current": 2, "primary_use": "Station ops, radio room, scheduling"},
            {"zone": "Medical Bay", "capacity": 2,  "current": 1, "primary_use": "Medical treatment, emergency isolation"},
        ]

        # Per-capita resource coupling
        per_capita_energy_kw = 2.44
        per_capita_water_l = 48.0
        per_capita_kcal = 3280.0
        per_capita_waste_kg = 1.82

        # Workforce condition (aggregate — no individual medical data)
        workforce_condition = {
            "adequate_rest_count": 21,
            "watch_count": 3,
            "fatigue_alert_count": 1,
            "operational_coverage_pct": 96.0,
            "contributing_factors": ["1 operator: extended duty >14h", "Night-shift rotation gap (slot 3)", "Elevated lab activity load"],
            "overall_status": "WATCH",
        }

        # Field exposure (links to weather)
        field_exposure = {
            "field_team_count": 4,
            "field_team_deployed": True,
            "exposure_risk": "Moderate",
            "deployment_restriction": "None",
            "max_safe_exposure_min": 90,
            "current_conditions_desc": "Wind 28 km/h, Temp -21°C. Standard polar PPE required. AWS site visit authorized.",
            "research_feasibility": "FULL",
        }

        # Equipment operator coverage
        equipment_coverage = [
            {"system": "Power & Generator Systems",   "required": 2, "available": 2, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "Water & Thermal Systems",     "required": 1, "available": 1, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "HVAC & Climate Control",      "required": 2, "available": 2, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "Science Laboratory Equipment","required": 4, "available": 3, "coverage_pct": 75.0,  "status": "REDUCED"},
            {"system": "Transport & Vehicles",        "required": 2, "available": 2, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "Communications",              "required": 1, "available": 1, "coverage_pct": 100.0, "status": "FULL"},
        ]

        # Life support station-level operational status
        life_support = {
            "o2_pct": 20.8,
            "co2_ppm": 440.0,
            "atmospheric_status": "NORMAL",
            "medical_officer_available": True,
            "medical_facility_status": "OPERATIONAL",
            "telemedicine_link": "CONNECTED",
            "telemedicine_partner": "AIIMS / NCAOR",
            "emergency_response_readiness": "READY",
        }

        resupply_impact = {
            "food_stock_days_current": 42,
            "water_autonomy_days": 14.0,
            "logistics_runway_days": 88,
        }

    else:
        # ── Bharati: 14th Indian Scientific Expedition (Winter-Over) ─────────
        headcount = 22
        bed_capacity = 47
        expedition_day = 138
        station_name = "Bharati Antarctic Research Station"
        location_type = "Coastal Larsemann Hills, Prydz Bay"
        season = "Polar Winter"

        role_groups = [
            {
                "role": "Research Scientists",
                "abbrev": "Scientists",
                "icon": "microscope",
                "color": "pink",
                "count": 9,
                "on_station": 7,
                "field_deployed": 2,
                "in_transit": 0,
                "in_rest": 0,
                "on_maintenance": 0,
                "activity_level": "HIGH",
                "specializations": ["Atmospheric LiDAR", "Satellite Telemetry", "Oceanography", "Space Weather"],
                "active_projects": 5,
                "field_teams": 1,
                "lab_teams": 2,
                "equipment_required": 7,
                "research_readiness_pct": 91.0,
                "energy_contribution_kw": round(9.2 * demand_mult, 1),
                "water_contribution_l_day": round(432.0, 1),
                "food_demand_kcal_day": round(9 * 3200, 0),
                "waste_contribution_kg_day": round(9 * 1.8, 1),
                "current_activity_desc": "LiDAR atmospheric boundary layer profiling; coastal seawater sampling",
                "equipment_dependency": ["LiDAR System", "VLBI Antenna", "SWRO Plant Monitor", "Acoustic Seismograph", "Weather Balloon Station"],
                "domain_impact": "research",
                "availability": "FULL",
            },
            {
                "role": "Engineers & Technicians",
                "abbrev": "Engineers",
                "icon": "wrench",
                "color": "cyan",
                "count": 9,
                "on_station": 9,
                "field_deployed": 0,
                "in_transit": 0,
                "in_rest": 0,
                "on_maintenance": 7,
                "activity_level": "HIGH",
                "specializations": ["CHP Plant", "SWRO Desalination", "Electrical Grid", "HVAC", "Marine Engineering"],
                "active_maintenance_work_orders": 3,
                "operator_coverage_pct": 100.0,
                "equipment_systems_covered": ["CHP Generator", "SWRO Plant ro_b01", "HVAC", "Electrical Grid", "Marine Pumps"],
                "energy_contribution_kw": round(5.4 * demand_mult, 1),
                "water_contribution_l_day": round(432.0, 1),
                "food_demand_kcal_day": round(9 * 3500, 0),
                "waste_contribution_kg_day": round(9 * 1.9, 1),
                "current_activity_desc": "CHP maintenance cycle; SWRO membrane cleaning; electrical panel inspection",
                "domain_impact": "equipment",
                "availability": "FULL",
            },
            {
                "role": "Medical Officer",
                "abbrev": "Medical",
                "icon": "heart",
                "color": "emerald",
                "count": 1,
                "on_station": 1,
                "field_deployed": 0,
                "in_transit": 0,
                "in_rest": 0,
                "on_maintenance": 0,
                "activity_level": "STANDBY",
                "specializations": ["Polar Emergency Medicine", "Surgical", "Telemedicine"],
                "medical_facility_status": "OPERATIONAL",
                "telemedicine_link": "CONNECTED",
                "telemedicine_partner": "AIIMS / NCAOR",
                "energy_contribution_kw": round(2.1 * demand_mult, 1),
                "water_contribution_l_day": 48.0,
                "food_demand_kcal_day": 2800,
                "waste_contribution_kg_day": 1.5,
                "current_activity_desc": "Medical bay on-call; telemedicine consultation with NCAOR base doctor",
                "domain_impact": "safety",
                "availability": "FULL",
            },
            {
                "role": "Logistics & Galley",
                "abbrev": "Logistics",
                "icon": "package",
                "color": "amber",
                "count": 3,
                "on_station": 3,
                "field_deployed": 0,
                "in_transit": 0,
                "in_rest": 0,
                "on_maintenance": 0,
                "activity_level": "HIGH",
                "specializations": ["Food Preparation", "Supply Management", "Helicopter Logistics", "Barge Operations"],
                "energy_contribution_kw": round(5.2 * demand_mult, 1),
                "water_contribution_l_day": round(144.0, 1),
                "food_demand_kcal_day": round(3 * 3000, 0),
                "waste_contribution_kg_day": round(3 * 1.6, 1),
                "current_activity_desc": "Galley food preparation; Quilty Bay barge check; inventory audit",
                "domain_impact": "inventory",
                "availability": "FULL",
            },
        ]

        zone_map = [
            {"zone": "Habitat Module A",         "capacity": 12, "current": 10, "primary_use": "Sleeping berths, personal quarters"},
            {"zone": "Habitat Module B",         "capacity": 12, "current": 9,  "primary_use": "Sleeping berths, recreation lounge"},
            {"zone": "Science Laboratories",     "capacity": 10, "current": 7,  "primary_use": "LiDAR lab, VLBI terminal, oceanography"},
            {"zone": "SWRO Plant & Engineering", "capacity": 6,  "current": 5,  "primary_use": "Desalination plant, CHP, mechanical"},
            {"zone": "Operations & Comms",       "capacity": 4,  "current": 2,  "primary_use": "Station ops, satellite comms, scheduling"},
            {"zone": "Medical Bay",              "capacity": 2,  "current": 1,  "primary_use": "Medical treatment, emergency isolation"},
            {"zone": "Barge & Marine Area",      "capacity": 3,  "current": 0,  "primary_use": "Marine logistics, barge maintenance"},
        ]

        per_capita_energy_kw = 2.52
        per_capita_water_l = 47.1
        per_capita_kcal = 3240.0
        per_capita_waste_kg = 1.78

        workforce_condition = {
            "adequate_rest_count": 21,
            "watch_count": 1,
            "fatigue_alert_count": 0,
            "operational_coverage_pct": 100.0,
            "contributing_factors": ["All shifts nominal", "No extended duty periods"],
            "overall_status": "NOMINAL",
        }

        field_exposure = {
            "field_team_count": 2,
            "field_team_deployed": True,
            "exposure_risk": "Low",
            "deployment_restriction": "None",
            "max_safe_exposure_min": 120,
            "current_conditions_desc": "Wind 22 km/h, Temp -14°C. Coastal PPE required. Barge access authorized.",
            "research_feasibility": "FULL",
        }

        equipment_coverage = [
            {"system": "CHP Plant & Generators",     "required": 2, "available": 2, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "SWRO Desalination Plant",    "required": 2, "available": 2, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "HVAC & Climate Control",     "required": 2, "available": 2, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "Science Laboratory Equipment","required": 4, "available": 4, "coverage_pct": 100.0, "status": "FULL"},
            {"system": "Marine / Barge Systems",     "required": 2, "available": 1, "coverage_pct": 50.0,  "status": "REDUCED"},
            {"system": "Communications",             "required": 1, "available": 1, "coverage_pct": 100.0, "status": "FULL"},
        ]

        life_support = {
            "o2_pct": 20.9,
            "co2_ppm": 420.0,
            "atmospheric_status": "NORMAL",
            "medical_officer_available": True,
            "medical_facility_status": "OPERATIONAL",
            "telemedicine_link": "CONNECTED",
            "telemedicine_partner": "AIIMS / NCAOR",
            "emergency_response_readiness": "READY",
        }

        resupply_impact = {
            "food_stock_days_current": 56,
            "water_autonomy_days": 22.8,
            "logistics_runway_days": 102,
        }

    # ── Compute aggregate resource demand ─────────────────────────────────────
    total_energy_kw = round(sum(rg["energy_contribution_kw"] for rg in role_groups), 1)
    total_water_l_day = round(sum(rg["water_contribution_l_day"] for rg in role_groups), 1)
    total_food_kcal = sum(rg["food_demand_kcal_day"] for rg in role_groups)
    total_waste_kg = round(sum(rg["waste_contribution_kg_day"] for rg in role_groups), 1)

    # Cross-domain coupling fields
    resource_demand_coupling = {
        "energy_personnel_load_kw": total_energy_kw,
        "water_demand_l_day": total_water_l_day,
        "food_demand_kcal_day": total_food_kcal,
        "waste_generation_kg_day": total_waste_kg,
        # Per-person averages for display
        "per_capita_energy_kw": per_capita_energy_kw,
        "per_capita_water_l_day": per_capita_water_l,
        "per_capita_kcal_day": per_capita_kcal,
        "per_capita_waste_kg_day": per_capita_waste_kg,
    }

    # Occupancy
    occupancy_pct = round((headcount / bed_capacity) * 100.0, 1)
    field_deployed_total = sum(rg["field_deployed"] for rg in role_groups)
    on_station_total = sum(rg["on_station"] for rg in role_groups)
    in_rest_total = sum(rg["in_rest"] for rg in role_groups)

    deployment_map = {
        "station_interior": on_station_total,
        "field_deployed": field_deployed_total,
        "in_transit": 0,
        "in_rest": in_rest_total,
        "emergency_standby": 0,
    }

    # Personnel risk score
    risk_score = 8.0
    if workforce_condition["fatigue_alert_count"] > 0:
        risk_score += workforce_condition["fatigue_alert_count"] * 2.5
    if field_exposure["field_team_count"] > 0 and field_exposure["exposure_risk"] in ["High", "CRITICAL"]:
        risk_score += 8.0
    elif field_exposure["field_team_count"] > 0 and field_exposure["exposure_risk"] == "Moderate":
        risk_score += 4.0
    if workforce_condition["operational_coverage_pct"] < 90.0:
        risk_score += (90.0 - workforce_condition["operational_coverage_pct"]) * 0.5

    risk_score = min(100.0, round(risk_score, 1))
    risk_level = "CRITICAL" if risk_score > 75 else ("HIGH" if risk_score > 50 else ("MEDIUM" if risk_score > 25 else "LOW"))

    personnel_risk = {
        "score": risk_score,
        "level": risk_level,
        "contributing_factors": [
            {"factor": "Fatigue Alerts", "value": workforce_condition["fatigue_alert_count"], "impact": round(workforce_condition["fatigue_alert_count"] * 2.5, 1)},
            {"factor": "Field Exposure Risk", "value": field_exposure["field_team_count"], "impact": 4.0 if field_exposure["exposure_risk"] == "Moderate" else 0.0},
            {"factor": "Operator Coverage", "value": workforce_condition["operational_coverage_pct"], "impact": max(0.0, round((90.0 - workforce_condition["operational_coverage_pct"]) * 0.5, 1))},
            {"factor": "Occupancy Load", "value": occupancy_pct, "impact": round(min(3.0, (occupancy_pct - 80) * 0.1), 1) if occupancy_pct > 80 else 0.0},
        ],
    }

    # Anomaly detection
    anomalies = []
    if workforce_condition["fatigue_alert_count"] > 0:
        anomalies.append({
            "type": "WORKFORCE_FATIGUE",
            "severity": "MEDIUM",
            "message": f"{workforce_condition['fatigue_alert_count']} personnel below minimum rest threshold",
            "cause": "Extended duty period / night-shift rotation gap",
            "operational_impact": "Reduced concentration; maintenance error risk elevated; suggest schedule rotation",
        })
    if field_deployed_total > 3 and field_exposure["exposure_risk"] in ["High", "CRITICAL"]:
        anomalies.append({
            "type": "FIELD_EXPOSURE_HIGH",
            "severity": "HIGH",
            "message": f"{field_deployed_total} personnel field-deployed under high exposure conditions",
            "cause": "Adverse weather with active field teams",
            "operational_impact": "Recall field teams; restrict further deployment",
        })

    return {
        "station_id": station_id,
        "station_name": station_name,
        "location_type": location_type,
        "season": season,
        "expedition_day": expedition_day,

        # Core headcount
        "headcount": headcount,
        "bed_capacity": bed_capacity,
        "occupancy_pct": occupancy_pct,

        # Deployment breakdown
        "deployment_map": deployment_map,

        # Role groups (detailed)
        "role_groups": role_groups,

        # Zone occupancy heatmap
        "zone_map": zone_map,

        # Resource demand coupling (cross-domain outputs)
        "resource_demand_coupling": resource_demand_coupling,

        # Diurnal rhythm
        "diurnal_block": diurnal_block,
        "diurnal_schedule": DIURNAL_BLOCKS,
        "current_hour": int(import_hour()),

        # Workforce condition (aggregate — no individual medical data)
        "workforce_condition": workforce_condition,

        # Field exposure (weather-linked)
        "field_exposure": field_exposure,

        # Equipment operator coverage
        "equipment_coverage": equipment_coverage,

        # Life support (station-level operational)
        "life_support": life_support,

        # Resupply / inventory impact
        "resupply_impact": resupply_impact,

        # Personnel risk
        "personnel_risk": personnel_risk,

        # Anomalies
        "anomalies": anomalies,

        # Safety status (legacy)
        "safety_status": "Nominal Station Movement" if field_deployed_total == 0 else f"{field_deployed_total} Personnel Field-Deployed",
    }


def import_hour():
    import datetime
    return datetime.datetime.now().hour


def _compute_what_if_state(base_state: dict, scenario_type: str, params: dict) -> dict:
    """
    Run a What-If scenario on a deep-copied state snapshot.
    Never mutates the live twin state. Returns projected personnel + resource state.
    """
    state = copy.deepcopy(base_state)
    pers = state.get("personnel", {})
    env = state.get("environment", {})
    is_maitri = (state.get("station_id", "maitri") == "maitri")

    if scenario_type == "personnel_increase":
        extra = params.get("additional_people", 12)
        pers["headcount"] = pers.get("headcount", 25) + extra
        pers["bed_capacity"] = pers.get("bed_capacity", 30)
        pers["occupancy_pct"] = round((pers["headcount"] / max(1, pers["bed_capacity"])) * 100.0, 1)
        # Scale resource coupling proportionally
        rc = pers.get("resource_demand_coupling", {})
        scale = pers["headcount"] / max(1, pers["headcount"] - extra)
        rc["energy_personnel_load_kw"] = round(rc.get("energy_personnel_load_kw", 21.2) * scale, 1)
        rc["water_demand_l_day"] = round(rc.get("water_demand_l_day", 1200) * scale, 1)
        rc["food_demand_kcal_day"] = round(rc.get("food_demand_kcal_day", 82000) * scale, 0)
        rc["waste_generation_kg_day"] = round(rc.get("waste_generation_kg_day", 45.5) * scale, 1)
        pers["resource_demand_coupling"] = rc
        # Add scientists for the increase
        for rg in pers.get("role_groups", []):
            if rg["role"] == "Research Scientists":
                rg["count"] += extra
                rg["on_station"] += extra
                rg["active_projects"] = rg.get("active_projects", 4) + 2
        # Risk goes up due to occupancy spike
        pers["personnel_risk"] = {
            "score": min(100.0, pers.get("personnel_risk", {}).get("score", 8.0) + 9.0),
            "level": "MEDIUM",
        }
        pers["anomalies"] = pers.get("anomalies", []) + [{
            "type": "OCCUPANCY_SURGE",
            "severity": "HIGH",
            "message": f"Occupancy increased to {pers['occupancy_pct']}% — habitation at capacity",
            "cause": f"Summer expedition surge +{extra} personnel",
            "operational_impact": "Water/food/energy/waste demand elevated; resupply advanced required",
        }]

    elif scenario_type == "personnel_decrease":
        reduction = params.get("reduction", 8)
        pers["headcount"] = max(5, pers.get("headcount", 25) - reduction)
        pers["occupancy_pct"] = round((pers["headcount"] / max(1, pers.get("bed_capacity", 30))) * 100.0, 1)
        rc = pers.get("resource_demand_coupling", {})
        scale = pers["headcount"] / max(1, pers["headcount"] + reduction)
        rc["energy_personnel_load_kw"] = round(rc.get("energy_personnel_load_kw", 21.2) * scale, 1)
        rc["water_demand_l_day"] = round(rc.get("water_demand_l_day", 1200) * scale, 1)
        rc["food_demand_kcal_day"] = round(rc.get("food_demand_kcal_day", 82000) * scale, 0)
        rc["waste_generation_kg_day"] = round(rc.get("waste_generation_kg_day", 45.5) * scale, 1)
        pers["resource_demand_coupling"] = rc
        for rg in pers.get("role_groups", []):
            rg["count"] = max(0, rg["count"] - round(reduction * rg["count"] / max(1, pers["headcount"] + reduction)))

    elif scenario_type == "research_increase":
        extra_load_kw = params.get("extra_kw", 14.0)
        rc = pers.get("resource_demand_coupling", {})
        rc["energy_personnel_load_kw"] = round(rc.get("energy_personnel_load_kw", 21.2) + extra_load_kw, 1)
        rc["water_demand_l_day"] = round(rc.get("water_demand_l_day", 1200) * 1.15, 1)  # lab water up
        pers["resource_demand_coupling"] = rc
        for rg in pers.get("role_groups", []):
            if rg["role"] == "Research Scientists":
                rg["activity_level"] = "PEAK"
                rg["active_projects"] = rg.get("active_projects", 4) + 3
                rg["energy_contribution_kw"] = round(rg.get("energy_contribution_kw", 8.4) * 1.45, 1)
        # Equipment coverage for labs degrades with overload
        for ec in pers.get("equipment_coverage", []):
            if "Science" in ec["system"]:
                ec["coverage_pct"] = min(100.0, ec["coverage_pct"] + 15.0)
                ec["status"] = "PEAK_LOAD"
        pers["workforce_condition"]["watch_count"] = pers.get("workforce_condition", {}).get("watch_count", 3) + 2

    elif scenario_type == "field_deployment":
        extra_field = params.get("extra_field_personnel", 6)
        for rg in pers.get("role_groups", []):
            if rg["role"] == "Research Scientists":
                moved = min(extra_field, rg["on_station"])
                rg["field_deployed"] = rg.get("field_deployed", 0) + moved
                rg["on_station"] = max(0, rg["on_station"] - moved)
                rg["research_readiness_pct"] = max(40.0, rg.get("research_readiness_pct", 88.0) - 30.0)
        fe = pers.get("field_exposure", {})
        fe["field_team_count"] = fe.get("field_team_count", 4) + extra_field
        fe["exposure_risk"] = "High"
        fe["research_feasibility"] = "REDUCED"
        fe["current_conditions_desc"] = f"{fe['field_team_count']} personnel field-deployed; standard PPE required; emergency recall protocol active"
        pers["field_exposure"] = fe
        pers["personnel_risk"]["score"] = min(100.0, pers.get("personnel_risk", {}).get("score", 8.0) + 12.0)
        pers["personnel_risk"]["level"] = "MEDIUM"

    elif scenario_type == "severe_weather":
        # Blizzard: recall all field teams, shut labs, energy demand pattern changes
        fe = pers.get("field_exposure", {})
        recalled = fe.get("field_team_count", 4)
        fe["field_team_count"] = 0
        fe["field_team_deployed"] = False
        fe["exposure_risk"] = "CRITICAL"
        fe["deployment_restriction"] = "BLIZZARD PROTOCOL — All Field Work Prohibited"
        fe["research_feasibility"] = "STATION_ONLY"
        fe["current_conditions_desc"] = "Blizzard active. Wind >65 km/h. All exterior activity suspended."
        pers["field_exposure"] = fe
        for rg in pers.get("role_groups", []):
            if rg["role"] == "Research Scientists":
                rg["field_deployed"] = 0
                rg["on_station"] = rg.get("on_station", 6) + recalled
                rg["activity_level"] = "STANDBY"
                rg["research_readiness_pct"] = max(30.0, rg.get("research_readiness_pct", 88.0) - 40.0)
        # Energy changes with blizzard — HVAC spikes, lab load drops
        rc = pers.get("resource_demand_coupling", {})
        rc["energy_personnel_load_kw"] = round(rc.get("energy_personnel_load_kw", 21.2) * 0.80, 1)  # labs closed
        pers["resource_demand_coupling"] = rc
        pers["safety_status"] = "Blizzard Protocol: All Personnel Confined to Habitat"
        pers["personnel_risk"]["score"] = min(100.0, pers.get("personnel_risk", {}).get("score", 8.0) + 6.0)
        pers["personnel_risk"]["level"] = "MEDIUM"

    state["personnel"] = pers
    return state


def step(state: dict, perturbation: dict = None) -> dict:
    """
    Called on each simulation tick. Reads environment/research/equipment state.
    Updates personnel state and writes cross-domain coupling fields.
    """
    state = copy.deepcopy(state)
    pers = state.get("personnel", {})
    env = state.get("environment", {})
    research = state.get("research", {})
    is_maitri = (state.get("station_id", "maitri") == "maitri")

    headcount = pers.get("headcount", 25 if is_maitri else 22)
    field_team = pers.get("deployment_map", {}).get("field_deployed", 4 if is_maitri else 2)

    # ── Perturbation Application ─────────────────────────────────────────────
    if perturbation:
        p_type = perturbation.get("type", "")
        if p_type == "personnel_increase":
            headcount += perturbation.get("additional_people", 12)
            pers["headcount"] = headcount
        elif p_type == "personnel_decrease":
            headcount = max(5, headcount - perturbation.get("reduction", 8))
            pers["headcount"] = headcount

    # ── Weather → Field Exposure ─────────────────────────────────────────────
    wind_speed = env.get("wind_speed", 28.0 if is_maitri else 22.0)
    blizzard = env.get("blizzard_active", False)
    temp = env.get("temperature", -21.0 if is_maitri else -14.0)

    field_exp = pers.get("field_exposure", {})
    if blizzard or wind_speed > 65.0:
        field_exp["field_team_deployed"] = False
        field_exp["field_team_count"] = 0
        field_exp["exposure_risk"] = "CRITICAL"
        field_exp["deployment_restriction"] = "BLIZZARD PROTOCOL — All Field Work Prohibited"
        field_exp["research_feasibility"] = "STATION_ONLY"
        pers["safety_status"] = "Blizzard Protocol: All Personnel Confined to Habitat"
    elif wind_speed > 45.0 or temp < -35.0:
        field_exp["exposure_risk"] = "High"
        field_exp["deployment_restriction"] = "Extreme Cold — Field Work Restricted to Emergencies"
        field_exp["research_feasibility"] = "LIMITED"
    else:
        field_exp["exposure_risk"] = "Low" if wind_speed < 30.0 else "Moderate"
        field_exp["deployment_restriction"] = "None"
        field_exp["research_feasibility"] = "FULL"
        pers["safety_status"] = "Nominal Station Movement"

    pers["field_exposure"] = field_exp

    # ── Diurnal Demand Multiplier ─────────────────────────────────────────────
    import datetime
    current_hour = datetime.datetime.now().hour
    diurnal_block = _get_current_diurnal_block(current_hour)
    demand_mult = diurnal_block["demand_mult"]
    pers["diurnal_block"] = diurnal_block
    pers["current_hour"] = current_hour

    # ── Resource Demand Coupling Update ──────────────────────────────────────
    pc_energy = 2.44 if is_maitri else 2.52
    pc_water = 48.0 if is_maitri else 47.1
    pc_kcal = 3280.0 if is_maitri else 3240.0
    pc_waste = 1.82 if is_maitri else 1.78

    # Research activity multiplier
    active_exp = research.get("active_experiments_count", 4)
    research_energy_extra = 0.0
    if active_exp > 4:
        research_energy_extra = (active_exp - 4) * 2.5
    if blizzard:
        research_energy_extra = -5.0  # labs powered down

    total_energy = round((headcount * pc_energy * demand_mult) + research_energy_extra, 1)
    total_water = round(headcount * pc_water, 1)
    total_food = round(headcount * pc_kcal, 0)
    total_waste = round(headcount * pc_waste, 1)

    pers["resource_demand_coupling"] = {
        "energy_personnel_load_kw": total_energy,
        "water_demand_l_day": total_water,
        "food_demand_kcal_day": total_food,
        "waste_generation_kg_day": total_waste,
        "per_capita_energy_kw": pc_energy,
        "per_capita_water_l_day": pc_water,
        "per_capita_kcal_day": pc_kcal,
        "per_capita_waste_kg_day": pc_waste,
        "diurnal_multiplier": demand_mult,
        "research_energy_extra_kw": round(research_energy_extra, 1),
    }

    pers["headcount"] = headcount

    # ── Risk Update ───────────────────────────────────────────────────────────
    risk_score = 8.0
    wc = pers.get("workforce_condition", {})
    if wc.get("fatigue_alert_count", 0) > 0:
        risk_score += wc["fatigue_alert_count"] * 2.5
    if field_exp.get("exposure_risk") == "CRITICAL":
        risk_score += 15.0
    elif field_exp.get("exposure_risk") == "High":
        risk_score += 8.0
    elif field_exp.get("exposure_risk") == "Moderate":
        risk_score += 4.0
    if wc.get("operational_coverage_pct", 100) < 90.0:
        risk_score += (90.0 - wc["operational_coverage_pct"]) * 0.5
    risk_score = min(100.0, round(risk_score, 1))
    rl = "CRITICAL" if risk_score > 75 else ("HIGH" if risk_score > 50 else ("MEDIUM" if risk_score > 25 else "LOW"))
    pers["personnel_risk"] = {"score": risk_score, "level": rl}

    state["personnel"] = pers
    return state
