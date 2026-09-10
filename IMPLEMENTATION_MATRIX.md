# POLARTWIN — Implementation Concepts & Architecture Matrix
**Smart India Hackathon 2026 | SIH26060 | Engineering Edition**  
*Comprehensive Technical Audit & Roadmap against Technical Build Specification & Master Project Report v5*

---

## 🧭 Executive Overview
**POLARTWIN** is a physics-grounded, AI-driven Digital Twin platform designed for India's Antarctic research stations—**Maitri** (Inland base, Schirmacher Oasis) and **Bharati** (Coastal base, Larsemann Hills)—under the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences.

Unlike conventional dashboards that only display disconnected sensor gauges, POLARTWIN maintains an active, continuously evolving virtual twin where environmental conditions propagate cause-and-effect across **16 operational domains**, evaluate multi-day stochastic futures through non-destructive **What-If simulations**, explain risk factors via **SHAP attribution**, and visualize assets across both **3D spatial twin** and **3D causal constellation** environments.

---

## 📊 Table 1: Core Architecture & System Features

| System Dimension | Current Implementation in POLARTWIN | Future Implementation / Next Steps | Blueprint Reference |
| :--- | :--- | :--- | :--- |
| **Simulation Tick Orchestrator** | Multi-threaded tick loop in `engine.py` orchestrating cross-domain states continuously on a fixed interval (APScheduler). | Configurable tick speed scaling (e.g. 1x, 5x, 60x simulation time acceleration for long-term stress runs). | Build Spec §12; Report §12 |
| **Database & Data Persistence** | Full PostgreSQL / Supabase schema for stations, telemetry time-series, resources, alerts, risks, scenarios, and users. | Automated time-series partition archiving and rollup pruning for multi-year historical queries. | Build Spec §8; Report §15 |
| **Real-Time Data Streaming** | FastAPI WebSocket manager broadcasting live telemetry, alerts, and risk updates per station channel. | Binary WebSocket compression (e.g. Protocol Buffers / MsgPack) for bandwidth-constrained satellite links. | Build Spec §11; Report §13 |
| **External Weather Grounding** | Live **MET Norway (`api.met.no`)** integration for exact Antarctic coordinates (Maitri & Bharati), feeding physical simulation. | Multi-source meteorological blending (adding ECMWF and NOAA Antarctic satellite feeds with fallback). | Report §7; Build Spec §7 |
| **Security & RBAC** | JWT authentication with server-side role enforcement (`Admin`, `Operator`, `Viewer`) in `rbac.py` and endpoint decorators. | Hardware security key (WebAuthn/FIDO2) support and tamper-evident audit logging for Antarctic Treaty audits. | Build Spec §24; Report §16 |

---

## 🌐 Table 2: The 16 Operational Domains Implementation Matrix

| # | Domain Name | Current Implementation Status | Future Implementation / Next Steps | Blueprint Reference |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Energy & Power** | Fully simulated in `energy.py` (Genset 1-3 load, PV solar offset, battery SoC, heating baseline load). Dedicated `ResourceMonitoringPage`. | Dynamic harmonics distortion modeling and phase imbalance under freezing cable loads. | Build Spec §8, §31; Report §8 |
| **2** | **Fuel** | Fully simulated in `fuel.py` (300k L farm, daily burn rate, usable reserve, days remaining, depletion curves). Dedicated `FuelPage`. | Fuel viscosity changes as a function of temperature (-40°C waxing risk) and fuel recirculation pump heat. | Build Spec §8, §31; Report §8 |
| **3** | **Water** | Fully simulated in `water.py` (Maitri lake pump vs Bharati Quilty Bay seawater pump house + SWRO, trace-heat freeze risk). Dedicated `WaterPage`. | Dual water-metering split between domestic hygiene, laboratory usage, and closed-loop heating makeup water. | Build Spec §8, §31; Report §8 |
| **4** | **Environment & Weather** | Fully simulated in `environment.py` + Live MET Norway sync (temp, wind, solar, pressure, wind-chill, storm index). Dedicated `EnvironmentPage`. | Snow drift accumulation model around building foundations and entrance blockages. | Build Spec §8, §31; Report §8 |
| **5** | **Equipment & Machinery** | Fully simulated in `equipment_sim.py` (equipment health score, operating hours, MTBF, failure rates). Dedicated `EquipmentPage`. | Vibration FFT spectrum breakdown for early mechanical bearing failure prediction on primary gensets. | Build Spec §8, §31; Report §8 |
| **6** | **Transportation & Logistics** | Fully simulated in `logistics.py` (convoy/vessel transit, weather-induced delay factors, resupply windows). Dedicated `LogisticsPage`. | Satellite ice-chart ingestion to calculate sea-ice thickness along icebreaker transit routes (`MV Vasiliy Golovnin`). | Build Spec §8, §31; Report §8 |
| **7** | **Communication** | Fully simulated in `communication.py` (satellite uplink health, RF blizzard attenuation, bandwidth, latency). Dedicated `CommunicationPage`. | Automatic satellite handoff simulation (LEO Starlink vs. GEO Inmarsat backup routing). | Build Spec §8, §31; Report §8 |
| **8** | **Personnel & Occupancy** | Fully simulated in `personnel.py` (station headcount, roles, activity levels driving water/power demand). Dedicated `PersonnelPage`. | Personnel thermal exposure time tracker during field excursions beyond the habitat perimeter. | Build Spec §8, §31; Report §8 |
| **9** | **Storage & Inventory** | Fully simulated in `inventory.py` (critical spares, food rations, stockout risks, replenishment tracking). Dedicated `InventoryPage`. | Barcode/RFID scanner mock interface for inventory checkout and shelf-life expiry alerting. | Build Spec §8, §31; Report §8 |
| **10** | **Waste Management** | Backend module active in `waste.py` (incinerator toilets at Maitri, wastewater bioreactors at Bharati). | Dedicated frontend UI card/tab showing daily waste accumulation and Antarctic Treaty compliance status. | Build Spec §8, §31; Report §8 |
| **11** | **Food & Supplies** | Backend module active in `supplies.py` (perishables, dry rations, cold storage energy demand). | Resupply grocery burn-rate tracker and dietary nutritional sufficiency index. | Build Spec §8, §31; Report §8 |
| **12** | **Infrastructure & Buildings** | Backend module active in `infrastructure.py` (building module condition, structural exposure, insulation integrity). | Thermal imaging overlay and heat-loss coefficient map across prefabricated container walls. | Build Spec §8, §31; Report §8 |
| **13** | **Research Operations** | Backend module active in `research.py` (scientific payload power draw, experiment schedules). | Science campaign feasibility evaluator (approving experiments based on available microgrid power). | Build Spec §8, §31; Report §8 |
| **14** | **Safety & Emergency** | Backend module active in `safety.py` (composite hazard engine, incident classification, exposure index). | Evacuation route simulation and fire suppression zone status reporting. | Build Spec §8, §31; Report §8 |
| **15** | **Maintenance** | Backend module active in `maintenance_sim.py` (preventive schedules, work orders, health reset triggers). | Work order ticketing Kanban board with technician assignment and spare-part auto-reservation. | Build Spec §8, §31; Report §8 |
| **16** | **Station Operations** | Backend module active in `station_ops.py` (rolls up all 15 domains into composite station readiness 0–100%). | **Frontend 16-Domain Summary Grid** (`DomainSummaryGrid`) in `StationTwinPage` matching Section 21. | Build Spec §8, §21; Report §8 |

---

## 🧠 Table 3: Intelligence, AI/ML & Decision Support Matrix

| Intelligence Component | Current Implementation in POLARTWIN | Future Implementation / Next Steps | Blueprint Reference |
| :--- | :--- | :--- | :--- |
| **Time-Series Forecasting** | Hybrid forecasting in `forecasting.py` (ARIMA, Exponential Smoothing, Random Forest) with upper/lower confidence bands. | Online model re-fitting with real-time backpropagation to adapt to abrupt seasonal Antarctic transitions. | Build Spec §13; Report §18 |
| **ML Evaluation Scorecard** | Backend calculates forecasts and anomaly predictions against real and synthetic ground truth. | **Evaluation Scorecard Dashboard** on `AnalyticsPage` displaying exact validation metrics ($\text{MAE}$, $\text{RMSE}$, $\text{MAPE}$, $\text{F1-score}$). | Report §19 |
| **Multi-Tier Anomaly Detection** | 3-layer assessment in `anomaly.py` (Hard Boundary Rules + Z-score $>3$ + Isolation Forest $0.05$ contamination). | Adaptive sliding-window Z-score thresholds that auto-adjust for summer vs. winter baseline swings. | Build Spec §14; Report §20 |
| **Explainable AI (XAI)** | **SHAP** TreeExplainer attribution in `shap_engine.py` decomposing risk scores into percentage factor weights. | **Natural Language AI Copilot Briefing** (`LLM_API_KEY`) translating SHAP vectors into executive morning summaries. | Build Spec §17; Report §27 |
| **What-If Scenario Sandbox** | Cloned non-destructive state engine in `whatif_engine.py` with all 8 standardized library scenarios and Monte Carlo distributions. | **Explicit Baseline vs. Projected Delta Table** displaying exact numeric differences across fuel, power, and risk. | Build Spec §16; Report §25, §26 |
| **Polar Microgrid Optimization** | Reinforcement Learning / MILP agent in `rl_optimizer.py` balancing solar, wind, gensets, and non-essential load shedding. | Closed-loop automatic dispatch action execution toggle with human-in-the-loop safety approval. | Build Spec §18; Report §24 |

---

## 🎨 Table 4: 2D & 3D Digital Twin Visualizations

| Visual Interface | Current Implementation in POLARTWIN | Future Implementation / Next Steps | Blueprint Reference |
| :--- | :--- | :--- | :--- |
| **2D Causal DAG Viewer** | Interactive DAG in `CausalPropagationDAG.tsx` showing directed links, driver/impact highlights, and live telemetry nodes. | Live animated particle pulses along 2D edges proportional to instantaneous electrical current and fluid flow rates. | Build Spec §21; Report §8 |
| **3D Causal Constellation** | Layered 3D network in `ThreeDomainGraph.tsx` with flowing photons, auto-rotate pause, click-to-pin persistence, and interactive callout cards. | Spherical constellation clustering filter (isolating Tier 1 climate drivers or Tier 4 human habitation nodes on click). | Build Spec §21; Report §8 |
| **3D Spatial Digital Twin** | Interactive WebGL 3D architectural station twin (`ThreeStationView.tsx`) with dynamic wind vector particles and module heatmaps. | **Slide-Over Asset Telemetry Drawer** (`AssetInfoPanel`) displaying real-time load, health, burn rate, and maintenance status on click. | Build Spec §22, §29; Report §29 |
| **Dual Station Comparator** | Real-time comparative dashboard benchmarking Maitri vs Bharati across readiness, fuel burn, and risk scores. | Comparative historical carbon emission tracking and renewable penetration benchmark index. | Report §9 |

---

## 🏔️ Table 5: Station-Specific Microclimate Modeling Matrix

| Parameter | Maitri Station (Inland Base) | Bharati Station (Coastal Base) | Implementation Status |
| :--- | :--- | :--- | :--- |
| **Geographic Location** | Schirmacher Oasis (~100 km inland, $70^\circ45'\text{S}, 11^\circ44'\text{E}$) | Larsemann Hills, Prydz Bay (Coastal, $69^\circ24'\text{S}, 76^\circ11'\text{E}$) | **Implemented** (Live MET Norway feeds) |
| **Water Extraction** | Freshwater pump house from **Priyadarshini (Zub) Lake** | Seawater pump house at **Quilty Bay** via SWRO desalination | **Implemented** (Distinct physics in `water.py`) |
| **Power Infrastructure** | Multi-generator diesel array with manual synchronization | $3 \times 100\text{ kVA}$ CHP units with automated load balancing & exhaust heat | **Implemented** (Modeled in `energy.py`) |
| **Fuel Logistics** | Long-distance overland traverse convoy over shelf ice | Coastal icebreaker vessel berthing (`MV Vasiliy Golovnin`) | **Implemented** (Modeled in `logistics.py`) |
| **Waste Management** | Incinerator toilets & biological solid waste handling | Advanced membrane wastewater treatment & sludge drying | **Implemented** (Backend `waste.py`) |

---

## 🎯 Strategic Action Roadmap

To achieve complete 100% feature parity with every line of the blueprint:

1. **Frontend 16-Domain Overview Grid** (`DomainSummaryGrid`):
   - Expose the full 16-domain card grid on `StationTwinPage` or `DomainsPage` to surface Waste, Supplies, Infrastructure, Research, Safety, Maintenance, and Station Ops alongside the core 9.
2. **ML Evaluation Scorecard Dashboard**:
   - Render exact validation metrics ($\text{MAE}$, $\text{RMSE}$, $\text{MAPE}$, $\text{F1-score}$) on `AnalyticsPage` as evidence of scientific rigor.
3. **Clickable 3D Asset Telemetry Inspector Drawer**:
   - Enable slide-out inspection on `Twin3DPage` detailing component health, current load, fuel burn rate, failure risk, and maintenance status.
4. **What-If Baseline vs Projected Delta Table**:
   - Add the explicit numerical difference column on `WhatIfPage` for instant operational variance appraisal.
5. **AI Station Commander Briefing**:
   - Add a natural-language executive summary translating active SHAP values and weather hazards into actionable operational commands.
