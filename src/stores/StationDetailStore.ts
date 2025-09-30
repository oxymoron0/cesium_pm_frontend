import { makeAutoObservable } from 'mobx'

/**
 * StationDetailStore
 *
 * AirQualityStatus 모달 내부의 정류장 상세 정보 상태 관리
 * Cesium 렌더링용 StationStore와 분리된 독립적인 Store
 */
class StationDetailStore {
  // 선택된 노선
  selectedRoute: string | null = null

  // 선택된 정류장 정보
  selectedStationId: string | null = null
  selectedStationName: string | null = null
  selectedRouteName: string | null = null
  selectedDirection: 'inbound' | 'outbound' | null = null
  selectedDirectionName: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  /**
   * 노선 선택
   * 정류장 선택 상태 초기화
   */
  selectRoute = (routeName: string) => {
    this.selectedRoute = routeName
    this.clearStationSelection()
  }

  /**
   * 정류장 선택
   */
  selectStation = (
    stationId: string,
    stationName: string,
    routeName: string,
    direction: 'inbound' | 'outbound',
    directionName: string
  ) => {
    this.selectedStationId = stationId
    this.selectedStationName = stationName
    this.selectedRouteName = routeName
    this.selectedDirection = direction
    this.selectedDirectionName = directionName
  }

  /**
   * 정류장 선택 해제
   */
  clearStationSelection = () => {
    this.selectedStationId = null
    this.selectedStationName = null
    this.selectedRouteName = null
    this.selectedDirection = null
    this.selectedDirectionName = null
  }

  /**
   * 전체 선택 해제
   */
  clearAll = () => {
    this.selectedRoute = null
    this.clearStationSelection()
  }

  /**
   * 정류장이 선택되었는지 확인
   */
  get hasStationSelected(): boolean {
    return this.selectedStationId !== null
  }

  /**
   * 노선이 선택되었는지 확인
   */
  get hasRouteSelected(): boolean {
    return this.selectedRoute !== null
  }
}

export const stationDetailStore = new StationDetailStore()
