"""
POLARTWIN — Equipment & Machinery Fleet Simulation Module
Implements the governing equipment degradation lifecycle:
Health(t+1) = Health(t) - (LoadStress(t) * DegradationRate) + MaintenanceReset(t)
Connects equipment load and stress to Energy, Fuel, Research, Environment,
Maintenance recovery, Storage & Inventory spare dependencies, and Station Risk.
"""

from typing import Dict, Any, List
import copy

def init_equipment_state(station_id: str) -> Dict[str, Any]:
    is_maitri = (station_id == "maitri")

    if is_maitri:
        # Maitri Inland Station Fleet: Kirloskar generators, Priyadarshini water pump, PistenBully convoys, FTIR
        items = [
            {
                "id": "gen_m01",
                "name": "Kirloskar 62.5 kVA Diesel Generator #1",
                "type": "power",
                "subtype": "Primary Baseload Generator",
                "health_score": 94.5,
                "health_trend": [96.0, 95.8, 95.4, 95.0, 94.8, 94.5],
                "operating_hours": 8420,
                "status": "operational",
                "load_pct": 68.0,
                "vibration_mm_s": 2.1,
                "temp_c": 82.5,
                "fuel_rate_l_hr": 14.8,
                "failure_risk_pct": 3.2,
                "rul_days": 124,
                "weibull_beta": 2.4,
                "weibull_eta": 12500,
                "maintenance_status": "NOMINAL",
                "next_service_days": 14,
                "required_spare": "Diesel Fuel Filter Cartridges",
                "spare_sku": "sku-sp-01",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 48,
                "upstream_dependencies": ["Station Energy Demand", "AGO Bulk Diesel Fuel", "Cooling Airflow"],
                "downstream_impact": "Powers Main Habitat, Life Support Heating, and Science Laboratories. Tripping shifts 100% load to Generator #2.",
                "change_explanation": "Operating steadily at 68% load. Slight thermal wear-out progression consistent with 8,420 run hours."
            },
            {
                "id": "gen_m02",
                "name": "Kirloskar 62.5 kVA Diesel Generator #2",
                "type": "power",
                "subtype": "Secondary Baseload Generator",
                "health_score": 89.2,
                "health_trend": [92.0, 91.5, 90.8, 90.1, 89.6, 89.2],
                "operating_hours": 7890,
                "status": "operational",
                "load_pct": 54.0,
                "vibration_mm_s": 2.8,
                "temp_c": 80.1,
                "fuel_rate_l_hr": 12.2,
                "failure_risk_pct": 7.8,
                "rul_days": 88,
                "weibull_beta": 2.4,
                "weibull_eta": 12000,
                "maintenance_status": "DUE_SOON",
                "next_service_days": 28,
                "required_spare": "Combustion Glow Plugs & Injector Nozzles",
                "spare_sku": "sku-sp-05",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 14,
                "upstream_dependencies": ["Station Energy Demand", "AGO Bulk Diesel Fuel"],
                "downstream_impact": "Acts as synchronized parallel power source. Scheduled for 500-hour injector balancing.",
                "change_explanation": "Elevated harmonic vibration (2.8 mm/s) detected due to injector carbon deposit buildup."
            },
            {
                "id": "gen_m03",
                "name": "Kirloskar Emergency Standby Generator #3",
                "type": "power",
                "subtype": "Cold Standby Generator",
                "health_score": 98.0,
                "health_trend": [98.5, 98.5, 98.2, 98.0, 98.0, 98.0],
                "operating_hours": 450,
                "status": "standby",
                "load_pct": 0.0,
                "vibration_mm_s": 0.4,
                "temp_c": 22.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 1.0,
                "rul_days": 340,
                "weibull_beta": 2.2,
                "weibull_eta": 15000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 180,
                "required_spare": "Alternator Voltage Regulator Kit",
                "spare_sku": "sku-hw-02",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 18,
                "upstream_dependencies": ["Emergency Block Heater", "Backup Starter Battery (24V)"],
                "downstream_impact": "Instant auto-start lifeline in case of primary generator bus failure.",
                "change_explanation": "Block heater maintained at +22°C. Instant auto-transfer ready."
            },
            {
                "id": "pump_m01",
                "name": "Priyadarshini Lake Water Extraction Pump P-1",
                "type": "utility",
                "subtype": "Sub-Zero Submersible Water Pump",
                "health_score": 87.8,
                "health_trend": [91.0, 90.2, 89.5, 88.9, 88.2, 87.8],
                "operating_hours": 6120,
                "status": "operational",
                "load_pct": 42.0,
                "vibration_mm_s": 3.2,
                "temp_c": 45.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 8.4,
                "rul_days": 74,
                "weibull_beta": 2.1,
                "weibull_eta": 9000,
                "maintenance_status": "DUE_SOON",
                "next_service_days": 21,
                "required_spare": "RO High-Pressure Membrane Seals",
                "spare_sku": "sku-sp-02",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 16,
                "upstream_dependencies": ["800m Trace Heating Cable", "Lake Water Ice-Melt Level", "Grid Power"],
                "downstream_impact": "Pumps potable water to central water treatment facility. Pump failure causes water tank depletion within 14 days.",
                "change_explanation": "Mechanical seal friction elevated by sub-glacial sediment particles. Scheduled seal swap in WO-2026-094."
            },
            {
                "id": "hvac_m01",
                "name": "Main Habitat Complex HVAC & Heat Recovery",
                "type": "hvac",
                "subtype": "Central Climate Control Air Handler",
                "health_score": 91.5,
                "health_trend": [93.0, 92.6, 92.2, 91.9, 91.6, 91.5],
                "operating_hours": 5800,
                "status": "operational",
                "load_pct": 73.0,
                "vibration_mm_s": 1.9,
                "temp_c": 38.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 4.5,
                "rul_days": 112,
                "weibull_beta": 1.8,
                "weibull_eta": 12000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 60,
                "required_spare": "Self-Regulating Trace Heating Cable",
                "spare_sku": "sku-hw-01",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 180,
                "upstream_dependencies": ["Generator Waste Heat Exchanger", "Outside Katabatic Gale Damper"],
                "downstream_impact": "Maintains living module interior temperature at +19°C. Direct crew survival critical.",
                "change_explanation": "Continuous heating load driven by exterior -22.4°C ambient wind chill."
            },
            {
                "id": "pb_m01",
                "name": "PistenBully 300 Polar Convoy Tractor #1",
                "type": "transport",
                "subtype": "Heavy Tracked Snow Tractor",
                "health_score": 93.8,
                "health_trend": [95.0, 94.8, 94.5, 94.1, 93.9, 93.8],
                "operating_hours": 3450,
                "status": "operational",
                "load_pct": 60.0,
                "vibration_mm_s": 2.4,
                "temp_c": 72.0,
                "fuel_rate_l_hr": 22.5,
                "failure_risk_pct": 3.8,
                "rul_days": 145,
                "weibull_beta": 2.2,
                "weibull_eta": 8000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 42,
                "required_spare": "PistenBully Track Pins & Bushings",
                "spare_sku": "sku-sp-03",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 24,
                "upstream_dependencies": ["Polar Synthetic Engine Oil 5W-40", "Hydraulic Sled Winch"],
                "downstream_impact": "Executes 100km overland resupply traverse from ice-shelf mooring. Essential for annual cargo offload.",
                "change_explanation": "Tracks inspected and torqued for pre-traverse readiness. 100% parts staged in WO-2026-102."
            },
            {
                "id": "incin_m01",
                "name": "Dual-Chamber High-Temp Solid Waste Incinerator",
                "type": "waste",
                "subtype": "Thermal Waste Pyrolysis Plant",
                "health_score": 86.2,
                "health_trend": [89.0, 88.4, 87.8, 87.1, 86.6, 86.2],
                "operating_hours": 4210,
                "status": "operational",
                "load_pct": 61.0,
                "vibration_mm_s": 3.4,
                "temp_c": 145.0,
                "fuel_rate_l_hr": 8.5,
                "failure_risk_pct": 9.2,
                "rul_days": 62,
                "weibull_beta": 2.3,
                "weibull_eta": 7500,
                "maintenance_status": "DUE_SOON",
                "next_service_days": 14,
                "required_spare": "Incinerator Blower Bearings (6208-2RS)",
                "spare_sku": "sku-sp-04",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 8,
                "upstream_dependencies": ["Primary Draft Fan Motor", "Flue Gas Scrubber Filter"],
                "downstream_impact": "Complies with Antarctic Treaty Environmental Protocol (Madrid Protocol) zero open-burning mandate.",
                "change_explanation": "Draft blower bearing wear approaching threshold. Staged in WO-2026-089 for Tech V. Raman."
            },
            {
                "id": "ftir_m01",
                "name": "FTIR Atmospheric Trace-Gas Spectrometer",
                "type": "scientific",
                "subtype": "High-Resolution Infrared Spectrometer",
                "health_score": 97.4,
                "health_trend": [98.0, 97.8, 97.6, 97.5, 97.4, 97.4],
                "operating_hours": 1920,
                "status": "operational",
                "load_pct": 38.0,
                "vibration_mm_s": 0.4,
                "temp_c": 18.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 1.2,
                "rul_days": 280,
                "weibull_beta": 1.5,
                "weibull_eta": 14000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 90,
                "required_spare": "Atmospheric Spectrometer Calibration Gas",
                "spare_sku": "sku-res-01",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 8,
                "upstream_dependencies": ["Optically Flat Solar Tracker", "Liquid Nitrogen Cryo-Dewar", "Uninterrupted UPS Power"],
                "downstream_impact": "Provides vital continuous ozone hole hole-recovery and greenhouse gas monitoring data to IMD/NCPOR.",
                "change_explanation": "Optics pristine. Zero laser drift observed over past 30 days of continuous measurement."
            }
        ]
    else:
        # Bharati Coastal Station Fleet: Volvo Penta marine generators, RO Desalination, Ka-32 Heli APU, Polar Radar
        items = [
            {
                "id": "gen_b01",
                "name": "Volvo Penta 100 kVA Marine Diesel Generator #1",
                "type": "power",
                "subtype": "Primary CHP Electrical Generator",
                "health_score": 95.8,
                "health_trend": [97.0, 96.8, 96.4, 96.1, 95.9, 95.8],
                "operating_hours": 5120,
                "status": "operational",
                "load_pct": 64.0,
                "vibration_mm_s": 1.8,
                "temp_c": 79.5,
                "fuel_rate_l_hr": 18.2,
                "failure_risk_pct": 2.6,
                "rul_days": 156,
                "weibull_beta": 2.4,
                "weibull_eta": 14000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 35,
                "required_spare": "Volvo Penta Lube Filter Cartridges",
                "spare_sku": "sku-sp-b01",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 36,
                "upstream_dependencies": ["Coastal Tank Farm AGO Fuel", "Cooling Sea Water Heat Exchanger"],
                "downstream_impact": "Powers main architectural pod, high-speed satellite uplink, and research wings.",
                "change_explanation": "High combustion efficiency with integrated Combined Heat & Power (CHP) loop extraction."
            },
            {
                "id": "gen_b02",
                "name": "Volvo Penta 100 kVA Marine Diesel Generator #2",
                "type": "power",
                "subtype": "Secondary CHP Electrical Generator",
                "health_score": 92.1,
                "health_trend": [94.0, 93.6, 93.1, 92.7, 92.3, 92.1],
                "operating_hours": 4890,
                "status": "operational",
                "load_pct": 58.0,
                "vibration_mm_s": 2.2,
                "temp_c": 78.0,
                "fuel_rate_l_hr": 16.5,
                "failure_risk_pct": 4.9,
                "rul_days": 128,
                "weibull_beta": 2.4,
                "weibull_eta": 13500,
                "maintenance_status": "NOMINAL",
                "next_service_days": 50,
                "required_spare": "Centrifugal Fuel Oil Purifier Discs",
                "spare_sku": "sku-sp-b02",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 18,
                "upstream_dependencies": ["Coastal Tank Farm AGO Fuel", "Automated Load Sharing Bus"],
                "downstream_impact": "Balances electrical harmonic demand across high-capacity laboratory spectrometers.",
                "change_explanation": "Smooth operation across parallel bus. Exhaust temperatures well within normal range."
            },
            {
                "id": "gen_b03",
                "name": "Volvo Penta 100 kVA Emergency Standby Unit #3",
                "type": "power",
                "subtype": "Cold Standby Generator",
                "health_score": 98.4,
                "health_trend": [98.5, 98.5, 98.4, 98.4, 98.4, 98.4],
                "operating_hours": 620,
                "status": "standby",
                "load_pct": 0.0,
                "vibration_mm_s": 0.3,
                "temp_c": 21.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 0.8,
                "rul_days": 340,
                "weibull_beta": 2.2,
                "weibull_eta": 16000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 190,
                "required_spare": "Electronic Governor Control Module",
                "spare_sku": "sku-hw-b03",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 6,
                "upstream_dependencies": ["Station Emergency Bus", "Dual Starter Air Compressors"],
                "downstream_impact": "Autonomous cold start in 8.5 seconds if main bus de-energizes.",
                "change_explanation": "Weekly automated self-test passed with zero start crank delay."
            },
            {
                "id": "ro_b01",
                "name": "Seawater Reverse Osmosis Desalination Plant",
                "type": "utility",
                "subtype": "High-Pressure Marine RO Desalination",
                "health_score": 94.0,
                "health_trend": [95.5, 95.1, 94.8, 94.4, 94.2, 94.0],
                "operating_hours": 4400,
                "status": "operational",
                "load_pct": 55.0,
                "vibration_mm_s": 2.1,
                "temp_c": 32.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 3.6,
                "rul_days": 142,
                "weibull_beta": 2.1,
                "weibull_eta": 10500,
                "maintenance_status": "NOMINAL",
                "next_service_days": 45,
                "required_spare": "High-Pressure Spiral Wound RO Membranes",
                "spare_sku": "sku-sp-b04",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 12,
                "upstream_dependencies": ["Quilty Bay Intake Line", "Antifreeze Glycol Heat Exchanger"],
                "downstream_impact": "Produces 4,500 Liters/day of pure potable water from coastal seawater.",
                "change_explanation": "Permeate conductivity nominal at 180 uS/cm. Pre-filters flushed on schedule."
            },
            {
                "id": "chp_b01",
                "name": "Combined Heat & Power (CHP) Glycol System",
                "type": "hvac",
                "subtype": "Waste Heat Cogeneration & District Heating",
                "health_score": 93.5,
                "health_trend": [94.8, 94.4, 94.1, 93.8, 93.6, 93.5],
                "operating_hours": 5200,
                "status": "operational",
                "load_pct": 68.0,
                "vibration_mm_s": 1.7,
                "temp_c": 68.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 4.1,
                "rul_days": 135,
                "weibull_beta": 1.9,
                "weibull_eta": 13000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 65,
                "required_spare": "Sub-zero Hydronic Glycol Antifreeze",
                "spare_sku": "sku-cs-02",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 650,
                "upstream_dependencies": ["Generator Exhaust Gas Heat Exchangers", "Circulation Pumps"],
                "downstream_impact": "Saves 35% fuel by harvesting 120 kW thermal energy directly into habitat radiator loops.",
                "change_explanation": "Differential pressure across primary plate heat exchanger steady at 0.4 bar."
            },
            {
                "id": "barge_b01",
                "name": "Fast-Ice Amphibious Cargo Barge Propulsion",
                "type": "transport",
                "subtype": "Twin Hydro-Jet Marine Diesel Propulsion",
                "health_score": 96.0,
                "health_trend": [97.0, 96.8, 96.5, 96.3, 96.1, 96.0],
                "operating_hours": 1850,
                "status": "operational",
                "load_pct": 30.0,
                "vibration_mm_s": 2.0,
                "temp_c": 65.0,
                "fuel_rate_l_hr": 15.0,
                "failure_risk_pct": 2.2,
                "rul_days": 210,
                "weibull_beta": 2.2,
                "weibull_eta": 9000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 75,
                "required_spare": "Marine Hydro-Jet Impeller Seal Kits",
                "spare_sku": "sku-sp-b05",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 4,
                "upstream_dependencies": ["Quilty Bay Fast-Ice Channel", "Hydraulic Winch Steer"],
                "downstream_impact": "Shuttles containerised fuel and dry rations from ship anchorage directly to shore ramp.",
                "change_explanation": "Bilge pumps and jet impellers certified for summer cargo offload operations."
            },
            {
                "id": "sat_b01",
                "name": "High-Data-Rate X/S-Band Earth Station Tracking Radome",
                "type": "scientific",
                "subtype": "Deep Space & Polar Orbit Satellite Ground Station",
                "health_score": 98.2,
                "health_trend": [98.5, 98.4, 98.3, 98.3, 98.2, 98.2],
                "operating_hours": 2100,
                "status": "operational",
                "load_pct": 45.0,
                "vibration_mm_s": 0.5,
                "temp_c": 24.0,
                "fuel_rate_l_hr": 0.0,
                "failure_risk_pct": 0.9,
                "rul_days": 310,
                "weibull_beta": 1.6,
                "weibull_eta": 16000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 120,
                "required_spare": "Radome Azimuth Servo Drive Unit",
                "spare_sku": "sku-hw-b06",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 2,
                "upstream_dependencies": ["Radome Internal De-icing Blower", "Low-Noise Cryo-Receiver"],
                "downstream_impact": "Transmits real-time Indian remote sensing satellite telemetry (Cartosat/Oceansat) back to NRSC Hyderabad.",
                "change_explanation": "Tracking accuracy within 0.02 degrees azimuth across 14 daily polar satellite passes."
            },
            {
                "id": "incin_b01",
                "name": "Automated Waste Shredder & Pyrolysis Incinerator",
                "type": "waste",
                "subtype": "High-Efficiency Bio-Waste Converter",
                "health_score": 90.0,
                "health_trend": [92.0, 91.5, 91.0, 90.5, 90.2, 90.0],
                "operating_hours": 3100,
                "status": "operational",
                "load_pct": 50.0,
                "vibration_mm_s": 2.6,
                "temp_c": 130.0,
                "fuel_rate_l_hr": 6.5,
                "failure_risk_pct": 5.8,
                "rul_days": 95,
                "weibull_beta": 2.3,
                "weibull_eta": 8000,
                "maintenance_status": "NOMINAL",
                "next_service_days": 30,
                "required_spare": "Tungsten Alloy Shredder Blade Set",
                "spare_sku": "sku-sp-b07",
                "spare_availability": "AVAILABLE",
                "spare_inventory_count": 4,
                "upstream_dependencies": ["Solid Waste Segregator", "Ceramic Catalyst Honeycomb"],
                "downstream_impact": "Reduces non-recyclable domestic solid waste by 95% volume with zero toxic dioxin release.",
                "change_explanation": "Combustion chamber refractory lining sound. Secondary burner operating at 1,100°C."
            }
        ]

    # Calculate overall fleet metrics
    total_assets = len(items)
    running_count = sum(1 for it in items if it["status"] == "operational")
    standby_count = sum(1 for it in items if it["status"] == "standby")
    maintenance_count = sum(1 for it in items if it["status"] == "maintenance" or it.get("maintenance_status") == "OVERDUE")
    offline_count = sum(1 for it in items if it["status"] in ["tripped", "failed", "offline"])
    available_count = running_count + standby_count

    avg_health = round(sum(it["health_score"] for it in items) / max(1, total_assets), 1)
    avg_rul = int(round(sum(it["rul_days"] for it in items) / max(1, total_assets)))
    availability_pct = round((available_count / max(1, total_assets)) * 100.0, 1)

    return {
        "station_id": station_id,
        "items": items,
        "avg_health": avg_health,
        "fleet_stats": {
            "total_assets": total_assets,
            "available": available_count,
            "running": running_count,
            "standby": standby_count,
            "maintenance": maintenance_count,
            "offline": offline_count,
            "avg_rul_days": avg_rul,
            "availability_pct": availability_pct,
            "critical_risk_count": sum(1 for it in items if it["failure_risk_pct"] > 10.0)
        }
    }

def step(state: Dict[str, Any], perturbation: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Simulates equipment degradation and operational stress progression.
    Applies formula: Health(t+1) = Health(t) - (LoadStress * DegradationRate) + MaintenanceReset
    Calculates vibration, thermal load, and failure risk causally.
    """
    equip = dict(state.get("equipment", {}))
    station_id = state.get("station_id", "maitri")

    if not equip or "items" not in equip or len(equip["items"]) == 0:
        equip = init_equipment_state(station_id)

    items = [dict(it) for it in equip.get("items", [])]
    energy = state.get("energy", {})
    gen_load_kw = energy.get("generator_load", 65.0)
    env = state.get("environment", {})
    ambient_temp = env.get("temperature", -22.0)
    wind_speed = env.get("wind_speed", 25.0)

    # Process perturbations
    generator_trip = False
    degradation_burst = 0.0
    load_surge_mult = 1.0

    if perturbation:
        p_type = perturbation.get("type")
        if p_type == "generator_failure":
            generator_trip = True
        elif p_type == "equipment_degradation":
            degradation_burst = float(perturbation.get("health_drop", 15.0))
        elif p_type in ["research_load_increase", "consumption_surge"]:
            load_surge_mult = 1.30
        elif p_type == "extreme_cold":
            load_surge_mult = 1.25

    for item in items:
        # 1. Generator failure perturbation
        if generator_trip and item["type"] == "power" and ("#1" in item["name"] or "01" in item["id"]):
            item["status"] = "tripped"
            item["load_pct"] = 0.0
            item["health_score"] = max(15.0, item["health_score"] - 45.0)
            item["vibration_mm_s"] = 0.0
            item["failure_risk_pct"] = 94.0
            item["rul_days"] = 0
            item["change_explanation"] = "EMERGENCY TRIP: Generator protective breaker open due to simulated mechanical seizure."
            continue

        # 2. General equipment degradation burst
        if degradation_burst > 0 and item["status"] == "operational":
            item["health_score"] = max(25.0, round(item["health_score"] - (degradation_burst * 0.2), 2))
            item["failure_risk_pct"] = round(min(95.0, item["failure_risk_pct"] + (degradation_burst * 0.4)), 1)
            item["rul_days"] = max(10, int(item["rul_days"] * 0.8))

        # 3. Dynamic operational load calculation
        if item["status"] == "operational":
            base_load = item.get("load_pct", 55.0)
            if item["type"] == "power":
                # Power load follows station generator demand
                calc_load = min(100.0, (gen_load_kw / 120.0) * 100.0 * load_surge_mult)
                item["load_pct"] = round(calc_load, 1)
            elif item["type"] == "hvac":
                # HVAC load increases with colder outdoor temperatures
                temp_delta = max(10.0, 19.0 - ambient_temp)
                calc_load = min(98.0, 45.0 + (temp_delta * 0.9) * load_surge_mult)
                item["load_pct"] = round(calc_load, 1)
            elif item["type"] == "scientific":
                calc_load = min(95.0, 38.0 * load_surge_mult)
                item["load_pct"] = round(calc_load, 1)

            # Governing Degradation Formula:
            # Health(t+1) = Health(t) - (LoadStress * DegradationRate)
            load_stress = (item["load_pct"] / 100.0)
            deg_rate = 0.0035  # micro-degradation per simulation step
            health_drop = load_stress * deg_rate
            item["health_score"] = max(20.0, round(item["health_score"] - health_drop, 2))

            # Operating hours progression
            item["operating_hours"] = int(item.get("operating_hours", 3000)) + 1

            # Vibration is causally linked to wear-out and load stress
            wear_factor = (100.0 - item["health_score"]) * 0.04
            load_factor = (item["load_pct"] / 100.0) * 0.8
            base_vib = 1.0 if item["type"] in ["power", "pump", "waste"] else 0.4
            item["vibration_mm_s"] = round(base_vib + wear_factor + load_factor, 1)

            # Operating Temperature
            if item["type"] == "power":
                item["temp_c"] = round(72.0 + (item["load_pct"] * 0.16), 1)
            elif item["type"] == "hvac":
                item["temp_c"] = round(32.0 + (item["load_pct"] * 0.10), 1)

            # Failure Probability calculation (Weibull & health driven)
            weibull_p = ((item["operating_hours"] / item.get("weibull_eta", 12000)) ** item.get("weibull_beta", 2.2)) * 10.0
            health_p = (100.0 - item["health_score"]) * 0.65
            item["failure_risk_pct"] = round(min(98.0, max(0.5, weibull_p + health_p)), 1)

            # Remaining Useful Life (RUL) estimation
            burn_rate = max(0.01, (load_stress * 0.12))
            remaining_headroom = max(1.0, item["health_score"] - 70.0)
            item["rul_days"] = max(5, int(round(remaining_headroom / burn_rate)))

            # Update maintenance status
            if item["health_score"] < 75.0 or item["vibration_mm_s"] > 3.8:
                item["maintenance_status"] = "OVERDUE"
                item["status"] = "warning"
            elif item["health_score"] < 85.0 or item["rul_days"] < 45:
                item["maintenance_status"] = "DUE_SOON"
            else:
                item["maintenance_status"] = "NOMINAL"

            # Update historical trend sparkline
            history = item.get("health_trend", [item["health_score"]] * 6)
            history.append(item["health_score"])
            if len(history) > 10:
                history.pop(0)
            item["health_trend"] = history

    # Recalculate fleet summary stats
    total_assets = len(items)
    running_count = sum(1 for it in items if it["status"] == "operational")
    standby_count = sum(1 for it in items if it["status"] == "standby")
    maintenance_count = sum(1 for it in items if it["status"] == "maintenance" or it.get("maintenance_status") == "OVERDUE")
    offline_count = sum(1 for it in items if it["status"] in ["tripped", "failed", "offline"])
    available_count = running_count + standby_count

    avg_health = round(sum(it["health_score"] for it in items) / max(1, total_assets), 1)
    avg_rul = int(round(sum(it["rul_days"] for it in items) / max(1, total_assets)))
    availability_pct = round((available_count / max(1, total_assets)) * 100.0, 1)

    equip["items"] = items
    equip["avg_health"] = avg_health
    equip["fleet_stats"] = {
        "total_assets": total_assets,
        "available": available_count,
        "running": running_count,
        "standby": standby_count,
        "maintenance": maintenance_count,
        "offline": offline_count,
        "avg_rul_days": avg_rul,
        "availability_pct": availability_pct,
        "critical_risk_count": sum(1 for it in items if it["failure_risk_pct"] > 10.0)
    }

    state["equipment"] = equip
    return state
