import { makeAutoObservable } from 'mobx'
import { vulnerabilityStore } from './VulnerabilityStore'

class AppStore {
  count = 0
  name = 'PM Frontend'

  constructor() {
    makeAutoObservable(this)
  }

  increment = () => {
    this.count++
  }

  decrement = () => {
    this.count--
  }

  setName = (name: string) => {
    this.name = name
  }

  get displayText() {
    return `${this.name}: ${this.count}`
  }
}

export const appStore = new AppStore()
export default AppStore

// Store 인스턴스들을 중앙 관리
export const stores = {
  appStore,
  vulnerabilityStore,
}

// 사용자 북마크 한 Bus 노선 목록
// 사용자가 북마크한 정류장 목록