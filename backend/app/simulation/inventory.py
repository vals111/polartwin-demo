def init_inventory_state(station_id: str) -> dict:
    return {
        "categories": {
            "critical_spares": [
                {"name": "Diesel Fuel Filter Cartridges", "quantity": 48, "threshold": 12, "unit": "units"},
                {"name": "RO High-Pressure Membrane Seals", "quantity": 16, "threshold": 4, "unit": "sets"},
                {"name": "PistenBully Track Pins & Links", "quantity": 24, "threshold": 6, "unit": "units"}
            ],
            "consumables": [
                {"name": "Polar Synthetic Engine Oil 5W-40", "quantity": 1200, "threshold": 300, "unit": "liters"},
                {"name": "Sub-zero Glycol Antifreeze", "quantity": 650, "threshold": 150, "unit": "liters"}
            ],
            "medical": [
                {"name": "Emergency Trauma & Hypothermia Kits", "quantity": 30, "threshold": 10, "unit": "kits"},
                {"name": "High-Altitude / Polar Pharmaceuticals", "quantity": 150, "threshold": 40, "unit": "courses"}
            ]
        },
        "critical_items_low": 0,
        "inventory_health": "Healthy"
    }

def step(state: dict, perturbation: dict = None) -> dict:
    inv = dict(state.get("inventory", {}))
    # Check items below threshold
    low_count = 0
    for cat_items in inv.get("categories", {}).values():
        for item in cat_items:
            if item["quantity"] <= item["threshold"]:
                low_count += 1
    inv["critical_items_low"] = low_count
    inv["inventory_health"] = "Attention Required" if low_count > 0 else "Healthy"
    state["inventory"] = inv
    return state
