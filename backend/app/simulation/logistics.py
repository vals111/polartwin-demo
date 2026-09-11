"""
POLARTWIN — Transportation & Logistics Tracking Simulation Module
Models the complete Antarctic supply chain lifecycle:
Requirement -> Cargo Planning -> Transport Selection -> Route -> Transit -> Weather Impact -> Arrival -> Allocation.
Models weather-dependent delays, multi-modal transport fleet, inbound cargo manifests,
resource dependencies, and causal propagation into Fuel, Equipment, and Station Readiness.
"""

def init_logistics_state(station_id: str) -> dict:
    is_maitri = (station_id == "maitri")

    if is_maitri:
        # Maitri: Inland station (~100 km from coast).
        # Supply line requires ice-class ship mooring at shelf barrier anchorage,
        # followed by a 100km overland PistenBully tracked convoy traverse across ice sheet.
        return {
            "station_id": "maitri",
            "resupply_vessel": "MV Vasiliy Golovnin (Expedition Charter)",
            "planned_window": "Nov 2026 – Jan 2027",
            "days_to_window": 82,
            "planned_eta_days": 88.0,
            "base_delay_days": 3.5,
            "weather_delay_days": 4.5,
            "effective_eta_days": 92.5,
            "primary_delay_driver": "Princess Astrid Shelf Katabatic Gale (34 km/h)",
            "delay_confidence": "Medium",
            "route_impact_level": "HIGH",
            "logistics_route": "Cape Town → Southern Ocean → Princess Astrid Coast → 100km Overland PistenBully Convoy to Schirmacher Oasis",
            "convoy_status": "Overland Convoy Pre-positioning at Ice Shelf Base",
            "berth_access": "Ice Shelf Barrier Anchorage (Shelf Edge Anchorage)",
            "overland_traverse_km": 100.0,
            "traverse_mode": "3x PistenBully 300 Polar Tracked Sleds",
            "logistics_risk_score": 24.0,
            "risk_level": "LOW",
            "risk_factors": [
                {"factor": "Weather delay on sea-ice route", "weight": 38},
                {"factor": "Overland shelf crevasse exposure", "weight": 24},
                {"factor": "Voyage ETA uncertainty band", "weight": 18},
                {"factor": "Critical fuel dependency", "weight": 12},
                {"factor": "Convoy tractor mechanical readiness", "weight": 8}
            ],
            "risk_consequence": "Fuel resupply remains within safe operating reserve window (19 days buffer). Overland convoy reconnaissance underway.",
            "current_stage_index": 4, # 0-indexed, 4 = Transit
            "lifecycle_stages": [
                {"id": "req", "name": "Requirement", "status": "completed", "desc": "Station resupply manifest finalized with NCPOR Goa"},
                {"id": "plan", "name": "Cargo Planning", "status": "completed", "desc": "180,000L AGO diesel, 365d rations, 1,240 spares palletized"},
                {"id": "vessel", "name": "Transport Selection", "status": "completed", "desc": "Arc5 Polar Ice-Class Charter MV Vasiliy Golovnin assigned"},
                {"id": "route", "name": "Route Confirmed", "status": "completed", "desc": "Cape Town to Princess Astrid Coast shelf corridor plotted"},
                {"id": "transit", "name": "Ocean Transit", "status": "active", "desc": "Vessel navigating Roaring Forties into Southern Ocean pack ice"},
                {"id": "weather", "name": "Weather Impact", "status": "active", "desc": "Katabatic squall adds +4.5d delay buffer to voyage ETA"},
                {"id": "arrival", "name": "Antarctic Arrival", "status": "upcoming", "desc": "Mooring at shelf barrier edge & PistenBully sled offloading"},
                {"id": "alloc", "name": "Station Allocation", "status": "upcoming", "desc": "100km overland convoy haul to Maitri Schirmacher Oasis depot"}
            ],
            "route_waypoints": [
                {"id": "wp1", "name": "Cape Town Staging Port", "status": "completed", "location": "Table Bay, South Africa", "distance_km": 0, "eta_days": 0, "weather": "Mild (18°C, Sea State 2)", "hazard_risk": "Nominal"},
                {"id": "wp2", "name": "Roaring Forties Corridor", "status": "completed", "location": "45°00'S, 14°30'E", "distance_km": 2100, "eta_days": 14, "weather": "Heavy Swell (Wind 45 km/h)", "hazard_risk": "Moderate Wave Action"},
                {"id": "wp3", "name": "Princess Astrid Coast Sea-Ice Edge", "status": "current", "location": "69°45'S, 11°20'E", "distance_km": 4200, "eta_days": 82, "weather": "Pack Ice Drift (Wind 34 km/h, -18°C)", "hazard_risk": "1.2m First-Year Sea Ice"},
                {"id": "wp4", "name": "Ice Shelf Barrier Anchorage", "status": "upcoming", "location": "70°05'S, 11°50'E", "distance_km": 4450, "eta_days": 88, "weather": "Cold Katabatic Draft (-24°C)", "hazard_risk": "Tidal Barrier Calving Watch"},
                {"id": "wp5", "name": "100km Overland Glacier Traverse", "status": "upcoming", "location": "Ice Shelf to Schirmacher Oasis", "distance_km": 4550, "eta_days": 91, "weather": "Katabatic Gales, Blowing Snow", "hazard_risk": "Glacial Crevasse Fields"},
                {"id": "wp6", "name": "Maitri Station Inland Depot", "status": "upcoming", "location": "70°45'S, 11°44'E", "distance_km": 4650, "eta_days": 92.5, "weather": "Oasis Local Climate (-25°C)", "hazard_risk": "Final Storage Allocation"}
            ],
            "transport_fleet": [
                {
                    "id": "pb_01",
                    "name": "PistenBully 300 Polar (Convoy Lead)",
                    "type": "Tracked Snow Vehicle",
                    "status": "READY",
                    "readiness_pct": 96,
                    "capacity": "25 Tons Towing",
                    "assignment": "100 km Overland Traverse Lead",
                    "route": "Barrier Shelf to Maitri Oasis",
                    "weather_suitability": "EXCELLENT (-50°C Rated)",
                    "current_mission": "Crevasse Radar Path Reconnaissance",
                    "fuel_burn_rate": "32.0 L/hr",
                    "payload_spec": "Heavy Tow Winch + GPR Ground Radar"
                },
                {
                    "id": "pb_02",
                    "name": "PistenBully 300 Polar (Fuel Tank Sled)",
                    "type": "Tracked Snow Vehicle",
                    "status": "READY",
                    "readiness_pct": 92,
                    "capacity": "22,000 L Fuel Bladder Sled",
                    "assignment": "Bulk Diesel Overland Haul",
                    "route": "Shelf Mooring to Maitri Fuel Farm",
                    "weather_suitability": "EXCELLENT",
                    "current_mission": "Fuel Transfer Hose Testing & Sled Staging",
                    "fuel_burn_rate": "34.5 L/hr",
                    "payload_spec": "Heated Fuel Sled + Transfer Pump"
                },
                {
                    "id": "pb_03",
                    "name": "PistenBully 300 Polar (Heavy Cargo Sled)",
                    "type": "Tracked Snow Vehicle",
                    "status": "STANDBY",
                    "readiness_pct": 94,
                    "capacity": "30 Tons Container Sled",
                    "assignment": "Spares & Food Containers",
                    "route": "Shelf Edge to Station Store Depot",
                    "weather_suitability": "GOOD",
                    "current_mission": "Suspension Inspection & Track Tensioning",
                    "fuel_burn_rate": "31.0 L/hr",
                    "payload_spec": "Multi-Axle Snow Sled with Cargo Netting"
                },
                {
                    "id": "ka32",
                    "name": "Kamov Ka-32 Helix (Heavy Helicopter)",
                    "type": "Rotary Heavy-Lift",
                    "status": "HANGAR READY",
                    "readiness_pct": 88,
                    "capacity": "5.0 Tons External Sling",
                    "assignment": "Emergency Airlift & Science Drops",
                    "route": "Princess Astrid Coast Air Corridor",
                    "weather_suitability": "MODERATE (<55 km/h Wind)",
                    "current_mission": "Pre-flight Rotor De-icing Standby",
                    "fuel_burn_rate": "620 L/hr (Jet A-1)",
                    "payload_spec": "External Cargo Hook & Rescue Hoist"
                },
                {
                    "id": "skidoo",
                    "name": "Skidoo Expedition Snowmobiles (x4)",
                    "type": "Light Utility",
                    "status": "OPERATIONAL",
                    "readiness_pct": 98,
                    "capacity": "2 Crew + 350 kg Sled",
                    "assignment": "Perimeter Patrol & Line Flagging",
                    "route": "Local Maitri Oasis Perimeter",
                    "weather_suitability": "GOOD",
                    "current_mission": "Route Marker Cane Replacement",
                    "fuel_burn_rate": "8.5 L/hr",
                    "payload_spec": "High-vis GPS & VHF Repeater"
                }
            ],
            "inbound_cargo": [
                {
                    "id": "cargo_fuel",
                    "name": "Antarctic Gas Oil (AGO) Polar Diesel",
                    "category": "Energy & Power",
                    "quantity": "180,000 Liters",
                    "destination": "Maitri Central Fuel Farm",
                    "expected_arrival_days": 92.5,
                    "required_by_days": 74.0,
                    "reserve_coverage_days": 19.0,
                    "shortage_risk": "MEDIUM",
                    "dependent_domain": "Fuel & Energy",
                    "downstream_impact": "Powers 3x Cummins generators and habitat heating boilers. If delayed >20d, fuel reserves fall below safety buffer.",
                    "delivery_chain": ["AGO Diesel Tanker", "PistenBully Sled Haul", "Maitri Fuel Farm", "Genset Supply Line", "Station Power Grid"]
                },
                {
                    "id": "cargo_food",
                    "name": "Dry Food Provisions & Cryo Galley Stock",
                    "category": "Food & Supplies",
                    "quantity": "365 Days Expedition Supply (18.5 Tons)",
                    "destination": "Main Complex Storage",
                    "expected_arrival_days": 92.5,
                    "required_by_days": 110.0,
                    "reserve_coverage_days": 42.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Food & Supplies / Personnel",
                    "downstream_impact": "Sustains 25 overwintering scientists and logistics operators. If delayed, fresh food rations restricted to emergency reserves.",
                    "delivery_chain": ["Cargo Container", "Insulated Sled", "Dry Store Depot", "Galley Pantry", "Crew Nutrition"]
                },
                {
                    "id": "cargo_spares",
                    "name": "Generator Alternators & Pump Overhaul SKUs",
                    "category": "Maintenance",
                    "quantity": "1,240 Machine SKUs",
                    "destination": "Technical Workshop",
                    "expected_arrival_days": 92.5,
                    "required_by_days": 85.0,
                    "reserve_coverage_days": 26.0,
                    "shortage_risk": "MEDIUM",
                    "dependent_domain": "Maintenance & Equipment",
                    "downstream_impact": "Critical for Cummins genset 2000-hr overhaul and Zub Lake pump replacement seals. Delayed arrival postpones preventative maintenance.",
                    "delivery_chain": ["Crated Spares", "Heated Transit", "Workshop Tooling", "Genset Overhaul", "Operational Uptime"]
                },
                {
                    "id": "cargo_science",
                    "name": "Glaciology Radar & Atmospheric Spectrometers",
                    "category": "Research Operations",
                    "quantity": "14 Instrument Crates (4.8 Tons)",
                    "destination": "Geophysical Laboratory",
                    "expected_arrival_days": 92.5,
                    "required_by_days": 98.0,
                    "reserve_coverage_days": 35.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Research Operations",
                    "downstream_impact": "High-precision radar sensors for ice sheet mass balance studies. Delays hold up the summer scientific campaign kickoff.",
                    "delivery_chain": ["Shockproof Crates", "Air/Traverse Staging", "Science Labs", "Field Deployment", "Data Acquisition"]
                },
                {
                    "id": "cargo_medical",
                    "name": "Extreme Cold Trauma & Emergency Oxygen Kits",
                    "category": "Safety & Emergency",
                    "quantity": "120 Sealed Trauma Modules",
                    "destination": "Station Sickbay / Hospital",
                    "expected_arrival_days": 92.5,
                    "required_by_days": 120.0,
                    "reserve_coverage_days": 60.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Safety & Emergency",
                    "downstream_impact": "Medical oxygen cylinders, frostbite dressings, and hyperthermia blankets. Keeps station compliant with Antarctic Treaty safety mandates.",
                    "delivery_chain": ["Medical Sealed Cases", "Direct Depot", "Sickbay Storage", "Trauma Unit", "Expedition Health"]
                }
            ],
            "impact_chain": {
                "environment_condition": "Katabatic Winds (34 km/h) & Sea Ice Pack",
                "transport_delay": "+4.5 Days Voyage Extension",
                "resupply_arrival": "Effective ETA 92.5 Days",
                "fuel_reserve": "19 Days Buffer Remaining",
                "fuel_risk": "MEDIUM Risk Elevation",
                "station_risk_impact": "+6 Pts Station Risk"
            },
            "resource_dependencies": [
                {"resource": "AGO Polar Diesel", "delivery_label": "180k L Tanker", "current_reserve_days": 19, "threshold_days": 15, "status": "WATCH", "downstream_system": "Microgrid Gensets & Boilers"},
                {"resource": "Dry Food Rations", "delivery_label": "365-day Supply", "current_reserve_days": 42, "threshold_days": 20, "status": "NOMINAL", "downstream_system": "Personnel Galley Sustenance"},
                {"resource": "Overhaul Spares", "delivery_label": "1,240 Machine SKUs", "current_reserve_days": 26, "threshold_days": 15, "status": "WATCH", "downstream_system": "Zub Lake Pump & Genset Overhaul"}
            ]
        }
    else:
        # Bharati: Coastal station in Larsemann Hills, Prydz Bay.
        # Direct coastal approach allows icebreaker mooring close to Quilty Bay fast-ice edge,
        # with barge shuttles and helicopter sling operations directly onto station roof helipad.
        return {
            "station_id": "bharati",
            "resupply_vessel": "MV Vasiliy Golovnin (Expedition Charter)",
            "planned_window": "Dec 2026 – Feb 2027",
            "days_to_window": 95,
            "planned_eta_days": 102.0,
            "base_delay_days": 1.5,
            "weather_delay_days": 2.0,
            "effective_eta_days": 104.0,
            "primary_delay_driver": "Prydz Bay Sea Swells & Fast-Ice Shifting",
            "delay_confidence": "High",
            "route_impact_level": "LOW",
            "logistics_route": "Cape Town → Southern Ocean → Prydz Bay / Quilty Bay → Direct Fast-Ice Barge Discharge & Helipad Cargo Slings",
            "convoy_status": "Quilty Bay Fast-Ice Ramp & Barge Landing Pad Operational",
            "berth_access": "Deep Water Quilty Bay Approach (0.5 km to Station)",
            "overland_traverse_km": 0.0,
            "traverse_mode": "2x Self-Propelled Cargo Barges & Roof Helipad Sling",
            "logistics_risk_score": 16.0,
            "risk_level": "LOW",
            "risk_factors": [
                {"factor": "Prydz Bay wave swell & wind", "weight": 34},
                {"factor": "Fast-ice barge offloading window", "weight": 28},
                {"factor": "Voyage ETA uncertainty band", "weight": 16},
                {"factor": "Barge mechanical readiness", "weight": 12},
                {"factor": "Helicopter sling wind limits", "weight": 10}
            ],
            "risk_consequence": "Direct deep-water coastal access provides safe operational margins. Fuel and containerized cargo schedule verified.",
            "current_stage_index": 4,
            "lifecycle_stages": [
                {"id": "req", "name": "Requirement", "status": "completed", "desc": "Bharati 15th expedition resupply manifest approved by NCPOR"},
                {"id": "plan", "name": "Cargo Planning", "status": "completed", "desc": "220,000L AGO fuel, 365d rations, CHP overhaul kits packaged"},
                {"id": "vessel", "name": "Transport Selection", "status": "completed", "desc": "Charter vessel MV Vasiliy Golovnin prepared at Cape Town"},
                {"id": "route", "name": "Route Confirmed", "status": "completed", "desc": "Direct Prydz Bay maritime shipping lane locked in"},
                {"id": "transit", "name": "Ocean Transit", "status": "active", "desc": "Vessel navigating Southern Ocean transit lane towards Prydz Bay"},
                {"id": "weather", "name": "Weather Impact", "status": "active", "desc": "Prydz Bay ocean swells introduce +2.0d navigational caution buffer"},
                {"id": "arrival", "name": "Antarctic Arrival", "status": "upcoming", "desc": "Mooring at Quilty Bay fast-ice edge 500m from station complex"},
                {"id": "alloc", "name": "Station Allocation", "status": "upcoming", "desc": "Direct barge discharge & Ka-32 roof helipad cargo sling operations"}
            ],
            "route_waypoints": [
                {"id": "wp1", "name": "Cape Town Staging Port", "status": "completed", "location": "Table Bay, South Africa", "distance_km": 0, "eta_days": 0, "weather": "Mild (18°C, Calm)", "hazard_risk": "Nominal"},
                {"id": "wp2", "name": "Southern Ocean Transit Corridor", "status": "completed", "location": "52°00'S, 45°00'E", "distance_km": 3100, "eta_days": 20, "weather": "Moderate Swells (Wind 38 km/h)", "hazard_risk": "Iceberg Radar Watch"},
                {"id": "wp3", "name": "Prydz Bay Outer Sea-Lane", "status": "current", "location": "68°30'S, 75°10'E", "distance_km": 4900, "eta_days": 95, "weather": "Sea Smoke, Wind 22 km/h, -14°C", "hazard_risk": "Fast-Ice Leads"},
                {"id": "wp4", "name": "Quilty Bay Coastal Mooring", "status": "upcoming", "location": "69°24'S, 76°11'E", "distance_km": 5100, "eta_days": 102, "weather": "Maritime Sub-Zero (-16°C)", "hazard_risk": "Berth Ice Shear"},
                {"id": "wp5", "name": "Barge Shuttle & Helipad Sling", "status": "upcoming", "location": "Quilty Bay to Station Helipad", "distance_km": 5102, "eta_days": 103, "weather": "Coastal Squall Risk", "hazard_risk": "High Wind Sling Thresholds"},
                {"id": "wp6", "name": "Bharati Station Main Building", "status": "upcoming", "location": "69°24'S, 76°11'E", "distance_km": 5103, "eta_days": 104.0, "weather": "Station Microclimate (-14°C)", "hazard_risk": "Final Internal Storage Staging"}
            ],
            "transport_fleet": [
                {
                    "id": "barge_01",
                    "name": "Self-Propelled Fast-Ice Barge #1",
                    "type": "Marine Ice Shuttle",
                    "status": "READY",
                    "readiness_pct": 95,
                    "capacity": "60 Tons Container Flatbed",
                    "assignment": "Quilty Bay Mooring to Shore Ramp",
                    "route": "Ship Berth to Shoreline Jetty",
                    "weather_suitability": "GOOD (<40 km/h Wind)",
                    "current_mission": "Mooring Winch & Ramp Testing",
                    "fuel_burn_rate": "42.0 L/hr",
                    "payload_spec": "Hydraulic Ramp + 2x 20ft ISO Container Locks"
                },
                {
                    "id": "barge_02",
                    "name": "Self-Propelled Fast-Ice Barge #2 (Fuel)",
                    "type": "Marine Ice Shuttle",
                    "status": "READY",
                    "readiness_pct": 91,
                    "capacity": "45,000 L Bulk Fuel Tanker",
                    "assignment": "Vessel to Fuel Farm Hose Offload",
                    "route": "Ship Bunkers to Bharati Fuel Farm",
                    "weather_suitability": "GOOD",
                    "current_mission": "Fuel Hose Hydrostatic Pressure Check",
                    "fuel_burn_rate": "38.5 L/hr",
                    "payload_spec": "Explosion-proof Transfer Pump + Heated Hose"
                },
                {
                    "id": "ka32",
                    "name": "Kamov Ka-32 Helix (Roof Helipad)",
                    "type": "Rotary Heavy-Lift",
                    "status": "READY",
                    "readiness_pct": 90,
                    "capacity": "5.0 Tons External Sling",
                    "assignment": "High-Value Cargo & Roof Helipad Transfer",
                    "route": "Ship Deck to Bharati Roof Helipad",
                    "weather_suitability": "MODERATE (<55 km/h Wind)",
                    "current_mission": "Helipad Wind Vector Calibration",
                    "fuel_burn_rate": "620 L/hr (Jet A-1)",
                    "payload_spec": "External Precision Sling & Cargo Nets"
                },
                {
                    "id": "groomer_01",
                    "name": "PistenBully Snow Groomer",
                    "type": "Tracked Snow Groomer",
                    "status": "OPERATIONAL",
                    "readiness_pct": 98,
                    "capacity": "10 Tons Sled / Snow Blade",
                    "assignment": "Perimeter Track & Ramp Leveling",
                    "route": "Bharati Ramp & Quilty Bay Access",
                    "weather_suitability": "EXCELLENT",
                    "current_mission": "Shore Ramp Ice Smoothing",
                    "fuel_burn_rate": "28.0 L/hr",
                    "payload_spec": "Front Blade + Rear Snow Cutter"
                }
            ],
            "inbound_cargo": [
                {
                    "id": "cargo_fuel",
                    "name": "Antarctic Gas Oil (AGO) Polar Diesel",
                    "category": "Energy & Power",
                    "quantity": "220,000 Liters",
                    "destination": "Bharati Automated Fuel Farm (300k L)",
                    "expected_arrival_days": 104.0,
                    "required_by_days": 82.0,
                    "reserve_coverage_days": 21.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Fuel & Energy",
                    "downstream_impact": "Powers 3x 100 kVA Combined Heat & Power (CHP) units and station heating. Ample capacity allows nominal generation.",
                    "delivery_chain": ["Vessel Bulk Tanks", "Barge #2 Hose Transfer", "Automated Fuel Farm", "CHP Cogeneration Units", "Station Microgrid"]
                },
                {
                    "id": "cargo_food",
                    "name": "Containerized Dry Food & Fresh Meat Stocks",
                    "category": "Food & Supplies",
                    "quantity": "365 Days Rations (22.0 Tons)",
                    "destination": "Bharati Lower Deck Storage",
                    "expected_arrival_days": 104.0,
                    "required_by_days": 115.0,
                    "reserve_coverage_days": 48.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Food & Supplies / Personnel",
                    "downstream_impact": "Sustains 30 expedition personnel. Bharati's refrigerated containers maintain 100% nutritional requirements.",
                    "delivery_chain": ["ISO Food Containers", "Barge #1 Offload", "Lower Deck Storage", "Cold Storage Rooms", "Galley"]
                },
                {
                    "id": "cargo_spares",
                    "name": "CHP Cogeneration & Desalination Spare Modules",
                    "category": "Maintenance",
                    "quantity": "1,450 Machine SKUs",
                    "destination": "Engineering Workshop",
                    "expected_arrival_days": 104.0,
                    "required_by_days": 90.0,
                    "reserve_coverage_days": 32.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Maintenance & Equipment",
                    "downstream_impact": "Spares for Quilty Bay Seawater Reverse Osmosis (SWRO) pump membranes and exhaust heat exchanger gaskets.",
                    "delivery_chain": ["Crated SKUs", "Helicopter Roof Lift", "Central Workshop", "SWRO & CHP Overhaul", "Continuous Lifeline"]
                },
                {
                    "id": "cargo_science",
                    "name": "Atmospheric Aerosol LiDAR & Marine Biology Samplers",
                    "category": "Research Operations",
                    "quantity": "18 Instrument Crates (6.2 Tons)",
                    "destination": "Upper Deck Science Laboratories",
                    "expected_arrival_days": 104.0,
                    "required_by_days": 105.0,
                    "reserve_coverage_days": 40.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Research Operations",
                    "downstream_impact": "Aerosol optical depth sensors and seawater sampling carousels for international climate studies.",
                    "delivery_chain": ["High-Value Crates", "Helicopter Sling", "Roof Deck Labs", "Calibration Test", "Science Telemetry"]
                },
                {
                    "id": "cargo_medical",
                    "name": "Surgical Consumables & Hyperbaric Treatment Kits",
                    "category": "Safety & Emergency",
                    "quantity": "140 Sealed Modules",
                    "destination": "Medical Bay / Sickbay",
                    "expected_arrival_days": 104.0,
                    "required_by_days": 130.0,
                    "reserve_coverage_days": 65.0,
                    "shortage_risk": "LOW",
                    "dependent_domain": "Safety & Emergency",
                    "downstream_impact": "Surgical packs, automated defibrillator spares, and telemedicine diagnostic kits for expedition safety.",
                    "delivery_chain": ["Sealed Medical Crates", "Direct Sickbay Transfer", "Medical Vault", "Emergency Response"]
                }
            ],
            "impact_chain": {
                "environment_condition": "Prydz Bay Sea Swells (Wind 22 km/h)",
                "transport_delay": "+2.0 Days Swell Buffer",
                "resupply_arrival": "Effective ETA 104.0 Days",
                "fuel_reserve": "21 Days Buffer Remaining",
                "fuel_risk": "LOW Risk Profile",
                "station_risk_impact": "+2 Pts Station Risk"
            },
            "resource_dependencies": [
                {"resource": "AGO Polar Diesel", "delivery_label": "220k L Bulk Transfer", "current_reserve_days": 21, "threshold_days": 15, "status": "NOMINAL", "downstream_system": "CHP Units & Habitat Heating"},
                {"resource": "Dry Food Rations", "delivery_label": "365-day Supply", "current_reserve_days": 48, "threshold_days": 20, "status": "NOMINAL", "downstream_system": "Personnel Galley Sustenance"},
                {"resource": "CHP & RO Spares", "delivery_label": "1,450 Machine SKUs", "current_reserve_days": 32, "threshold_days": 15, "status": "NOMINAL", "downstream_system": "SWRO Seawater Plant & Gensets"}
            ]
        }


def step(state: dict, perturbation: dict = None) -> dict:
    """
    Simulates causal logistics progression on every tick.
    Weather (wind, storm severity) directly drives transit delay and risk.
    Downstream: Resupply ETA directly influences Fuel, Maintenance, and Station Readiness.
    Supports What-If scenario perturbations (e.g. resupply_delay).
    """
    log = dict(state.get("logistics", {}))
    station_id = state.get("station_id", "maitri")
    is_maitri = (station_id == "maitri")

    # If uninitialized, initialize first
    if not log or "planned_eta_days" not in log:
        log = init_logistics_state(station_id)

    env = state.get("environment", {})
    fuel = state.get("fuel", {})
    wind = float(env.get("wind_speed", 25.0))
    storm = float(env.get("storm_severity", 0.1))
    blizzard = bool(env.get("blizzard_active", False))

    # Causal Weather Delay Calculation:
    # Maitri has an inland overland traverse (wind/storms have higher impact due to whiteout hazard).
    # Bharati has coastal barge operations (wind limits offloading when >45 km/h).
    base_delay = 3.5 if is_maitri else 1.5
    wind_multiplier = 0.09 if is_maitri else 0.06
    storm_multiplier = 4.5 if is_maitri else 3.0

    extra_delay = 0.0
    if wind > 40.0:
        extra_delay += (wind - 40.0) * wind_multiplier
    if storm > 0.2:
        extra_delay += storm * storm_multiplier
    if blizzard:
        extra_delay += 1.5 if is_maitri else 0.8

    weather_delay = round(base_delay + extra_delay, 1)

    # What-If Perturbation Injection (e.g. icebreaker delayed 20 days)
    if perturbation and perturbation.get("type") == "resupply_delay":
        scenario_delay = float(perturbation.get("days", 20.0))
        weather_delay += scenario_delay

    log["weather_delay_days"] = weather_delay
    log["effective_eta_days"] = round(log["planned_eta_days"] + weather_delay, 1)

    # Dynamic delay driver explanation
    if storm > 0.5 or wind > 70.0:
        log["primary_delay_driver"] = f"Severe Katabatic Storm & High Winds ({round(wind)} km/h)"
        log["delay_confidence"] = "Low (Storm Volatility)"
        log["route_impact_level"] = "CRITICAL" if weather_delay > 15.0 else "HIGH"
    elif wind > 45.0 or blizzard:
        log["primary_delay_driver"] = f"Polar Gale & Sea-Ice Pack Drift ({round(wind)} km/h)"
        log["delay_confidence"] = "Medium (Drift Hazard)"
        log["route_impact_level"] = "HIGH" if weather_delay > 8.0 else "MEDIUM"
    else:
        log["primary_delay_driver"] = "Nominal Sea-Lane & Pack Ice Navigation"
        log["delay_confidence"] = "High (Clear Window)"
        log["route_impact_level"] = "LOW"

    # Dynamic Logistics Risk Score (0-100)
    # 38% Weather delay, 24% Route exposure, 18% ETA uncertainty, 12% Cargo dependency, 8% Fleet readiness
    delay_component = min(100.0, (weather_delay / 25.0) * 100.0) * 0.38
    route_exposure = (38.0 if is_maitri else 22.0) * 0.24
    eta_uncertainty = (65.0 if storm > 0.3 else 25.0) * 0.18
    cargo_dep = 45.0 * 0.12
    fleet_risk = 12.0 * 0.08

    risk_score = round(delay_component + route_exposure + eta_uncertainty + cargo_dep + fleet_risk, 1)
    if perturbation and perturbation.get("type") == "resupply_delay":
        risk_score = min(96.0, round(risk_score + 25.0, 1))

    log["logistics_risk_score"] = risk_score
    if risk_score > 70:
        log["risk_level"] = "CRITICAL"
    elif risk_score > 45:
        log["risk_level"] = "HIGH"
    elif risk_score > 25:
        log["risk_level"] = "MEDIUM"
    else:
        log["risk_level"] = "LOW"

    # Dynamic Risk Factors Breakdown
    log["risk_factors"] = [
        {"factor": "Weather delay & storm intensity", "weight": round((delay_component / risk_score) * 100) if risk_score > 0 else 38},
        {"factor": "Route terrain & sea-ice exposure", "weight": round((route_exposure / risk_score) * 100) if risk_score > 0 else 24},
        {"factor": "Voyage ETA uncertainty window", "weight": round((eta_uncertainty / risk_score) * 100) if risk_score > 0 else 18},
        {"factor": "Critical fuel & spares dependency", "weight": round((cargo_dep / risk_score) * 100) if risk_score > 0 else 12},
        {"factor": "Transport fleet readiness factor", "weight": round((fleet_risk / risk_score) * 100) if risk_score > 0 else 8}
    ]

    # Human-readable risk consequence narrative
    fuel_days = fuel.get("days_remaining", 19.0)
    if risk_score > 65 or weather_delay > 15:
        log["risk_consequence"] = f"CRITICAL: Resupply delay (+{weather_delay}d) exceeds safe operating window! Fuel reserve ({fuel_days}d remaining) risks exhaustion before arrival. Immediate load-shedding and rationing required."
    elif risk_score > 40 or weather_delay > 6:
        log["risk_consequence"] = f"WARNING: Weather delay (+{weather_delay}d) narrowing fuel reserve margin ({fuel_days}d remaining). Maintenance overhaul schedule on watch."
    else:
        log["risk_consequence"] = f"NOMINAL: Resupply timeline is stable within operational safety envelope. Current fuel reserve ({fuel_days}d remaining) provides sufficient operational buffer."

    # Update impact chain
    log["impact_chain"] = {
        "environment_condition": f"Wind {round(wind)} km/h, Storm {round(storm * 100)}%",
        "transport_delay": f"+{weather_delay} Days Voyage Delay",
        "resupply_arrival": f"Effective ETA {log['effective_eta_days']} Days",
        "fuel_reserve": f"{fuel_days} Days Buffer Remaining",
        "fuel_risk": "HIGH" if fuel_days < 14 else ("MEDIUM" if fuel_days < 20 else "LOW"),
        "station_risk_impact": f"{'+18 Pts' if risk_score > 45 else '+4 Pts'} Station Risk"
    }

    # Synchronize fuel days in resource dependencies
    if "resource_dependencies" in log:
        for res in log["resource_dependencies"]:
            if "Diesel" in res["resource"]:
                res["current_reserve_days"] = round(fuel_days, 1)
                res["status"] = "CRITICAL" if fuel_days < 10 else ("WATCH" if fuel_days < 20 else "NOMINAL")

    state["logistics"] = log
    return state
