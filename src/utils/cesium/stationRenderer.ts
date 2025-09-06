import { Color, Cartesian3, HeightReference, LabelStyle, VerticalOrigin, Cartesian2 } from 'cesium';
import { flyToLocation } from '../cesiumControls';
import { findDataSource, createDataSource, clearDataSource } from './datasources';

/**
 * Station 인터페이스 정의
 */
export interface Station {
  id: number;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  ars_id: string;
  station_id: string;
}

/**
 * 렌더링 옵션 인터페이스
 */
export interface RenderStationOptions {
  color?: any;
  pixelSize?: number;
  heightOffset?: number;
  showLabel?: boolean;
  flyToStation?: boolean;
  cameraHeight?: number;
}

export interface RenderStationsOptions {
  color?: any;
  pixelSize?: number;
  heightOffset?: number;
  showLabels?: boolean;
  groupColors?: boolean;
}

/**
 * 단일 Station을 'station' DataSource에 렌더링
 * @param station - 렌더링할 Station 객체
 * @param options - 렌더링 옵션
 */
export function renderStation(station: Station, options?: RenderStationOptions) {
  if (!station.location) {
    console.warn('[renderStation] station location이 없습니다.');
    return null;
  }

  const config = {
    color: options?.color || Color.YELLOW,
    pixelSize: options?.pixelSize || 10,
    heightOffset: options?.heightOffset || 20,
    showLabel: options?.showLabel !== false,
    flyToStation: options?.flyToStation !== false,
    cameraHeight: options?.cameraHeight || 500,
  };

  try {
    // 'station' DataSource 가져오기 또는 생성
    let stationDataSource = findDataSource('station');
    if (!stationDataSource) {
      stationDataSource = createDataSource('station');
    }

    const entityId = `station_${station.id}`;
    
    // 기존 Entity 확인 및 제거
    const existingEntity = stationDataSource.entities.getById(entityId);
    if (existingEntity) {
      stationDataSource.entities.remove(existingEntity);
      console.log(`[renderStation] 기존 Entity 제거 후 재생성: ${station.name}`);
    }

    // Entity 직접 추가
    const entity = stationDataSource.entities.add({
      id: entityId,
      name: station.name,
      position: Cartesian3.fromDegrees(
        station.location.longitude,
        station.location.latitude,
        config.heightOffset
      ),
      point: {
        pixelSize: config.pixelSize,
        color: config.color,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND
      },
      label: config.showLabel ? {
        text: `${station.name}\n(${station.ars_id})`,
        font: '12pt sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 1,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -10)
      } : undefined
    });

    // 카메라 이동
    if (config.flyToStation) {
      const viewer = (window as any).cviewer;
      if (viewer) {
        flyToLocation(
          viewer, 
          station.location.longitude, 
          station.location.latitude, 
          config.cameraHeight
        );
      }
    }

    console.log(`[renderStation] Station 렌더링 완료: ${station.name}`);
    return entity;

  } catch (error) {
    console.error(`[renderStation] Station 렌더링 실패: ${station.name}`, error);
    return null;
  }
}

/**
 * 여러 Station들을 'station' DataSource에 일괄 렌더링
 * @param stations - 렌더링할 Station 배열
 * @param options - 렌더링 옵션
 */
export function renderStations(stations: Station[], options?: RenderStationsOptions) {
  if (!stations.length) {
    console.warn('[renderStations] stations 배열이 없습니다.');
    return [];
  }

  const config = {
    color: options?.color || Color.YELLOW,
    pixelSize: options?.pixelSize || 8,
    heightOffset: options?.heightOffset || 20,
    showLabels: options?.showLabels !== false,
    groupColors: options?.groupColors || false,
  };

  const entities: any[] = [];
  const colors = [Color.YELLOW, Color.CYAN, Color.LIME, Color.ORANGE, Color.PINK];

  try {
    // 'station' DataSource 가져오기 또는 생성
    let stationDataSource = findDataSource('station');
    if (!stationDataSource) {
      stationDataSource = createDataSource('station');
    }

    stations.forEach((station, index) => {
      try {
        const stationColor = config.groupColors ? colors[index % colors.length] : config.color;
        const entityId = `station_${station.id}`;
        
        // 기존 Entity 확인 및 제거
        const existingEntity = stationDataSource.entities.getById(entityId);
        if (existingEntity) {
          stationDataSource.entities.remove(existingEntity);
          console.log(`[renderStations] 기존 Entity 제거 후 재생성: ${station.name}`);
        }
        
        const entity = stationDataSource.entities.add({
          id: entityId,
          name: station.name,
          position: Cartesian3.fromDegrees(
            station.location.longitude,
            station.location.latitude,
            config.heightOffset
          ),
          point: {
            pixelSize: config.pixelSize,
            color: stationColor,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            heightReference: HeightReference.CLAMP_TO_GROUND
          },
          label: config.showLabels ? {
            text: `${station.name}\n(${station.ars_id})`,
            font: '12pt sans-serif',
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 1,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -10)
          } : undefined
        });

        if (entity) {
          entities.push(entity);
        }

      } catch (error) {
        console.error(`[renderStations] Station 렌더링 실패: ${station.name}`, error);
      }
    });

    console.log(`[renderStations] ${entities.length}/${stations.length} Stations 렌더링 완료`);
    return entities;

  } catch (error) {
    console.error(`[renderStations] DataSource 생성 실패:`, error);
    return [];
  }
}

/**
 * Station을 노선별로 그룹화하여 'station' DataSource에 렌더링
 * @param stations - Station 배열
 */
export function renderStationsByRoute(stations: Station[]) {
  if (!stations.length) {
    console.warn('[renderStationsByRoute] stations 배열이 없습니다.');
    return;
  }

  // 노선별 그룹화
  const routeGroups = stations.reduce((groups, station) => {
    const route = station.ars_id.split('-')[0] || 'unknown';
    if (!groups[route]) groups[route] = [];
    groups[route].push(station);
    return groups;
  }, {} as Record<string, Station[]>);

  const colors = [Color.RED, Color.BLUE, Color.GREEN, Color.ORANGE, Color.PURPLE];
  let colorIndex = 0;

  Object.entries(routeGroups).forEach(([route, routeStations]) => {
    const routeColor = colors[colorIndex % colors.length];
    
    renderStations(routeStations, {
      color: routeColor,
      showLabels: true,
      heightOffset: 25 + (colorIndex * 5) // 노선별 높이 차이
    });

    console.log(`[renderStationsByRoute] 노선 ${route}: ${routeStations.length}개 Station 렌더링`);
    colorIndex++;
  });
}

/**
 * 모든 Station 마커 제거
 */
export function clearAllStations() {
  clearDataSource('station');
}