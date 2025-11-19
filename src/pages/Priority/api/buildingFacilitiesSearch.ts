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
  console.log(`[fetchVulnerableFacilitiesData] Fetching data for UUID: ${uuid}`);

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
    console.log(`[fetchVulnerableFacilitiesData] Total affected facilities: ${data.total_affected_facilities}`);

    return data;
  } catch (error) {
    console.error('[fetchVulnerableFacilitiesData] Failed to fetch vulnerable facilities:', error);
    throw error;
  }
}

/**
 * facility ID로 해당 시설의 데이터 찾기
 * @param data - 취약시설 API 응답
 * @param facilityId - 시설 ID (VulnerableFacility의 id와 매칭)
 * @returns 해당 시설 데이터 또는 undefined
 */
function findFacilityById(
  data: VulnerableFacilitiesApiResponse,
  facilityId: string
): BuildingFacilityData | undefined {
  const numericId = parseInt(facilityId, 10);
  if (isNaN(numericId)) {
    console.warn(`[findFacilityById] Invalid facility ID: ${facilityId}`);
    return undefined;
  }

  // 모든 등급에서 시설 검색
  const allGrades = ['good', 'normal', 'bad', 'very_bad'] as const;

  for (const grade of allGrades) {
    const facilities = data.facilities_by_grade[grade];
    if (facilities) {
      const found = facilities.find(f => f.id === numericId);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

/**
 * 주변 건물 시설물 검색 (facility ID 기반)
 * @param facilityId - 시설 ID (VulnerableFacility의 id)
 * @param uuid - 시뮬레이션 UUID
 * @param cachedData - 캐시된 API 데이터 (옵션)
 * @returns 건물 시설물 응답 (nearbyBuildingFacilitiesRenderer 호환 형식)
 */
export async function searchNearbyBuildingFacilities(
  facilityId: string,
  uuid: string,
  cachedData?: VulnerableFacilitiesApiResponse
): Promise<BuildingFacilitiesResponse> {
  console.log(`[searchNearbyBuildingFacilities] Searching for facility ID: ${facilityId}, UUID: ${uuid}`);

  try {
    // 캐시된 데이터가 없으면 API 호출
    const data = cachedData || await fetchVulnerableFacilitiesData(uuid);

    // facility ID로 시설 찾기
    const facility = findFacilityById(data, facilityId);

    if (!facility) {
      console.warn(`[searchNearbyBuildingFacilities] Facility not found: ${facilityId}`);
      console.warn(`[searchNearbyBuildingFacilities] Available facilities:`, {
        good: data.facilities_by_grade.good?.map(f => f.id) || [],
        normal: data.facilities_by_grade.normal?.map(f => f.id) || [],
        bad: data.facilities_by_grade.bad?.map(f => f.id) || [],
        very_bad: data.facilities_by_grade.very_bad?.map(f => f.id) || []
      });
      return {
        type: 'FeatureCollection',
        features: [],
        total: 0
      };
    }

    console.log(`[searchNearbyBuildingFacilities] Facility found:`, {
      id: facility.id,
      name: facility.name,
      hasGeomShape: !!facility.geom_shape,
      geomShapeType: facility.geom_shape?.type,
      geomShapeCoordinatesLength: facility.geom_shape?.coordinates?.length,
      nearbyBuildingsCount: facility.nearby_buildings?.length || 0,
      lod1_shape_id: facility.lod1_shape_id,
      geom_height: facility.geom_height,
      geom_ground_level: facility.geom_ground_level
    });

    // BuildingFacilitiesResponse 형식으로 변환 (MultiPolygon 그대로 사용)
    const features = [];

    // 1.  에만 추가
    if (facility.geom_shape && facility.geom_shape.coordinates && facility.geom_shape.coordinates.length > 0) {
      const mainBuildingFeature = {
        type: 'Feature' as const,
        geometry: facility.geom_shape,
        properties: {
          id: `main_${facility.lod1_shape_id}`,
          lod1_shape_id: facility.lod1_shape_id,
          height: facility.geom_height,
          ground_level: facility.geom_ground_level,
          distance_m: 0 // 주 건물이므로 거리 0
        }
      };
      features.push(mainBuildingFeature);
      console.log(`[searchNearbyBuildingFacilities] Added main building for facility ${facilityId}`);
    } else {
      console.warn(`[searchNearbyBuildingFacilities] No geom_shape for facility ${facilityId}`);
    }

    // 2. 주변 건물들
    if (facility.nearby_buildings && facility.nearby_buildings.length > 0) {
      const nearbyBuildingFeatures = facility.nearby_buildings.map(building => {
        return {
          type: 'Feature' as const,
          geometry: building.geom,
          properties: {
            id: building.lod1_shape_id.toString(),
            lod1_shape_id: building.lod1_shape_id,
            height: building.height,
            ground_level: building.ground_level,
            distance_m: building.distance_m
          }
        };
      });
      features.push(...nearbyBuildingFeatures);
      console.log(`[searchNearbyBuildingFacilities] Added ${nearbyBuildingFeatures.length} nearby buildings for facility ${facilityId}`);
    } else {
      console.warn(`[searchNearbyBuildingFacilities] No nearby_buildings for facility ${facilityId}`);
    }

    const response: BuildingFacilitiesResponse = {
      type: 'FeatureCollection',
      features,
      total: features.length
    };

    console.log(`[searchNearbyBuildingFacilities] Found ${response.total} nearby buildings for facility ${facilityId}`);

    return response;
  } catch (error) {
    console.error('[searchNearbyBuildingFacilities] Failed to search building facilities:', error);
    throw error;
  }
}

/**
 * 여러 시설에 대해 주변 건물 검색 (병렬 처리)
 * @param facilityIds - 시설 ID 배열
 * @param uuid - 시뮬레이션 UUID
 * @returns 건물 시설물 검색 결과 배열
 */
export async function searchNearbyBuildingFacilitiesMultiple(
  facilityIds: string[],
  uuid: string
): Promise<BuildingFacilitiesResponse[]> {
  console.log(`[searchNearbyBuildingFacilitiesMultiple] Searching for ${facilityIds.length} facilities, UUID: ${uuid}`);

  try {
    // 한 번만 API 호출하여 데이터 가져오기
    const data = await fetchVulnerableFacilitiesData(uuid);

    // 각 facility ID에 대해 검색 (캐시된 데이터 사용)
    const promises = facilityIds.map(facilityId =>
      searchNearbyBuildingFacilities(facilityId, uuid, data)
    );

    const results = await Promise.all(promises);
    console.log(`[searchNearbyBuildingFacilitiesMultiple] Completed ${results.length} searches`);
    return results;
  } catch (error) {
    console.error('[searchNearbyBuildingFacilitiesMultiple] Failed to search building facilities:', error);
    throw error;
  }
}
