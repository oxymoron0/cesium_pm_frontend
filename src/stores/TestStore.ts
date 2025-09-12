import { makeAutoObservable } from 'mobx';

class TestStore {
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

export const testStore = new TestStore();