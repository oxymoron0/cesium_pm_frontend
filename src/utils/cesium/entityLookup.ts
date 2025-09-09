import { Entity } from 'cesium';
import { findDataSource } from './datasources';

/**
 * Entity 조회 유틸리티 함수들
 */

/**
 * DataSource에서 ID로 Entity를 조회하는 함수
 * @param dataSourceName - DataSource 이름
 * @param entityId - Entity ID
 * @returns Entity 또는 undefined
 */
export function findEntity(dataSourceName: string, entityId: string): Entity | undefined {
  const dataSource = findDataSource(dataSourceName);
  
  if (!dataSource) {
    console.warn(`[findEntity] DataSource를 찾을 수 없습니다: ${dataSourceName}`);
    return undefined;
  }
  
  const entity = dataSource.entities.getById(entityId);
  return entity || undefined;
}

/**
 * DataSource 내 모든 Entity를 조회하는 함수
 * @param dataSourceName - DataSource 이름
 * @returns Entity 배열
 */
export function getAllEntities(dataSourceName: string): Entity[] {
  const dataSource = findDataSource(dataSourceName);
  
  if (!dataSource) {
    console.warn(`[getAllEntities] DataSource를 찾을 수 없습니다: ${dataSourceName}`);
    return [];
  }
  
  return dataSource.entities.values;
}

/**
 * DataSource에서 패턴으로 Entity들을 조회하는 함수
 * @param dataSourceName - DataSource 이름
 * @param pattern - ID 패턴 (RegExp)
 * @returns 패턴에 매칭되는 Entity 배열
 */
export function findEntitiesByPattern(dataSourceName: string, pattern: RegExp): Entity[] {
  const dataSource = findDataSource(dataSourceName);
  
  if (!dataSource) {
    console.warn(`[findEntitiesByPattern] DataSource를 찾을 수 없습니다: ${dataSourceName}`);
    return [];
  }
  
  return dataSource.entities.values.filter(entity => pattern.test(entity.id));
}

/**
 * DataSource에서 name으로 Entity들을 조회하는 함수
 * @param dataSourceName - DataSource 이름
 * @param entityName - Entity name
 * @returns name에 매칭되는 Entity 배열
 */
export function findEntitiesByName(dataSourceName: string, entityName: string): Entity[] {
  const dataSource = findDataSource(dataSourceName);
  
  if (!dataSource) {
    console.warn(`[findEntitiesByName] DataSource를 찾을 수 없습니다: ${dataSourceName}`);
    return [];
  }
  
  return dataSource.entities.values.filter(entity => entity.name === entityName);
}

/**
 * DataSource의 Entity 개수를 반환하는 함수
 * @param dataSourceName - DataSource 이름
 * @returns Entity 개수
 */
export function getEntityCount(dataSourceName: string): number {
  const dataSource = findDataSource(dataSourceName);
  
  if (!dataSource) {
    console.warn(`[getEntityCount] DataSource를 찾을 수 없습니다: ${dataSourceName}`);
    return 0;
  }
  
  return dataSource.entities.values.length;
}

/**
 * DataSource의 모든 Entity ID 목록을 반환하는 함수
 * @param dataSourceName - DataSource 이름
 * @returns Entity ID 배열
 */
export function getEntityIds(dataSourceName: string): string[] {
  const dataSource = findDataSource(dataSourceName);
  
  if (!dataSource) {
    console.warn(`[getEntityIds] DataSource를 찾을 수 없습니다: ${dataSourceName}`);
    return [];
  }
  
  return dataSource.entities.values.map(entity => entity.id);
}