import { makeAutoObservable } from 'mobx'

/**
 * SensorSelectionStore
 *
 * User's sensor type preference for air quality monitoring
 * Persists across station changes and tab switches
 */
class SensorSelectionStore {
  selectedSensorType: 'PM' | 'VOCs' = 'PM'
  selectedPMType: 'PM10' | 'PM25' | null = 'PM10'

  constructor() {
    makeAutoObservable(this)
  }

  /**
   * Set sensor type preference
   */
  setSensorType = (type: 'PM' | 'VOCs') => {
    this.selectedSensorType = type
  }

  /**
   * Toggle PM sensor type (PM10 or PM25)
   * If already selected, deselect it
   */
  togglePMType = (type: 'PM10' | 'PM25') => {
    if (this.selectedPMType === type) {
      this.selectedPMType = null
    } else {
      this.selectedPMType = type
    }
  }

  /**
   * Check if PM sensors are selected
   */
  get isPMSelected(): boolean {
    return this.selectedSensorType === 'PM'
  }

  /**
   * Check if VOCs sensor is selected
   */
  get isVOCsSelected(): boolean {
    return this.selectedSensorType === 'VOCs'
  }

  /**
   * Check if PM10 is selected
   */
  get isPM10Selected(): boolean {
    return this.selectedPMType === 'PM10'
  }

  /**
   * Check if PM25 is selected
   */
  get isPM25Selected(): boolean {
    return this.selectedPMType === 'PM25'
  }
}

export const sensorSelectionStore = new SensorSelectionStore()
