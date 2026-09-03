import uuid
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models import (
    Station, Asset, Equipment, Telemetry, Resource,
    Inventory, Personnel, ResearchOperation, Maintenance,
    Alert, Risk, Forecast, Scenario, SimulationRun, User
)
from app.security.auth import get_password_hash

def init_db_and_seed():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # 1. Seed Users if not present
        if db.query(User).count() == 0:
            users = [
                User(
                    user_id=str(uuid.uuid4()),
                    email="admin@polartwin.gov.in",
                    hashed_password=get_password_hash("Admin@1234"),
                    role="admin"
                ),
                User(
                    user_id=str(uuid.uuid4()),
                    email="operator@polartwin.gov.in",
                    hashed_password=get_password_hash("Operator@1234"),
                    role="operator"
                ),
                User(
                    user_id=str(uuid.uuid4()),
                    email="viewer@polartwin.gov.in",
                    hashed_password=get_password_hash("Viewer@1234"),
                    role="viewer"
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Stations if not present
        if db.query(Station).count() == 0:
            st_maitri = Station(
                station_id="maitri",
                name="Maitri Antarctic Research Station",
                location_type="inland"
            )
            st_bharati = Station(
                station_id="bharati",
                name="Bharati Antarctic Research Station",
                location_type="coastal"
            )
            db.add_all([st_maitri, st_bharati])
            db.commit()

            # Assets for Maitri
            maitri_assets = [
                Asset(asset_id="ast_m_gen", station_id="maitri", type="generator", name="Maitri Diesel Generator Complex"),
                Asset(asset_id="ast_m_fuel", station_id="maitri", type="fuel_farm", name="Maitri Fuel Storage Depot"),
                Asset(asset_id="ast_m_water", station_id="maitri", type="pump_house", name="Priyadarshini (Zub) Lake Pump Station"),
                Asset(asset_id="ast_m_hab", station_id="maitri", type="building", name="Main Station Habitat Block"),
                Asset(asset_id="ast_m_sat", station_id="maitri", type="satellite_array", name="Inmarsat & Polar Satcom Dome")
            ]
            # Assets for Bharati
            bharati_assets = [
                Asset(asset_id="ast_b_chp", station_id="bharati", type="generator", name="3x100-kVA CHP Automated Power Plant"),
                Asset(asset_id="ast_b_fuel", station_id="bharati", type="fuel_farm", name="Bharati 300,000L Fuel Farm"),
                Asset(asset_id="ast_b_water", station_id="bharati", type="pump_house", name="Quilty Bay Seawater RO Desalination Intake"),
                Asset(asset_id="ast_b_hab", station_id="bharati", type="building", name="Prefabricated Container Main Complex"),
                Asset(asset_id="ast_b_sat", station_id="bharati", type="satellite_array", name="Tracking Earth Station Satcom Terminal")
            ]
            db.add_all(maitri_assets + bharati_assets)
            db.commit()

            # Equipment
            eq1 = Equipment(equipment_id="gen_01", asset_id="ast_m_gen", health_score=94.5)
            eq2 = Equipment(equipment_id="pump_01", asset_id="ast_m_water", health_score=88.0)
            eq3 = Equipment(equipment_id="gen_02", asset_id="ast_b_chp", health_score=96.0)
            eq4 = Equipment(equipment_id="pump_02", asset_id="ast_b_water", health_score=92.5)
            db.add_all([eq1, eq2, eq3, eq4])

            # Resources
            r1 = Resource(station_id="maitri", type="fuel", level=138000.0)
            r2 = Resource(station_id="maitri", type="water", level=18500.0)
            r3 = Resource(station_id="bharati", type="fuel", level=245000.0)
            r4 = Resource(station_id="bharati", type="water", level=28000.0)
            db.add_all([r1, r2, r3, r4])

            # Personnel
            p1 = Personnel(station_id="maitri", headcount=25, date=date.today())
            p2 = Personnel(station_id="bharati", headcount=22, date=date.today())
            db.add_all([p1, p2])

            db.commit()
    finally:
        db.close()
