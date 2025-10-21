/**
 * API 유틸리티 통합 익스포트
 * 모든 API 관련 함수와 설정을 한 곳에서 import 할 수 있습니다.
 */

export * from './request';
export * from './config';
export * from './types';
export * from './routeApi';
export * from './busApi';
export * from './simulationApi';
export * from './regionApi';

// 사용 예시:
// import { get, post, getApiPath, API_PATHS, getRouteInfo, getRouteGeometry, submitSimulation } from '@/utils/api';