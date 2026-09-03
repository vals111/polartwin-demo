# POLARTWIN — Antarctic Research Station Digital Twin
### Smart India Hackathon 2026 | Problem Statement: SIH26060 | Ministry of Earth Sciences (MoES) / NCPOR

> **POLARTWIN** is a real-time, physics-informed Digital Twin platform for India's **Maitri** (inland, Schirmacher Oasis) and **Bharati** (coastal, Larsemann Hills) Antarctic research stations. It continuously simulates, monitors, forecasts, and detects anomalies across **16 interconnected operational domains**, calculates multi-factor weighted risk scores, and enables non-destructive **What-If contingency simulations** on isolated cloned states.

---

## 🌟 Key Capabilities

1. **Dual Independent Station Simulation (Maitri & Bharati)**:
   - Shared causal simulation logic with real, station-specific parameter sets:
     - **Maitri**: Inland (~100 km from shelf), lake-water pump house from Priyadarshini (Zub) Lake, incinerator toilets, overland PistenBully traverse routes.
     - **Bharati**: Coastal Larsemann Hills, 3x100 kVA automated CHP units, Quilty Bay seawater intake with trace-heated pipelines and RO desalination, modular container architecture.
2. **16 Interconnected Operational Domains**:
   - `Environment & Weather` (Root external driver: temperature, wind gusts, solar radiation, blizzard index)
   - `Energy & Power` (Base demand, heating loads, solar PV generation, generator dispatch, battery buffers)
   - `Fuel` (Consumption rate, reserve levels, survival days margin, 4-tier graduation zones)
   - `Water` (Lake vs seawater RO intake, pipe freeze risk, trace-heating status)
   - `Waste Management` (Incinerators vs biological wastewater treatment, Treaty compliance)
   - `Food & Supplies` (Depletion rates, freezer temperatures, emergency iron rations)
   - `Infrastructure & Buildings` (Thermal efficiency, structural wind stress)
   - `Equipment & Machinery` (Run hours, vibration, load stress degradation, failure probability)
   - `Transportation & Logistics` (Annual resupply shipping window, weather delay factor)
   - `Communication` (LEO Polar satellite, Inmarsat backup, latency, radome de-icing)
   - `Personnel & Occupancy` (Expedition headcount, team deployment, life-support demand)
   - `Research Operations` (Active scientific experiments, equipment power draw, data telemetry)
   - `Safety & Emergency` (Freeze-out hazards, fire suppression, blizzard lockdown levels)
   - `Maintenance` (Condition-based work orders, spare part verification, health resets)
   - `Storage & Inventory` (Spares catalog, lubricants, filters, minimum thresholds)
   - `Station Operations` (Top-level composite readiness score rolling up all 15 domains)
3. **Causal Propagation (No Independent Random Values)**:
   - Flagship demonstration chain: `Environment → Energy → Generator → Fuel → Logistics → Risk`.
4. **Intelligence Layer**:
   - **Forecasting**: Random Forest & Holt-Winters Exponential Smoothing with 90% confidence bands.
   - **Anomaly Detection**: Hybrid assessment combining hard limits, statistical z-scores (`|z| > 3`), and `IsolationForest(contamination=0.05)`.
   - **Risk Engine**: Multi-domain weighted scoring normalized to a 0–100 index with ranked contributing factors.
   - **Explainability**: Plain-language human-readable reasoning for every alert and risk score.
   - **What-If Engine**: Non-destructive simulation on cloned states with 8 pre-loaded contingency presets and baseline vs. projected comparative tables.
5. **Interactive 3D Digital Twin**:
   - Built with Three.js / React Three Fiber / Drei.
   - Interactive clickable assets: Main Habitat Complex, Generator Units, Fuel Tank Farm, Water Intake Pump Station, and Satcom Terminal.

---

## 🏗️ System Architecture

```
CLIENT (React 18 + Vite + Tailwind CSS + Three.js)
  │  HTTPS / WSS
  ▼
APPLICATION SERVER (FastAPI + ASGI Uvicorn + APScheduler)
  ├── Simulation Engine (16 Synchronous Domain Modules)
  ├── Intelligence Layer (Forecasting, Anomaly, Risk, What-If)
  ├── WebSocket Manager (Per-station telemetry & alert broadcasting)
  └── REST API Router Layer (Viewer+, Operator+, Admin endpoints)
  ▼
DATABASE LAYER (PostgreSQL / Supabase OR local zero-config SQLite)
  └── 15 Tables: stations, assets, equipment, telemetry, resources,
      inventory, personnel, research_ops, maintenance, alerts,
      risks, forecasts, scenarios, simulation_runs, users
```

---

## 🚀 Quick Start & Local Execution

### 1. Backend Setup

```bash
cd backend

# (Optional) Create virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Root Health Status: `http://127.0.0.1:8000/`

### 2. Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
- Frontend UI: `http://localhost:5173`

---

## 🔑 Pre-seeded Personas & Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@polartwin.gov.in` | `Admin@1234` | Full system access, user administration, manual tick triggers |
| **Operator** | `operator@polartwin.gov.in` | `Operator@1234` | Live monitoring, What-If simulation, decision mitigations |
| **Viewer** | `viewer@polartwin.gov.in` | `Viewer@1234` | Read-only dashboards, analytics, 3D twin inspection |

*(Quick-login buttons are also provided directly on the Login page for one-click testing.)*

---

## 🧪 Testing Strategy

The repository includes unit, integration, and scenario tests covering the complete pipeline:

```bash
cd backend
python -m pytest -v
```

- `tests/unit/test_fuel_simulation.py`: Validates fuel consumption, burn rate, and days remaining formulas.
- `tests/unit/test_risk_engine.py`: Validates multi-domain weighted risk scores and level boundary transitions.
- `tests/unit/test_anomaly.py`: Validates hard limit bounds and anomaly flags.
- `tests/integration/test_api_telemetry.py`: Tests login, station listings, and telemetry retrieval.
- `tests/scenario/test_storm_scenario.py`: Executes a 3-day severe storm What-If perturbation and asserts that risk rises predictably without altering the live twin state.
