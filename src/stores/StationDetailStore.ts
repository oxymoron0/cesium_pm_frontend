import { makeAutoObservable } from 'mobx'
import type { RouteStationsResponse } from '@/utils/api/types'

/**
 * StationDetailStore
 *
 * AirQualityStatus 모달 내부의 정류장 상세 정보 상태 관리
 * Cesium 렌더링용 StationStore와 분리된 독립적인 Store
 */
class StationDetailStore {
  // AirQualityStatus 모달 표시 여부
  isModalOpen = false

  // 선택된 노선
  selectedRoute: string | null = null

  // 선택된 정류장 정보
  selectedStationId: string | null = null
  selectedStationName: string | null = null
  selectedRouteName: string | null = null
  selectedDirection: 'inbound' | 'outbound' | null = null
  selectedDirectionName: string | null = null

  // 노선별 정류장 데이터 캐시
  routeStationCache: Map<string, {
    inbound: RouteStationsResponse
    outbound: RouteStationsResponse
  }> = new Map()

  constructor() {
    makeAutoObservable(this)
  }

  /**
   * 모달 열기
   */
  openModal = () => {
    this.isModalOpen = true
  }

  /**
   * 모달 닫기
   */
  closeModal = () => {
    this.isModalOpen = false
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
   * 정류장 선택 (노선 및 방면 정보도 함께 설정)
   */
  selectStation = (
    stationId: string,
    stationName: string,
    routeName: string,
    direction: 'inbound' | 'outbound',
    directionName: string
  ) => {
    this.selectedRoute = routeName
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
   * 노선별 정류장 데이터 캐싱
   */
  cacheRouteStations = (
    routeName: string,
    data: {
      inbound: RouteStationsResponse
      outbound: RouteStationsResponse
    }
  ) => {
    this.routeStationCache.set(routeName, data)
  }

  /**
   * 캐시된 노선별 정류장 데이터 가져오기
   */
  getCachedRouteStations = (routeName: string) => {
    return this.routeStationCache.get(routeName)
  }

  /**
   * 노선 데이터가 캐시되어 있는지 확인
   */
  hasRouteStationCache = (routeName: string): boolean => {
    return this.routeStationCache.has(routeName)
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
