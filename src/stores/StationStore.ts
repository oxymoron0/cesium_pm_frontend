import { makeAutoObservable } from 'mobx';

class StationStore {
  selectedStationName: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setSelectedStation(stationName: string) {
    this.selectedStationName = stationName;
  }

  clearSelection() {
    this.selectedStationName = null;
  }

  isSelected(stationName: string): boolean {
    return this.selectedStationName === stationName;
  }
}

export const stationStore = new StationStore();