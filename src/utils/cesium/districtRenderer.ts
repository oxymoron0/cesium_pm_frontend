import { createGeoJsonDataSource, findDataSource, clearDataSource } from './datasources';
import type { GeoJsonDataSource } from 'cesium';
import { Color, ColorMaterialProperty, Entity, PolygonGraphics, PolygonHierarchy, Cartesian3 } from 'cesium';

/**
 * Administrative boundary rendering utility functions
 * Supports all administrative levels: 시도, 시군구, 읍면동, etc.
 */

const ADMINISTRATIVE_BOUNDARY_DATASOURCE_NAME = 'administrative_boundary';

interface AdministrativeGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

/**
 * Render administrative boundary from GeoJSON geometry string
 * @param geometryString - GeoJSON geometry string (parsed from API)
 * @param code - Administrative region code (시도/시군구/읍면동 등)
 */
export async function renderAdministrativeBoundary(geometryString: string, code: string): Promise<void> {
  try {
    console.log('[renderAdministrativeBoundary] Starting render for code:', code);
    console.log('[renderAdministrativeBoundary] Geometry string:', geometryString);

    // Parse GeoJSON geometry string
    const geometry: AdministrativeGeometry = JSON.parse(geometryString);
    console.log('[renderAdministrativeBoundary] Parsed geometry:', geometry);

    // Check/create GeoJsonDataSource
    let dataSource = findDataSource(ADMINISTRATIVE_BOUNDARY_DATASOURCE_NAME) as GeoJsonDataSource;
    if (!dataSource) {
      console.log('[renderAdministrativeBoundary] Creating new DataSource');
      dataSource = await createGeoJsonDataSource(ADMINISTRATIVE_BOUNDARY_DATASOURCE_NAME);
    } else {
      console.log('[renderAdministrativeBoundary] Using existing DataSource');
    }

    // Clear existing entities
    clearDataSource(ADMINISTRATIVE_BOUNDARY_DATASOURCE_NAME);
    console.log('[renderAdministrativeBoundary] Cleared existing entities');

    // Create polygon entity based on geometry type
    if (geometry.type === 'Polygon') {
      console.log('[renderAdministrativeBoundary] Creating Polygon entity');
      const entity = createPolygonEntity(geometry.coordinates as number[][][], code);
      dataSource.entities.add(entity);
      console.log('[renderAdministrativeBoundary] Polygon entity added to DataSource');
    } else if (geometry.type === 'MultiPolygon') {
      console.log('[renderAdministrativeBoundary] Creating MultiPolygon entities');
      // For MultiPolygon, create multiple entities
      const multiPolygonCoords = geometry.coordinates as number[][][][];
      multiPolygonCoords.forEach((polygonCoords, index) => {
        const entity = createPolygonEntity(polygonCoords, `${code}_${index}`);
        dataSource.entities.add(entity);
      });
      console.log(`[renderAdministrativeBoundary] ${multiPolygonCoords.length} MultiPolygon entities added`);
    }

    console.log(`[renderAdministrativeBoundary] Administrative boundary rendered for code: ${code}`);
  } catch (error) {
    console.error('[renderAdministrativeBoundary] Failed to render administrative boundary:', error);
  }
}

/**
 * Create a Polygon entity from coordinates
 * @param coordinates - Polygon coordinates [[[lng, lat], ...]]
 * @param entityId - Entity ID
 */
function createPolygonEntity(coordinates: number[][][], entityId: string): Entity {
  // Extract outer ring (first array in coordinates)
  const outerRing = coordinates[0];
  console.log('[createPolygonEntity] Outer ring coordinates count:', outerRing.length);
  console.log('[createPolygonEntity] First coordinate:', outerRing[0]);
  console.log('[createPolygonEntity] Last coordinate:', outerRing[outerRing.length - 1]);

  // Convert to Cartesian3 positions
  const positions = outerRing.map(coord =>
    Cartesian3.fromDegrees(coord[0], coord[1])
  );
  console.log('[createPolygonEntity] Created Cartesian3 positions count:', positions.length);

  const borderColor = Color.fromCssColorString('#0BE300');

  const entity = new Entity({
    id: `administrative_boundary_${entityId}`,
    name: `Administrative Boundary ${entityId}`,
    polygon: new PolygonGraphics({
      hierarchy: new PolygonHierarchy(positions),
      material: new ColorMaterialProperty(borderColor.withAlpha(0.2)),
      outline: true,
      outlineColor: borderColor,
      outlineWidth: 3,
      height: 0,
      fill: true,
      heightReference: 1 // CLAMP_TO_GROUND
    })
  });

  console.log('[createPolygonEntity] Entity created:', entity.id);
  return entity;
}

/**
 * Clear administrative boundary
 */
export function clearAdministrativeBoundary(): void {
  try {
    clearDataSource(ADMINISTRATIVE_BOUNDARY_DATASOURCE_NAME);
    console.log('[clearAdministrativeBoundary] Administrative boundary cleared');
  } catch (error) {
    console.error('[clearAdministrativeBoundary] Failed to clear administrative boundary:', error);
  }
}
