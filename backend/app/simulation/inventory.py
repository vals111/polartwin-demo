"""
POLARTWIN — Storage, Spares & Parts Inventory Simulation Module
Models physical inventory stock, storage locations/bins, consumption rates,
depletion curves, expiry tracking, reorder thresholds, maintenance job staging,
and cross-domain resupply dependencies for Maitri and Bharati stations.
"""

from typing import Dict, Any, List
import copy
from datetime import datetime, timezone, timedelta

def init_inventory_state(station_id: str) -> Dict[str, Any]:
    is_maitri = (station_id == "maitri")
    
    # Station-specific configuration
    total_skus = 1420 if is_maitri else 1850
    storage_facility = "Heated Module Container Store" if is_maitri else "Automated RFID Smart Matrix"
    resupply_eta_days = 88.0 if is_maitri else 102.0

    # Categorized inventory catalog with full operational attributes
    items: List[Dict[str, Any]] = [
        # --- Category 1: Critical Machine Spares & Seals ---
        {
            "id": "sku-sp-01",
            "name": "Diesel Fuel Filter Cartridges",
            "category": "critical_spares",
            "category_label": "Critical Machine Spares",
            "quantity": 48,
            "unit": "units",
            "storage_location": "Rack A, Bin A-14",
            "storage_facility": storage_facility,
            "capacity": 80,
            "min_safe_stock": 12,
            "reorder_point": 20,
            "daily_consumption": 0.35,
            "monthly_consumption": 10.5,
            "days_remaining": 137.0,
            "condition": "Good",
            "criticality": "HIGH",
            "expiry_date": "2028-12-31",
            "days_to_expiry": 840,
            "incoming_qty": 60,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Generator G-1 (Kirloskar 62.5 kVA)", "Generator G-2 (Kirloskar 62.5 kVA)", "Generator G-3 (Kirloskar 62.5 kVA)"],
            "dependent_maintenance_task": "Scheduled Generator Fuel System 500-Hr Overhaul",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 48},
                {"day": 15, "stock": 43},
                {"day": 30, "stock": 38},
                {"day": 45, "stock": 32},
                {"day": 60, "stock": 27},
                {"day": 75, "stock": 22},
                {"day": 90, "stock": 17}
            ]
        },
        {
            "id": "sku-sp-02",
            "name": "RO High-Pressure Membrane Seals",
            "category": "critical_spares",
            "category_label": "Critical Machine Spares",
            "quantity": 16,
            "unit": "sets",
            "storage_location": "Rack W, Bin W-04",
            "storage_facility": storage_facility,
            "capacity": 30,
            "min_safe_stock": 4,
            "reorder_point": 8,
            "daily_consumption": 0.12,
            "monthly_consumption": 3.6,
            "days_remaining": 133.0,
            "condition": "Good",
            "criticality": "HIGH",
            "expiry_date": "2027-06-30",
            "days_to_expiry": 290,
            "incoming_qty": 20,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["RO Water Desalination Unit 1", "Priyadarshini Lake Water Filtration"],
            "dependent_maintenance_task": "RO Plant High-Pressure Pump Recertification",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 16},
                {"day": 15, "stock": 14},
                {"day": 30, "stock": 12},
                {"day": 45, "stock": 11},
                {"day": 60, "stock": 9},
                {"day": 75, "stock": 7},
                {"day": 90, "stock": 5}
            ]
        },
        {
            "id": "sku-sp-03",
            "name": "PistenBully Track Pins & Bushings",
            "category": "critical_spares",
            "category_label": "Critical Machine Spares",
            "quantity": 24,
            "unit": "units",
            "storage_location": "Bay C, Heavy Bin C-01",
            "storage_facility": storage_facility,
            "capacity": 40,
            "min_safe_stock": 6,
            "reorder_point": 10,
            "daily_consumption": 0.18,
            "monthly_consumption": 5.4,
            "days_remaining": 133.0,
            "condition": "Good",
            "criticality": "HIGH",
            "expiry_date": "2030-01-01",
            "days_to_expiry": 1200,
            "incoming_qty": 30,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["PistenBully 300 Polar Convoy #1", "PistenBully 300 Polar Convoy #2"],
            "dependent_maintenance_task": "100km Overland Convoy Pre-Traverse Track Re-pinning",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 24},
                {"day": 15, "stock": 21},
                {"day": 30, "stock": 19},
                {"day": 45, "stock": 16},
                {"day": 60, "stock": 13},
                {"day": 75, "stock": 11},
                {"day": 90, "stock": 8}
            ]
        },
        {
            "id": "sku-sp-04",
            "name": "Incinerator Blower Bearings (6208-2RS)",
            "category": "critical_spares",
            "category_label": "Critical Machine Spares",
            "quantity": 8,
            "unit": "sets",
            "storage_location": "Rack A, Bin A-15",
            "storage_facility": storage_facility,
            "capacity": 15,
            "min_safe_stock": 2,
            "reorder_point": 4,
            "daily_consumption": 0.08,
            "monthly_consumption": 2.4,
            "days_remaining": 100.0,
            "condition": "Good",
            "criticality": "MEDIUM",
            "expiry_date": "2029-12-31",
            "days_to_expiry": 1100,
            "incoming_qty": 10,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Incinerator Primary Draft Fan", "Boiler Exhaust Blower"],
            "dependent_maintenance_task": "Task #1: Incinerator Draft Blower Bearing Swap",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 8},
                {"day": 15, "stock": 7},
                {"day": 30, "stock": 6},
                {"day": 45, "stock": 4},
                {"day": 60, "stock": 3},
                {"day": 75, "stock": 2},
                {"day": 90, "stock": 1}
            ]
        },
        {
            "id": "sku-sp-05",
            "name": "Combustion Glow Plugs & Injector Nozzles",
            "category": "critical_spares",
            "category_label": "Critical Machine Spares",
            "quantity": 14,
            "unit": "kits",
            "storage_location": "Rack A, Bin A-08",
            "storage_facility": storage_facility,
            "capacity": 25,
            "min_safe_stock": 6,
            "reorder_point": 12,
            "daily_consumption": 0.15,
            "monthly_consumption": 4.5,
            "days_remaining": 93.0,
            "condition": "Good",
            "criticality": "HIGH",
            "expiry_date": "2028-06-30",
            "days_to_expiry": 650,
            "incoming_qty": 18,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Auxiliary Snow Melter Boiler", "Emergency Diesel Generator"],
            "dependent_maintenance_task": "Cold-Start Ignition Injector Balancing",
            "status": "WATCH",
            "depletion_curve": [
                {"day": 0, "stock": 14},
                {"day": 15, "stock": 12},
                {"day": 30, "stock": 10},
                {"day": 45, "stock": 7},
                {"day": 60, "stock": 5},
                {"day": 75, "stock": 3},
                {"day": 90, "stock": 1}
            ]
        },

        # --- Category 2: Consumable Fluids & Lubricants ---
        {
            "id": "sku-cs-01",
            "name": "Polar Synthetic Engine Oil 5W-40",
            "category": "consumables",
            "category_label": "Consumables & Fluids",
            "quantity": 1200,
            "unit": "Liters",
            "storage_location": "Drum Bay F-01 to F-06",
            "storage_facility": storage_facility,
            "capacity": 2000,
            "min_safe_stock": 300,
            "reorder_point": 500,
            "daily_consumption": 7.5,
            "monthly_consumption": 225.0,
            "days_remaining": 160.0,
            "condition": "Good",
            "criticality": "CRITICAL",
            "expiry_date": "2027-12-31",
            "days_to_expiry": 475,
            "incoming_qty": 1500,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Station Main Generator Array", "Heavy Mobile Tractors"],
            "dependent_maintenance_task": "250-Hour Scheduled Generator Lube Oil Change",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 1200},
                {"day": 15, "stock": 1088},
                {"day": 30, "stock": 975},
                {"day": 45, "stock": 863},
                {"day": 60, "stock": 750},
                {"day": 75, "stock": 638},
                {"day": 90, "stock": 525}
            ]
        },
        {
            "id": "sku-cs-02",
            "name": "Sub-zero Hydronic Glycol Antifreeze",
            "category": "consumables",
            "category_label": "Consumables & Fluids",
            "quantity": 650,
            "unit": "Liters",
            "storage_location": "Drum Bay G-02",
            "storage_facility": storage_facility,
            "capacity": 1000,
            "min_safe_stock": 150,
            "reorder_point": 250,
            "daily_consumption": 4.2,
            "monthly_consumption": 126.0,
            "days_remaining": 154.0,
            "condition": "Good",
            "criticality": "HIGH",
            "expiry_date": "2028-10-31",
            "days_to_expiry": 780,
            "incoming_qty": 800,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Station Central Heating Loop", "Trace Heated Water Conduits"],
            "dependent_maintenance_task": "Hydronic Loop pH & Freeze Protection Recharge",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 650},
                {"day": 15, "stock": 587},
                {"day": 30, "stock": 524},
                {"day": 45, "stock": 461},
                {"day": 60, "stock": 398},
                {"day": 75, "stock": 335},
                {"day": 90, "stock": 272}
            ]
        },
        {
            "id": "sku-cs-03",
            "name": "High-Pressure Hydraulic Fluid ISO VG 32",
            "category": "consumables",
            "category_label": "Consumables & Fluids",
            "quantity": 380,
            "unit": "Liters",
            "storage_location": "Drum Bay H-01",
            "storage_facility": storage_facility,
            "capacity": 600,
            "min_safe_stock": 100,
            "reorder_point": 160,
            "daily_consumption": 2.1,
            "monthly_consumption": 63.0,
            "days_remaining": 180.0,
            "condition": "Good",
            "criticality": "MEDIUM",
            "expiry_date": "2029-05-31",
            "days_to_expiry": 990,
            "incoming_qty": 400,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Crane Hoist & Sled Winches", "Heavy Cargo Ramp Hydraulics"],
            "dependent_maintenance_task": "Cargo Sled Winch Hydraulic Seal Flush",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 380},
                {"day": 15, "stock": 348},
                {"day": 30, "stock": 317},
                {"day": 45, "stock": 285},
                {"day": 60, "stock": 254},
                {"day": 75, "stock": 222},
                {"day": 90, "stock": 191}
            ]
        },

        # --- Category 3: Medical & Emergency Supplies ---
        {
            "id": "sku-med-01",
            "name": "Emergency Trauma & Hypothermia Kits",
            "category": "medical",
            "category_label": "Medical & Emergency",
            "quantity": 30,
            "unit": "kits",
            "storage_location": "Medical Bay, Locker M-01",
            "storage_facility": "Station Medical Infirmatory",
            "capacity": 50,
            "min_safe_stock": 10,
            "reorder_point": 15,
            "daily_consumption": 0.05,
            "monthly_consumption": 1.5,
            "days_remaining": 600.0,
            "condition": "Good",
            "criticality": "CRITICAL",
            "expiry_date": "2026-11-30",
            "days_to_expiry": 80,
            "incoming_qty": 35,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Station Search & Rescue Team", "Field Expedition Medical Bay"],
            "dependent_maintenance_task": "Monthly Cold-Injury Survival Kit Audit",
            "status": "WATCH",
            "depletion_curve": [
                {"day": 0, "stock": 30},
                {"day": 15, "stock": 29},
                {"day": 30, "stock": 29},
                {"day": 45, "stock": 28},
                {"day": 60, "stock": 27},
                {"day": 75, "stock": 26},
                {"day": 90, "stock": 26}
            ]
        },
        {
            "id": "sku-med-02",
            "name": "Polar Anti-infection & Analgesic Pharmaceuticals",
            "category": "medical",
            "category_label": "Medical & Emergency",
            "quantity": 150,
            "unit": "courses",
            "storage_location": "Medical Bay, Climate Cabinet M-04",
            "storage_facility": "Station Medical Infirmatory",
            "capacity": 250,
            "min_safe_stock": 40,
            "reorder_point": 60,
            "daily_consumption": 0.45,
            "monthly_consumption": 13.5,
            "days_remaining": 333.0,
            "condition": "Good",
            "criticality": "CRITICAL",
            "expiry_date": "2027-04-30",
            "days_to_expiry": 230,
            "incoming_qty": 200,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Expedition Medical Doctor", "Crew Health Management"],
            "dependent_maintenance_task": "Quarterly Pharmaceutical Potency Audit",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 150},
                {"day": 15, "stock": 143},
                {"day": 30, "stock": 137},
                {"day": 45, "stock": 130},
                {"day": 60, "stock": 123},
                {"day": 75, "stock": 116},
                {"day": 90, "stock": 110}
            ]
        },
        {
            "id": "sku-med-03",
            "name": "Medical Oxygen Cylinders (10L / 200 bar)",
            "category": "medical",
            "category_label": "Medical & Emergency",
            "quantity": 12,
            "unit": "cylinders",
            "storage_location": "Gas Store Secure Bay",
            "storage_facility": "Station Medical Infirmatory",
            "capacity": 20,
            "min_safe_stock": 4,
            "reorder_point": 6,
            "daily_consumption": 0.03,
            "monthly_consumption": 0.9,
            "days_remaining": 400.0,
            "condition": "Good",
            "criticality": "CRITICAL",
            "expiry_date": "2031-12-31",
            "days_to_expiry": 1900,
            "incoming_qty": 15,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Emergency Resuscitation Unit", "High-Altitude Flight Bag"],
            "dependent_maintenance_task": "Hydrostatic Pressure Test Verification",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 12},
                {"day": 15, "stock": 12},
                {"day": 30, "stock": 11},
                {"day": 45, "stock": 11},
                {"day": 60, "stock": 10},
                {"day": 75, "stock": 10},
                {"day": 90, "stock": 9}
            ]
        },

        # --- Category 4: Research Consumables & Reagents ---
        {
            "id": "sku-res-01",
            "name": "Atmospheric Spectrometer Calibration Gas",
            "category": "research",
            "category_label": "Research Supplies",
            "quantity": 8,
            "unit": "canisters",
            "storage_location": "Science Module Bay S-02",
            "storage_facility": "Scientific Observation Laboratory",
            "capacity": 15,
            "min_safe_stock": 3,
            "reorder_point": 5,
            "daily_consumption": 0.04,
            "monthly_consumption": 1.2,
            "days_remaining": 200.0,
            "condition": "Good",
            "criticality": "MEDIUM",
            "expiry_date": "2027-08-31",
            "days_to_expiry": 350,
            "incoming_qty": 10,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Brewer Ozone Spectrophotometer", "Greenhouse Gas Picarro Analyzer"],
            "dependent_maintenance_task": "Bi-Monthly Optical Calibration Run",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 8},
                {"day": 15, "stock": 7},
                {"day": 30, "stock": 7},
                {"day": 45, "stock": 6},
                {"day": 60, "stock": 6},
                {"day": 75, "stock": 5},
                {"day": 90, "stock": 4}
            ]
        },
        {
            "id": "sku-res-02",
            "name": "Cryogenic Biological Sample Vials (Cryovials)",
            "category": "research",
            "category_label": "Research Supplies",
            "quantity": 850,
            "unit": "vials",
            "storage_location": "Science Module Bay S-09",
            "storage_facility": "Scientific Observation Laboratory",
            "capacity": 1500,
            "min_safe_stock": 200,
            "reorder_point": 350,
            "daily_consumption": 5.0,
            "monthly_consumption": 150.0,
            "days_remaining": 170.0,
            "condition": "Good",
            "criticality": "LOW",
            "expiry_date": "2032-01-01",
            "days_to_expiry": 2000,
            "incoming_qty": 1000,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Lake Schirmacher Microbial Sampling", "Ice Core Glaciology Lab"],
            "dependent_maintenance_task": "Sub-zero Bio-repository Sample Processing",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 850},
                {"day": 15, "stock": 775},
                {"day": 30, "stock": 700},
                {"day": 45, "stock": 625},
                {"day": 60, "stock": 550},
                {"day": 75, "stock": 475},
                {"day": 90, "stock": 400}
            ]
        },

        # --- Category 5: Maintenance Hardware & Infrastructure Parts ---
        {
            "id": "sku-hw-01",
            "name": "Self-Regulating Trace Heating Cable (20W/m)",
            "category": "maintenance_hardware",
            "category_label": "Maintenance Hardware",
            "quantity": 180,
            "unit": "Meters",
            "storage_location": "Electrical Spares Rack E-03",
            "storage_facility": storage_facility,
            "capacity": 400,
            "min_safe_stock": 50,
            "reorder_point": 80,
            "daily_consumption": 0.8,
            "monthly_consumption": 24.0,
            "days_remaining": 225.0,
            "condition": "Good",
            "criticality": "CRITICAL",
            "expiry_date": "2035-01-01",
            "days_to_expiry": 3000,
            "incoming_qty": 250,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Water Supply Pipeline Freeze Protection", "Wastewater Conduit Tracing"],
            "dependent_maintenance_task": "Task #2: Water Conduit Pump Seal & Trace Heat Inspection",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 180},
                {"day": 15, "stock": 168},
                {"day": 30, "stock": 156},
                {"day": 45, "stock": 144},
                {"day": 60, "stock": 132},
                {"day": 75, "stock": 120},
                {"day": 90, "stock": 108}
            ]
        },
        {
            "id": "sku-hw-02",
            "name": "Heavy-Duty Contactors & Thermal Overload Relays",
            "category": "maintenance_hardware",
            "category_label": "Maintenance Hardware",
            "quantity": 18,
            "unit": "units",
            "storage_location": "Electrical Spares Rack E-07",
            "storage_facility": storage_facility,
            "capacity": 35,
            "min_safe_stock": 5,
            "reorder_point": 8,
            "daily_consumption": 0.07,
            "monthly_consumption": 2.1,
            "days_remaining": 257.0,
            "condition": "Good",
            "criticality": "HIGH",
            "expiry_date": "2033-12-31",
            "days_to_expiry": 2600,
            "incoming_qty": 20,
            "resupply_eta_days": resupply_eta_days,
            "resupply_gap_days": 0.0,
            "used_by": ["Main Power Distribution Switchboard", "HVAC Air Handling Units"],
            "dependent_maintenance_task": "Station Main Switchboard Annual Thermography & Contact Dressing",
            "status": "OPTIMAL",
            "depletion_curve": [
                {"day": 0, "stock": 18},
                {"day": 15, "stock": 17},
                {"day": 30, "stock": 16},
                {"day": 45, "stock": 15},
                {"day": 60, "stock": 14},
                {"day": 75, "stock": 13},
                {"day": 90, "stock": 12}
            ]
        }
    ]

    # CMMS Scheduled Maintenance Job Staging
    maintenance_jobs: List[Dict[str, Any]] = [
        {
            "work_order_id": "WO-2026-089",
            "title": "Incinerator Draft Blower Bearing Swap",
            "target_asset": "Solid Waste Incinerator Unit #1",
            "scheduled_in_days": 14,
            "required_parts": [
                {"name": "Incinerator Blower Bearings (6208-2RS)", "qty_required": 2, "qty_available": 8, "unit": "sets"}
            ],
            "parts_status": "READY",
            "assigned_technician": "V. Raman (Senior Mechanical Tech)",
            "priority": "HIGH",
            "operational_impact": "Prevents catastrophic blower motor lockup and waste accumulation."
        },
        {
            "work_order_id": "WO-2026-094",
            "title": "Water Conduit Pump Seal & Trace Heat Inspection",
            "target_asset": "Lake Water Intake Pump P-01",
            "scheduled_in_days": 21,
            "required_parts": [
                {"name": "RO High-Pressure Membrane Seals", "qty_required": 1, "qty_available": 16, "unit": "sets"},
                {"name": "Self-Regulating Trace Heating Cable", "qty_required": 15, "qty_available": 180, "unit": "Meters"}
            ],
            "parts_status": "READY",
            "assigned_technician": "S. K. Joshi (HVAC & Water Specialist)",
            "priority": "CRITICAL",
            "operational_impact": "Maintains sub-zero freeze protection across the 800m lake intake line."
        },
        {
            "work_order_id": "WO-2026-102",
            "title": "PistenBully Sled Convoy Pre-Traverse Track Re-Pinning",
            "target_asset": "PistenBully 300 Polar Tracked Convoy",
            "scheduled_in_days": 42,
            "required_parts": [
                {"name": "PistenBully Track Pins & Bushings", "qty_required": 8, "qty_available": 24, "unit": "units"}
            ],
            "parts_status": "READY",
            "assigned_technician": "A. Verma (Heavy Vehicle Tech)",
            "priority": "HIGH",
            "operational_impact": "Guarantees convoy integrity across crevassed blue ice to shelf barrier."
        },
        {
            "work_order_id": "WO-2026-115",
            "title": "Main Generator G-2 500-Hour Scheduled Overhaul",
            "target_asset": "Kirloskar 62.5 kVA Diesel Generator G-2",
            "scheduled_in_days": 55,
            "required_parts": [
                {"name": "Diesel Fuel Filter Cartridges", "qty_required": 4, "qty_available": 48, "unit": "units"},
                {"name": "Polar Synthetic Engine Oil 5W-40", "qty_required": 60, "qty_available": 1200, "unit": "Liters"}
            ],
            "parts_status": "READY",
            "assigned_technician": "V. Raman (Senior Mechanical Tech)",
            "priority": "CRITICAL",
            "operational_impact": "Rotates primary electrical generation bus and ensures cold-weather reliability."
        }
    ]

    # Category summary metrics
    storage_capacity = {
        "critical_spares": {"used_pct": 68.0, "total_capacity_units": 190, "current_units": 110},
        "consumables": {"used_pct": 74.0, "total_capacity_units": 3600, "current_units": 2230},
        "medical": {"used_pct": 42.0, "total_capacity_units": 320, "current_units": 192},
        "research": {"used_pct": 81.0, "total_capacity_units": 1515, "current_units": 858},
        "maintenance_hardware": {"used_pct": 52.0, "total_capacity_units": 435, "current_units": 198}
    }

    # Parts readiness breakdown
    readiness_breakdown = {
        "maintenance_coverage": 100.0,
        "critical_spares": 96.0 if is_maitri else 98.0,
        "emergency_supplies": 100.0,
        "research_consumables": 89.0 if is_maitri else 93.0
    }

    # Anomalies
    anomalies = [
        {
            "id": "anom-inv-01",
            "item_id": "sku-sp-01",
            "item_name": "Diesel Fuel Filter Cartridges",
            "anomaly_type": "Elevated Consumption Rate",
            "deviation_pct": 35.0,
            "expected_rate": "0.26 units/day",
            "observed_rate": "0.35 units/day",
            "detected_at": "Simulation Tick Active",
            "severity": "MEDIUM",
            "root_cause": "Increased auxiliary generator runtime during unseasonable katabatic wind chill.",
            "recommended_action": "Verify fuel pre-filter sediment trap clarity and monitor injector nozzle spray pattern."
        }
    ]

    # Recommendations
    recommendations = [
        {
            "id": "rec-inv-01",
            "priority": "HIGH",
            "title": "Monitor Combustion Glow Plug Reserve Buffer",
            "reason": "Stock is at 14 kits (Reorder point: 12). Projected stock reaches reorder point in 13 days.",
            "affected_operations": "Auxiliary Snow Melter and Generator Cold-Start Reliability",
            "suggested_action": "Flag item for expedited container priority in upcoming resupply voyage."
        },
        {
            "id": "rec-inv-02",
            "priority": "MEDIUM",
            "title": "Audit Medical Bay Hypothermia Kit Expiry",
            "reason": "Batch of 30 Trauma & Hypothermia kits expires on 2026-11-30 (80 days remaining).",
            "affected_operations": "Search & Rescue Field Survival Readiness",
            "suggested_action": "Rotate expiring chemical heat pads into training stock and replace with fresh shipment."
        },
        {
            "id": "rec-inv-03",
            "priority": "LOW",
            "title": "Optimize Research Reagent Storage Rack Utilization",
            "reason": "Research storage rack capacity utilization reached 81.0% due to cryogenic cryovial staging.",
            "affected_operations": "Biochemical Laboratory Logistics",
            "suggested_action": "Consolidate empty sample racks into secondary unheated container store."
        }
    ]

    # Impact chain
    impact_chain = {
        "inventory_level": "Optimal (100% Critical Spares Available)",
        "maintenance_capability": "100% Job Readiness (4/4 Staged)",
        "equipment_availability": "94.2% Fleet/Generator Operational",
        "station_operations": "All Vital Life Support Loops Nominal",
        "station_risk_delta": "+0.4 pts (Nominal)",
        "narrative": "Healthy spare parts buffer prevents scheduled generator overhaul delays and avoids single-point power grid exposure."
    }

    return {
        "station_id": station_id,
        "facility_name": storage_facility,
        "total_skus": total_skus,
        "active_critical_skus": 184 if is_maitri else 240,
        "stockout_count": 0,
        "critical_items_low": 0,
        "approaching_threshold_count": 2,
        "expiring_skus_count": 1,
        "unavailable_skus_count": 0,
        "parts_readiness_pct": 94.0 if is_maitri else 97.0,
        "readiness_breakdown": readiness_breakdown,
        "upcoming_delivery_days": resupply_eta_days,
        "dependent_delivery_items_count": 12,
        "overall_capacity_pct": 67.4,
        "storage_capacity": storage_capacity,
        "items": items,
        "maintenance_jobs": maintenance_jobs,
        "anomalies": anomalies,
        "recommendations": recommendations,
        "impact_chain": impact_chain,
        "inventory_health": "Optimal"
    }

def step(state: Dict[str, Any], perturbation: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Executes a single simulation tick for Storage & Inventory.
    Applies small physical consumption deltas, re-evaluates thresholds,
    updates days remaining, calculates resupply gaps, and processes perturbations.
    """
    inv = dict(state.get("inventory", {}))
    station_id = state.get("station_id", "maitri")

    # If inventory state is missing or empty, initialize it
    if not inv or "items" not in inv:
        inv = init_inventory_state(station_id)

    # Check for resupply ETA from logistics if available
    logistics = state.get("logistics", {})
    resupply_eta = logistics.get("effective_eta_days", inv.get("upcoming_delivery_days", 88.0))
    inv["upcoming_delivery_days"] = resupply_eta

    # Check for perturbations (What-If scenarios)
    consumption_mult = 1.0
    extra_delay_days = 0.0
    critical_spare_lost = False

    if perturbation:
        p_type = perturbation.get("type")
        if p_type == "resupply_delay":
            extra_delay_days = float(perturbation.get("days", 20))
        elif p_type == "consumption_surge":
            consumption_mult = float(perturbation.get("multiplier", 1.30))
        elif p_type == "spare_unavailability":
            critical_spare_lost = True

    effective_resupply_eta = resupply_eta + extra_delay_days

    # Update item states
    items = inv.get("items", [])
    low_count = 0
    stockout_count = 0
    approaching_count = 0

    for item in items:
        # Micro consumption per tick
        daily_rate = item.get("daily_consumption", 0.2) * consumption_mult
        # 1 tick is roughly small fraction of a day, apply slight decrement if above 0
        tick_consumption = (daily_rate / 360.0) # simulation time slice
        new_qty = max(0.0, item["quantity"] - tick_consumption)
        item["quantity"] = round(new_qty, 2)

        # Recompute days remaining
        if daily_rate > 0:
            days_left = round(item["quantity"] / daily_rate, 1)
        else:
            days_left = 999.0
        item["days_remaining"] = days_left

        # Calculate resupply gap
        if days_left < effective_resupply_eta:
            item["resupply_gap_days"] = round(effective_resupply_eta - days_left, 1)
        else:
            item["resupply_gap_days"] = 0.0

        # Evaluate threshold status
        min_stock = item.get("min_safe_stock", 5)
        reorder = item.get("reorder_point", 10)

        if critical_spare_lost and item["id"] == "sku-sp-04":
            item["quantity"] = 0
            item["condition"] = "Damaged / Quarantined"
            item["status"] = "OUT_OF_STOCK"
            stockout_count += 1
        elif item["quantity"] == 0:
            item["status"] = "OUT_OF_STOCK"
            stockout_count += 1
        elif item["quantity"] <= min_stock:
            item["status"] = "CRITICAL"
            low_count += 1
        elif item["quantity"] <= reorder:
            item["status"] = "LOW"
            low_count += 1
        elif item["quantity"] <= (reorder * 1.25):
            item["status"] = "WATCH"
            approaching_count += 1
        else:
            item["status"] = "OPTIMAL"

    inv["stockout_count"] = stockout_count
    inv["critical_items_low"] = low_count
    inv["approaching_threshold_count"] = approaching_count

    # Recalculate parts readiness
    if stockout_count > 0:
        base_readiness = 82.0
    elif low_count > 0:
        base_readiness = 88.5
    else:
        base_readiness = 94.0 if station_id == "maitri" else 97.0

    inv["parts_readiness_pct"] = max(50.0, round(base_readiness - (extra_delay_days * 0.45), 1))
    inv["inventory_health"] = "Attention Required" if (low_count > 0 or stockout_count > 0) else "Optimal"

    state["inventory"] = inv
    return state
