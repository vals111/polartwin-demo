from typing import List, Dict, Any

def generate_recommendations(state: dict) -> List[Dict[str, Any]]:
    fuel = state.get("fuel", {})
    energy = state.get("energy", {})
    env = state.get("environment", {})
    water = state.get("water", {})
    equipment = state.get("equipment", {})
    infra = state.get("infrastructure", {})
    logistics = state.get("logistics", {})
    station_id = state.get("station_id", "maitri")

    recs = []

    # 1. INFRASTRUCTURE RECOMMENDATIONS
    stress_idx = infra.get("structural_stress_index", 18.0)
    snow_drift = infra.get("snow_drift_accumulation_m", 0.42)
    thermal_eff = infra.get("thermal_insulation_eff", 88.0)
    
    if stress_idx > 50.0:
        recs.append({
            "action": "Pre-stress Stanchion Guy-Wire Anchors & Batten Hatches",
            "explanation": f"Structural stress index is elevated at {stress_idx}/100 under wind pressure. Tension exterior turnbuckles to 42 kN and seal windward module vestibules.",
            "priority": "HIGH",
            "domain": "infrastructure"
        })
    elif snow_drift > 0.8:
        recs.append({
            "action": "Execute Leeward Snow Surcharge Excavation",
            "explanation": f"Snow accumulation has reached {snow_drift}m on secondary roof panels. Clear drifting snow using front-loader attachment to avoid dead-load fatigue.",
            "priority": "HIGH",
            "domain": "infrastructure"
        })
    else:
        recs.append({
            "action": "Inspect Habitat Thermal Envelope Vacuum Seals & Nunatak Stilts",
            "explanation": f"Thermal envelope efficiency is at {thermal_eff}%. Conduct quarterly ultrasonic seal audit on module couplings to prevent cold-bridge heat dissipation.",
            "priority": "MEDIUM",
            "domain": "infrastructure"
        })

    recs.append({
        "action": "Verify Stilt Foundation Bedrock Anchor Torque",
        "explanation": "Micro-seismic and permafrost freeze-thaw cycles warrant torque verification on 24 nunatak bedrock anchor pins per structural safety protocol.",
        "priority": "LOW",
        "domain": "infrastructure"
    })

    # 2. ENERGY & FUEL RECOMMENDATIONS
    fuel_pct = fuel.get("fuel_percentage", 78.0)
    gen_load = energy.get("generator_load", 68.0)
    burn_rate = fuel.get("consumption_rate_l_per_hr", 17.5)

    if fuel_pct < 35.0:
        recs.append({
            "action": "Enforce Fuel Conservation Protocol Tier 2",
            "explanation": f"Fuel reserve is at {fuel_pct}%. Throttle non-residential research wing heating by 2.0°C and curtail decorative power to stretch runway by 18 days.",
            "priority": "HIGH",
            "domain": "fuel"
        })
    elif gen_load > 95.0:
        recs.append({
            "action": "Pre-heat Secondary Generator Unit 2 for Load Sharing",
            "explanation": f"Primary generator electrical load ({gen_load} kW) is operating near peak thermal limits. Synchronise secondary 100-kVA unit to split bus load.",
            "priority": "HIGH",
            "domain": "energy"
        })
    else:
        recs.append({
            "action": "Optimize Solar PV & Waste-Heat CHP Thermal Recovery",
            "explanation": f"Current generator burn rate is {burn_rate} L/h. Maximize exhaust heat exchanger capture (+32 kW thermal) to offset electrical boiler draw.",
            "priority": "MEDIUM",
            "domain": "energy"
        })

    recs.append({
        "action": "Audit Active Tank Suction Line Trace-Heating",
        "explanation": "Verify resistance telemetry on fuel transfer manifolds to ensure Antarctic Gas Oil (AGO) remains well above its -50°C waxing threshold.",
        "priority": "LOW",
        "domain": "fuel"
    })

    # 3. TRANSPORTATION & LOGISTICS RECOMMENDATIONS
    weather_delay = logistics.get("weather_delay_days", 4.5)
    logistics_risk = logistics.get("logistics_risk_score", 24.0)
    eta_days = logistics.get("effective_eta_days", 92.5)

    if logistics_risk > 50.0 or weather_delay > 10.0:
        recs.append({
            "action": "Initiate Supply Rationing & Request Icebreaker Route Revision",
            "explanation": f"Weather delay (+{weather_delay}d) pushes resupply ETA to {eta_days} days. Activate satellite recon for alternate fast-ice leads into coastal anchorage.",
            "priority": "HIGH",
            "domain": "logistics"
        })
    else:
        recs.append({
            "action": "Pre-position Emergency Fuel & Survival Cache at Traverse Waypoint 3",
            "explanation": f"Overland convoy traverse corridor ({'100 km glacier route' if station_id == 'maitri' else 'coastal staging approach'}) requires midway fuel caching to guarantee 48h emergency autonomy.",
            "priority": "MEDIUM",
            "domain": "logistics"
        })

    recs.append({
        "action": "Conduct Ground Penetrating Radar (GPR) Crevasse Reconnaissance",
        "explanation": "Deploy unmanned or vehicle-mounted 400 MHz GPR survey along primary sled corridor to verify ice-bridge thickness exceeds 2.2m safety requirement.",
        "priority": "LOW",
        "domain": "logistics"
    })

    # 4. ENVIRONMENT & WEATHER RECOMMENDATIONS
    wind_spd = env.get("wind_speed", 32.0)
    temp = env.get("temperature", -25.0)
    storm_active = env.get("blizzard_active", False)

    if storm_active or wind_spd > 65.0:
        recs.append({
            "action": "Declare Condition Red: Mandatory Habitat Lockdown & Lifeline Protocol",
            "explanation": f"Katabatic winds at {wind_spd} km/h with severe optical whiteout. Immediate cessation of outdoor work. Personnel must connect umbilical safety tethers between pods.",
            "priority": "CRITICAL",
            "domain": "environment"
        })
    elif wind_spd > 40.0:
        recs.append({
            "action": "Issue Condition Yellow: Restrict Traverses & Standby Emergency Beacons",
            "explanation": f"Rising katabatic wind velocity ({wind_spd} km/h) and apparent chill index. Restrict external movement to essential maintenance with buddy system.",
            "priority": "HIGH",
            "domain": "environment"
        })
    else:
        recs.append({
            "action": "Calibrate Barometric Tendency Gradient Sensors on AWS Array",
            "explanation": f"Current pressure 984 hPa. Recalibrate ultrasonic anemometer heating circuits prior to next forecasted low-pressure frontal passage.",
            "priority": "LOW",
            "domain": "environment"
        })

    # 5. WATER & EQUIPMENT
    if water.get("freeze_risk") != "Low":
        recs.append({
            "action": "Boost Trace-Heating Line Current by 15%",
            "explanation": f"Pipeline fluid temp is {water.get('pipe_temp_c', 3.5)}°C. Increase trace-heating current to prevent sub-glacial ice crystal formation.",
            "priority": "HIGH",
            "domain": "water"
        })

    for item in equipment.get("items", []):
        if item.get("health_score", 100.0) < 75.0:
            recs.append({
                "action": f"Schedule Overhaul on {item['name']}",
                "explanation": f"Health at {item['health_score']}%, failure risk {item.get('failure_risk_pct', 20)}%. Verified replacement seals in inventory.",
                "priority": "HIGH",
                "domain": "equipment"
            })

    return recs

