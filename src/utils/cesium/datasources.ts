import { CustomDataSource, Entity, GeoJsonDataSource } from 'cesium';

/**
 * DataSource 관리 유틸리티 함수들
 */

/**
 * 새로운 DataSource를 생성하는 함수 (중복 name 체크 포함)
 * @param name - DataSource 이름
 * @returns CustomDataSource 인스턴스
 * @throws 이미 존재하는 name이면 에러 발생
 */
export function createDataSource(name: string): CustomDataSource {
  const viewer = (window as any).cviewer;
  
  if (!viewer) {
    throw new Error('[createDataSource] window.cviewer가 준비되지 않았습니다.');
  }

  // 기존 DataSource 검색
  const existingDataSources = viewer.dataSources.getByName(name);
  
  if (existingDataSources.length > 0) {
    throw new Error(`[createDataSource] 이미 존재하는 DataSource name: ${name}`);
  }

  // 새 DataSource 생성
  const dataSource = new CustomDataSource(name);
  viewer.dataSources.add(dataSource);
  
  console.log(`[createDataSource] 새 DataSource 생성: ${name}`);
  return dataSource;
}

/**
 * DataSource를 이름으로 검색하는 함수
 * @param name - DataSource 이름
 * @returns CustomDataSource 또는 undefined
 */
export function findDataSource(name: string): CustomDataSource | undefined {
  const viewer = (window as any).cviewer;
  
  if (!viewer) {
    console.warn('[findDataSource] window.cviewer가 준비되지 않았습니다.');
    return undefined;
  }

  const existingDataSources = viewer.dataSources.getByName(name);
  return existingDataSources.length > 0 ? existingDataSources[0] : undefined;
}

/**
 * DataSource를 제거하는 함수
 * @param name - 제거할 DataSource 이름
 * @returns 제거 성공 여부
 */
export function removeDataSource(name: string): boolean {
  const viewer = (window as any).cviewer;
  
  if (!viewer) {
    console.warn('[removeDataSource] window.cviewer가 준비되지 않았습니다.');
    return false;
  }

  const existingDataSources = viewer.dataSources.getByName(name);
  
  if (existingDataSources.length > 0) {
    viewer.dataSources.remove(existingDataSources[0]);
    console.log(`[removeDataSource] DataSource 제거: ${name}`);
    return true;
  }
  
  console.warn(`[removeDataSource] DataSource를 찾을 수 없습니다: ${name}`);
  return false;
}

/**
 * DataSource의 모든 entities를 제거하는 함수
 * @param name - 정리할 DataSource 이름
 */
export function clearDataSource(name: string): void {
  const dataSource = findDataSource(name);
  
  if (dataSource) {
    dataSource.entities.removeAll();
    console.log(`[clearDataSource] DataSource entities 정리: ${name}`);
  } else {
    console.warn(`[clearDataSource] DataSource를 찾을 수 없습니다: ${name}`);
  }
}

/**
 * DataSource 표시/숨김 토글
 * @param name - DataSource 이름
 * @param show - 표시 여부
 */
export function toggleDataSource(name: string, show: boolean): void {
  const dataSource = findDataSource(name);
  
  if (dataSource) {
    dataSource.show = show;
    console.log(`[toggleDataSource] DataSource ${show ? '표시' : '숨김'}: ${name}`);
  } else {
    console.warn(`[toggleDataSource] DataSource를 찾을 수 없습니다: ${name}`);
  }
}

/**
 * 새로운 GeoJsonDataSource를 생성하는 함수 (중복 name 체크 포함)
 * @param name - DataSource 이름
 * @returns GeoJsonDataSource 인스턴스
 * @throws 이미 존재하는 name이면 에러 발생
 */
export function createGeoJsonDataSource(name: string): GeoJsonDataSource {
  const viewer = (window as any).cviewer;

  if (!viewer) {
    throw new Error('[createGeoJsonDataSource] window.cviewer가 준비되지 않았습니다.');
  }

  // 기존 DataSource 검색
  const existingDataSources = viewer.dataSources.getByName(name);

  if (existingDataSources.length > 0) {
    throw new Error(`[createGeoJsonDataSource] 이미 존재하는 DataSource name: ${name}`);
  }

  // 새 GeoJsonDataSource 생성
  const dataSource = new GeoJsonDataSource(name);
  viewer.dataSources.add(dataSource);
  
  console.log(`[createGeoJsonDataSource] 새 GeoJsonDataSource 생성: ${name}`);
  return dataSource;
}

/**
 * 모든 DataSource 목록 반환
 * @returns DataSource 이름 배열
 */
export function listDataSources(): string[] {
  const viewer = (window as any).cviewer;
  
  if (!viewer) {
    console.warn('[listDataSources] window.cviewer가 준비되지 않았습니다.');
    return [];
  }

  const names: string[] = [];
  for (let i = 0; i < viewer.dataSources.length; i++) {
    const dataSource = viewer.dataSources.get(i);
    names.push(dataSource.name);
  }
  
  return names;
}
