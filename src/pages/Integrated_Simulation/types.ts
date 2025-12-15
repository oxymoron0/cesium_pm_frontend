// Integrated page types

export type ServiceType = 'monitoring' | 'simulation' | 'priority';

export interface ServiceState {
  monitoring: MonitoringState;
  simulation: SimulationState;
  priority: PriorityState;
}

export interface MonitoringState {
  initialized: boolean;
}

export interface SimulationState {
  initialized: boolean;
}

export interface PriorityState {
  initialized: boolean;
  currentView: 'config' | 'customConfig' | 'result';
  locationMode: 'address' | 'point';
  isStatisticsPopupOpen: boolean;
}

export interface ServiceConfig {
  id: ServiceType;
  label: string;
  shortLabel: string;
}

export const SERVICE_CONFIGS: ServiceConfig[] = [
  { id: 'monitoring', label: '모니터링', shortLabel: '모니터링' },
  { id: 'simulation', label: '시뮬레이션', shortLabel: '시뮬레이션' },
  { id: 'priority', label: '우선순위', shortLabel: '우선순위' },
];
