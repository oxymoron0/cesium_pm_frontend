import { makeAutoObservable } from 'mobx';

class AppStore {
  count = 0;
  name = 'PM Frontend';

  constructor() {
    makeAutoObservable(this);
  }

  increment = () => {
    this.count++;
  };

  decrement = () => {
    this.count--;
  };

  setName = (newName: string) => {
    this.name = newName;
  };

  get displayText() {
    return `${this.name}: ${this.count}`;
  }
}

export const appStore = new AppStore();