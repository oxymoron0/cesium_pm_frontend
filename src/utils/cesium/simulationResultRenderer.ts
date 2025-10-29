import { Cartesian3, Entity, BillboardGraphics, HeightReference, ConstantProperty, Color, Cartographic, sampleTerrainMostDetailed } from 'cesium';
import { createGeoJsonDataSource, findDataSource } from './datasources';
import type { StationRow } from '@/pages/Simulation/components/SimulationQuickResult';

const DATASOURCE_NAME = 'simulation_result_stations';
const terrainHeightCache = new Map<string, number>();

// 시뮬레이션 정류장 선택 상태 전역 관리 (searchStationRenderer.ts 패턴)
let currentSelectedStationId: string | null = null;

/**
 * 현재 선택된 시뮬레이션 정류장 ID 조회
 */
export function getSelectedSimulationStationId(): string | null {
  return currentSelectedStationId;
}

/**
 * 시뮬레이션 정류장 선택 상태 업데이트
 */
export function setSelectedSimulationStationId(stationId: string | null): void {
  currentSelectedStationId = stationId;
}

function getCachedTerrainHeight(longitude: number, latitude: number): number {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`;
  return terrainHeightCache.get(key) || 0;
}

async function sampleTerrainForSimulationStations(rows: StationRow[]): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: { terrainProvider: any } }).cviewer;
    if (!viewer?.terrainProvider || rows.length === 0) return;

    const positions = rows.map(row => Cartographic.fromDegrees(row.point[0], row.point[1]));
    const sampledPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions);

    sampledPositions.forEach((position, index) => {
      const [lng, lat] = rows[index].point;
      const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
      terrainHeightCache.set(key, position.height || 0);
    });
  } catch (error) {
    console.error('[sampleTerrainForSimulationStations] Failed:', error);
  }
}

export async function renderSimulationResultStations(rows: StationRow[]): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as any).cviewer;
    if (!viewer) return;

    await sampleTerrainForSimulationStations(rows);

    let dataSource = findDataSource(DATASOURCE_NAME);
    if (!dataSource) {
      dataSource = await createGeoJsonDataSource(DATASOURCE_NAME);
    }

    dataSource.entities.removeAll();

    const basePath = import.meta.env.VITE_BASE_PATH || '/';

    rows.forEach((row) => {
      const [lng, lat] = row.point;
      const cachedHeight = getCachedTerrainHeight(lng, lat);
      const position = Cartesian3.fromDegrees(lng, lat, cachedHeight);
      const stationId = String(row.id).padStart(2, '0');

      const entity = new Entity({
        id: `station_${row.id}`,
        name: stationId,
        position: position,
        billboard: new BillboardGraphics({
          image: new ConstantProperty(`${basePath}icon/station_active.svg`),
          sizeInMeters: new ConstantProperty(false),
          width: new ConstantProperty(30),
          height: new ConstantProperty(30),
          heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
          disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
          verticalOrigin: new ConstantProperty(1),
          color: new ConstantProperty(Color.WHITE)
        }),
        description: new ConstantProperty(
          `<div style="font-family: Pretendard;">` +
          `<h3>${row.name}</h3>` +
          `<p><strong>측정시간:</strong> ${row.time}</p>` +
          `<p><strong>PM10:</strong> ${row.pm10}</p>` +
          `</div>`
        ),
        properties: {
          stationId: row.id,
          stationName: row.name,
          time: row.time,
          pm10: row.pm10,
          isSimulationResult: true
        }
      });

      dataSource.entities.add(entity);
    });

    dataSource.show = true;
  } catch (error) {
    console.error('[simulationResultRenderer] Rendering failed:', error);
  }
}

export function clearSimulationResultStations(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as any).cviewer;
    if (!viewer) return;

    const dataSource = findDataSource(DATASOURCE_NAME);
    if (dataSource) {
      viewer.dataSources.remove(dataSource);
    }

    terrainHeightCache.clear();
  } catch (error) {
    console.error('[simulationResultRenderer] Clear failed:', error);
  }
}
