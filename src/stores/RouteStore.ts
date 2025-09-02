import { makeAutoObservable } from 'mobx';

class RouteStore {
  selectedRouteNumber: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setSelectedRoute(routeNumber: string) {
    this.selectedRouteNumber = routeNumber;
  }

  clearSelection() {
    this.selectedRouteNumber = null;
  }

  isSelected(routeNumber: string): boolean {
    return this.selectedRouteNumber === routeNumber;
  }
}

export const routeStore = new RouteStore();