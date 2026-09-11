import { create } from 'zustand';
import { TelemetrySnapshot, RiskData } from '../types';

interface TelemetryState {
  liveSnapshot: Record<string, TelemetrySnapshot>; // keyed by station_id
  liveRisk: Record<string, RiskData>;
  isConnected: boolean;
  lastTickTime: Record<string, string>;
  setConnected: (status: boolean) => void;
  updateTelemetry: (stationId: string, data: any) => void;
  updateLiveWeather: (stationId: string, weatherData: any) => void;
  updateRisk: (stationId: string, risk: RiskData) => void;
  setInitialState: (stationId: string, state: any, risk: RiskData) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  liveSnapshot: {},
  liveRisk: {},
  isConnected: false,
  lastTickTime: {},

  setConnected: (status: boolean) => set({ isConnected: status }),

  updateLiveWeather: (stationId: string, weatherData: any) => {
    set((state) => {
      const prevSnap = state.liveSnapshot[stationId] || ({} as Partial<TelemetrySnapshot>);
      const current = weatherData?.current || weatherData || {};
      const temp = current.temperature !== undefined ? Number(current.temperature) : prevSnap.environment?.temperature;
      const windSpeed = current.wind_speed_kmh !== undefined ? Number(current.wind_speed_kmh) : (current.wind_speed !== undefined ? Number(current.wind_speed) : prevSnap.environment?.wind_speed);
      const windGust = current.wind_gust_kmh !== undefined ? Number(current.wind_gust_kmh) : (current.wind_gust !== undefined ? Number(current.wind_gust) : prevSnap.environment?.wind_gust);
      const windDir = current.wind_direction !== undefined ? Number(current.wind_direction) : prevSnap.environment?.wind_direction;
      const humidity = current.humidity !== undefined ? Number(current.humidity) : prevSnap.environment?.humidity;
      const pressure = current.pressure !== undefined ? Number(current.pressure) : prevSnap.environment?.pressure;
      const solar = current.solar_radiation !== undefined ? Number(current.solar_radiation) : prevSnap.environment?.solar_radiation;
      const condition = current.condition || prevSnap.environment?.condition || 'Partly Cloudy';
      const blizzard = current.blizzard_active !== undefined ? Boolean(current.blizzard_active) : (prevSnap.environment?.blizzard_active ?? false);

      const updatedEnv = {
        ...(prevSnap.environment || {}),
        temperature: temp ?? (stationId === 'bharati' ? -19.6 : -22.4),
        wind_speed: windSpeed ?? (stationId === 'bharati' ? 14 : 28),
        wind_gust: windGust ?? (stationId === 'bharati' ? 22 : 38),
        wind_direction: windDir ?? (stationId === 'bharati' ? 182 : 153),
        humidity: humidity ?? (stationId === 'bharati' ? 65 : 34),
        pressure: pressure ?? (stationId === 'bharati' ? 983 : 984),
        solar_radiation: solar ?? (stationId === 'bharati' ? 95 : 145),
        condition: condition,
        blizzard_active: blizzard,
        storm_severity: prevSnap.environment?.storm_severity ?? 0.12,
        visibility: prevSnap.environment?.visibility ?? 18,
      };

      const newSnap: TelemetrySnapshot = {
        station_id: stationId,
        timestamp: weatherData?.updated_at || new Date().toISOString(),
        tick: prevSnap.tick || 1,
        environment: updatedEnv,
        energy: prevSnap.energy || {
          total_demand: stationId === 'bharati' ? 110 : 85,
          base_load: stationId === 'bharati' ? 45 : 35,
          heating_load: Math.max(15, Math.round((18 - (temp ?? -22.4)) * 1.3)),
          research_load: stationId === 'bharati' ? 18 : 12,
          water_heating_load: stationId === 'bharati' ? 9 : 6,
          solar_output: Math.round((solar ?? 140) * 0.12),
          generator_load: stationId === 'bharati' ? 74 : 68,
          battery_level: 94,
          grid_frequency: 50.01,
          generator_count_active: 2,
          status: 'Nominal',
        },
        fuel: prevSnap.fuel || {
          total_capacity: 120000,
          current_level: 92000,
          fuel_percentage: stationId === 'bharati' ? 74 : 77,
          consumption_rate_l_per_hr: 28.5,
          burn_rate_l_per_kwh: 0.28,
          days_remaining: stationId === 'bharati' ? 21 : 19,
          reserve_zone: 'GREEN',
          resupply_eta_days: 45,
          fuel_temperature: stationId === 'bharati' ? 2.1 : -4.2,
        },
        water: prevSnap.water || {
          source_type: stationId === 'bharati' ? 'Quilty Bay RO Plant' : 'Lake Zub Conduit',
          storage_liters: 18500,
          max_storage_liters: 25000,
          daily_consumption_l: 1200,
          pump_status: 'PUMPING',
          trace_heating_active: true,
          pipe_temp_c: 3.8,
          freeze_risk: 'LOW',
          production_rate_l_hr: 1400,
          percentage: 82,
          days_remaining: 15,
        },
        equipment: prevSnap.equipment || { items: [], avg_health: 94 },
        station_ops: prevSnap.station_ops || {
          overall_readiness: 96,
          status_band: 'GREEN',
          domain_readiness: {
            energy: 95,
            fuel: 94,
            water: 96,
            equipment: 94,
            station_ops: 96,
            environment: 92,
          },
        },
      };

      return {
        liveSnapshot: { ...state.liveSnapshot, [stationId]: newSnap },
        lastTickTime: { ...state.lastTickTime, [stationId]: new Date().toLocaleTimeString() }
      };
    });
  },

  updateTelemetry: (stationId: string, data: any) => {
    set((state) => {
      const prevSnap: Partial<TelemetrySnapshot> = state.liveSnapshot[stationId] || {};

      // Parse environment whether nested under data.environment or provided flat
      let environment = data.environment;
      if (!environment && (data.temperature !== undefined || data.wind_speed !== undefined)) {
        environment = {
          ...(prevSnap.environment || {}),
          temperature: data.temperature ?? prevSnap.environment?.temperature,
          wind_speed: data.wind_speed ?? prevSnap.environment?.wind_speed,
          wind_gust: data.wind_gust ?? prevSnap.environment?.wind_gust,
          solar_radiation: data.solar_radiation ?? prevSnap.environment?.solar_radiation,
          storm_severity: data.storm_severity ?? prevSnap.environment?.storm_severity,
          visibility: data.visibility ?? prevSnap.environment?.visibility,
          condition: data.condition ?? prevSnap.environment?.condition,
          humidity: data.humidity ?? prevSnap.environment?.humidity ?? 65,
          blizzard_active: data.blizzard_active ?? prevSnap.environment?.blizzard_active ?? false,
        };
      }

      const newSnap = {
        ...prevSnap,
        station_id: stationId,
        timestamp: data.timestamp || new Date().toISOString(),
        tick: data.tick || (prevSnap.tick || 0) + 1,
        environment: environment || prevSnap.environment,
        energy: data.energy || prevSnap.energy,
        fuel: data.fuel || prevSnap.fuel,
        water: data.water || prevSnap.water,
        equipment: data.equipment || prevSnap.equipment,
        station_ops: data.station_ops || prevSnap.station_ops,
        logistics: data.logistics || prevSnap.logistics
      };
      return {
        liveSnapshot: { ...state.liveSnapshot, [stationId]: newSnap as TelemetrySnapshot },
        lastTickTime: { ...state.lastTickTime, [stationId]: new Date().toLocaleTimeString() }
      };
    });
  },

  updateRisk: (stationId: string, risk: RiskData) => {
    set((state) => ({
      liveRisk: { ...state.liveRisk, [stationId]: risk }
    }));
  },

  setInitialState: (stationId: string, stateData: any, risk: RiskData) => {
    set((state) => ({
      liveSnapshot: { ...state.liveSnapshot, [stationId]: stateData },
      liveRisk: { ...state.liveRisk, [stationId]: risk },
      lastTickTime: { ...state.lastTickTime, [stationId]: new Date().toLocaleTimeString() }
    }));
  }
}));
