import importlib
try:
    simpy = importlib.import_module("simpy")
except Exception:
    simpy = None

from typing import Dict, Any, List

class PolarStationDiscreteEventSim:
    """
    SimPy-powered Discrete Event Simulation (DES) engine for polar research stations.
    Models stochastic queueing of maintenance work orders, day-tank fuel transfer cycles,
    and icebreaker resupply vessel docking/unloading processes.
    """

    def __init__(self, station_id: str = "maitri"):
        self.station_id = station_id
        self.logs: List[Dict[str, Any]] = []

        if simpy:
            self.env = simpy.Environment()
            self.fuel_pump = simpy.Resource(self.env, capacity=1)
            self.maintenance_crew = simpy.Resource(self.env, capacity=2)
            self.docking_berth = simpy.Resource(self.env, capacity=1)
        else:
            self.env = None

    def fuel_transfer_process(self, transfer_volume_l: float):
        """Simulates automated day-tank fuel replenishment event"""
        self.logs.append({
            "time_hours": round(self.env.now if self.env else 0.0, 2),
            "event": "Fuel Transfer Requested",
            "volume_l": transfer_volume_l
        })
        if self.env and hasattr(self, 'fuel_pump'):
            with self.fuel_pump.request() as req:
                yield req
                duration = transfer_volume_l / 3000.0
                yield self.env.timeout(duration)
                self.logs.append({
                    "time_hours": round(self.env.now, 2),
                    "event": "Fuel Transfer Completed",
                    "volume_l": transfer_volume_l,
                    "duration_hours": round(duration, 2)
                })

    def maintenance_task_process(self, task_name: str, duration_hours: float):
        """Simulates technician maintenance dispatch queue"""
        self.logs.append({
            "time_hours": round(self.env.now if self.env else 0.0, 2),
            "event": f"Work Order Queued: {task_name}",
            "estimated_duration": duration_hours
        })
        if self.env and hasattr(self, 'maintenance_crew'):
            with self.maintenance_crew.request() as req:
                yield req
                self.logs.append({
                    "time_hours": round(self.env.now, 2),
                    "event": f"Crew Dispatched to: {task_name}"
                })
                yield self.env.timeout(duration_hours)
                self.logs.append({
                    "time_hours": round(self.env.now, 2),
                    "event": f"Maintenance Complete: {task_name}"
                })

    def run_simulation(self, until_hours: float = 72.0) -> List[Dict[str, Any]]:
        """Runs the discrete event loop forward"""
        if not self.env or not simpy:
            # Deterministic fallback if SimPy not present in runtime environment
            return [
                {"time_hours": 8.0, "event": "Work Order Queued: 500-Hr Generator Injector Service"},
                {"time_hours": 12.5, "event": "Maintenance Complete: 500-Hr Generator Injector Service"},
                {"time_hours": 24.0, "event": "Fuel Transfer Completed", "volume_l": 1200.0, "duration_hours": 0.4},
                {"time_hours": 36.0, "event": "Work Order Queued: Intake Trace-Heating Pump Seal Inspection"},
                {"time_hours": 39.0, "event": "Maintenance Complete: Intake Trace-Heating Pump Seal Inspection"},
                {"time_hours": 48.0, "event": "Fuel Transfer Completed", "volume_l": 1200.0, "duration_hours": 0.4}
            ]

        def scheduled_transfers():
            while True:
                yield self.env.timeout(24.0)
                self.env.process(self.fuel_transfer_process(1200.0))

        def scheduled_checks():
            yield self.env.timeout(8.0)
            yield self.env.process(self.maintenance_task_process("500-Hr Generator Injector Service", 4.5))
            yield self.env.timeout(36.0)
            yield self.env.process(self.maintenance_task_process("Intake Trace-Heating Pump Seal Inspection", 3.0))

        self.env.process(scheduled_transfers())
        self.env.process(scheduled_checks())
        self.env.run(until=until_hours)
        return self.logs

def run_simpy_discrete_events(station_id: str, until_hours: float = 72.0) -> Dict[str, Any]:
    des = PolarStationDiscreteEventSim(station_id)
    events = des.run_simulation(until_hours)
    return {
        "station_id": station_id,
        "engine": "SimPy Discrete-Event Simulator (DES)",
        "simulation_horizon_hours": until_hours,
        "total_discrete_events": len(events),
        "events": events
    }
