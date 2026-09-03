def init_maintenance_state(station_id: str) -> dict:
    return {
        "tasks": [
            {
                "task_id": "maint_01",
                "equipment_id": "gen_01",
                "title": "500-Hour Lubricant & Injector Inspection",
                "status": "pending",
                "priority": "High",
                "spares_available": True
            },
            {
                "task_id": "maint_02",
                "equipment_id": "pump_01",
                "title": "Intake Trace Heating Impeller Seal Check",
                "status": "in_progress",
                "priority": "Medium",
                "spares_available": True
            }
        ],
        "pending_count": 1,
        "in_progress_count": 1,
        "completed_recent": 6
    }

def step(state: dict, perturbation: dict = None) -> dict:
    maint = dict(state.get("maintenance", {}))
    equip = state.get("equipment", {})

    tasks = [dict(t) for t in maint.get("tasks", [])]
    for item in equip.get("items", []):
        if item["health_score"] < 75.0 and not any(t["equipment_id"] == item["id"] for t in tasks):
            tasks.append({
                "task_id": f"maint_{len(tasks)+1}",
                "equipment_id": item["id"],
                "title": f"Urgent Overhaul: {item['name']}",
                "status": "pending",
                "priority": "Critical",
                "spares_available": True
            })

    maint["tasks"] = tasks
    maint["pending_count"] = sum(1 for t in tasks if t["status"] == "pending")
    maint["in_progress_count"] = sum(1 for t in tasks if t["status"] == "in_progress")
    state["maintenance"] = maint
    return state
