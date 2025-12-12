/**
 * Building Facilities Search API
 * 시뮬레이션 UUID를 사용하여 취약시설의 주변 건물 정보를 검색합니다.
 */

import { API_PATHS } from '@/utils/api/config';
import type { VulnerableFacilitiesApiResponse, BuildingFacilityData } from '../types';
import type { BuildingFacilitiesResponse } from '@/utils/cesium/nearbyBuildingFacilitiesRenderer';

/**
 * 시뮬레이션 UUID로 취약시설 데이터 가져오기
 * @param uuid - 시뮬레이션 UUID
 * @returns 취약시설 API 응답
 */
export async function fetchVulnerableFacilitiesData(
  uuid: string
): Promise<VulnerableFacilitiesApiResponse> {
  try {
    const response = await fetch(API_PATHS.SIMULATION_VULNERABLE_FACILITIES_BY_UUID(uuid), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Vulnerable facilities fetch failed: ${response.status} ${response.statusText}` +
        (errorData.error ? ` - ${errorData.error}` : '')
      );
    }

    const data: VulnerableFacilitiesApiResponse = await response.json();
    console.log(`[fetchVulnerableFacilitiesData] ${data.total_affected_facilities}개 시설 데이터 로드 완료`);
    console.log(`[fetchVulnerableFacilitiesData] : `, data);

    // 특정 시설 필터링 및 geom_shape 확인
    const allGrades = ['good', 'normal', 'bad', 'very_bad'] as const;
    const targetNames = ['다원어린이집', '성지곡학수경로당'];

    allGrades.forEach(grade => {
      const facilities = data.facilities_by_grade[grade];
      if (facilities) {
        targetNames.forEach(targetName => {
          const target = facilities.find(f => f.name.includes(targetName));
          if (target) {
            console.log(`[fetchVulnerableFacilitiesData] ${targetName} 전체 객체 (${grade}):`, target);
            console.log(`[fetchVulnerableFacilitiesData] ${targetName} 요약:`, {
              id: target.id,
              type: target.type,
              name: target.name,
              hasGeomShape: !!target.geom_shape,
              geomShapeType: target.geom_shape?.type,
              geomShapeCoordinatesLength: target.geom_shape?.coordinates?.length,
              lod1_shape_id: target.lod1_shape_id,
              nearbyBuildingsCount: target.nearby_buildings?.length || 0,
              firstNearbyBuildingId: target.nearby_buildings?.[0]?.lod1_shape_id
            });
          }
        });
      }
    });

    return data;
  } catch (error) {
    console.error('[fetchVulnerableFacilitiesData] 취약시설 데이터 로드 실패:', error);
    throw error;
  }
}

/**
 * facility ID와 type으로 해당 시설의 데이터 찾기
 * @param data - 취약시설 API 응답
 * @param facilityId - 시설 ID (VulnerableFacility의 id와 매칭)
 * @param facilityType - 시설 타입 (senior/childcare)
 * @returns 해당 시설 데이터 또는 undefined
 */
function findFacilityById(
  data: VulnerableFacilitiesApiResponse,
  facilityId: string,
  facilityType: string
): BuildingFacilityData | undefined {
  const numericId = parseInt(facilityId, 10);
  if (isNaN(numericId)) return undefined;

  const allGrades = ['good', 'normal', 'bad', 'very_bad'] as const;

  for (const grade of allGrades) {
    const facilities = data.facilities_by_grade[grade];
    if (facilities) {
      const found = facilities.find(f => f.id === numericId && f.type === facilityType);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * 주변 건물 시설물 검색 (facility ID 기반)
 * @param facilityId - 시설 ID (VulnerableFacility의 id)
 * @param facilityType - 시설 타입 (senior/childcare)
 * @param uuid - 시뮬레이션 UUID
 * @param cachedData - 캐시된 API 데이터 (옵션)
 * @returns 건물 시설물 응답 (nearbyBuildingFacilitiesRenderer 호환 형식)
 */
export async function searchNearbyBuildingFacilities(
  facilityId: string,
  facilityType: string,
  uuid: string,
  cachedData?: VulnerableFacilitiesApiResponse
): Promise<BuildingFacilitiesResponse> {
  try {
    const data = cachedData || await fetchVulnerableFacilitiesData(uuid);
    const facility = findFacilityById(data, facilityId, facilityType);

    if (!facility) {
      console.warn(`[searchNearbyBuildingFacilities] 시설 없음: ID=${facilityId}, type=${facilityType}`);
      const emptyResult: BuildingFacilitiesResponse = {
        type: 'FeatureCollection',
        features: [],
        total: 0
      };
      return emptyResult;
    }

    const features = [];

    // 주 건물 추가
    if (facility.geom_shape && facility.geom_shape.coordinates && facility.geom_shape.coordinates.length > 0) {
      features.push({
        type: 'Feature' as const,
        geometry: facility.geom_shape,
        properties: {
          id: `main_${facility.lod1_shape_id}`,
          lod1_shape_id: facility.lod1_shape_id,
          height: facility.geom_height,
          ground_level: facility.geom_ground_level,
          distance_m: 0
        }
      });
    }

    // 주변 건물 추가
    if (facility.nearby_buildings && facility.nearby_buildings.length > 0) {
      const nearbyBuildingFeatures = facility.nearby_buildings.map(building => ({
        type: 'Feature' as const,
        geometry: building.geom,
        properties: {
          id: building.lod1_shape_id.toString(),
          lod1_shape_id: building.lod1_shape_id,
          height: building.height,
          ground_level: building.ground_level,
          distance_m: building.distance_m
        }
      }));
      features.push(...nearbyBuildingFeatures);

    }

    const result: BuildingFacilitiesResponse = {
      type: 'FeatureCollection',
      features,
      total: features.length
    };

    return result;
  } catch (error) {
    console.error('[searchNearbyBuildingFacilities] 건물 시설물 검색 실패:', error);
    throw error;
  }
}

/**
 * 여러 시설에 대해 주변 건물 검색 (병렬 처리)
 * @param facilities - 시설 정보 배열 { id, type }
 * @param uuid - 시뮬레이션 UUID
 * @returns 건물 시설물 검색 결과 배열
 */
export async function searchNearbyBuildingFacilitiesMultiple(
  facilities: Array<{ id: string; type: string }>,
  uuid: string
): Promise<BuildingFacilitiesResponse[]> {
  try {
    const data = await fetchVulnerableFacilitiesData(uuid);
    const promises = facilities.map(facility =>
      searchNearbyBuildingFacilities(facility.id, facility.type, uuid, data)
    );
    return await Promise.all(promises);
  } catch (error) {
    console.error('[searchNearbyBuildingFacilitiesMultiple] 건물 시설물 일괄 검색 실패:', error);
    throw error;
  }
}
