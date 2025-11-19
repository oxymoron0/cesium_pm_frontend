import type { GeoJSONMultiPolygon } from '@/types/postgis';
import { createDataSource, findDataSource, clearDataSource } from './datasources';
import { HeightReference, Color, ColorMaterialProperty, Cartesian3, Entity, PolygonGraphics, PolygonHierarchy, LabelGraphics, VerticalOrigin, HorizontalOrigin, CallbackProperty, ScreenSpaceEventHandler, ScreenSpaceEventType, defined, Viewer, Cartesian2 } from 'cesium';
import { administrativeStore } from '@/stores/AdministrativeStore';

/**
 * Administrative boundary rendering utility functions
 */

const ADMINISTRATIVE_DATASOURCE_NAME = 'administrative_boundary';

/**
 * Calculate center point of MultiPolygon geometry
 * @param geometry - GeoJSON MultiPolygon
 * @returns Center point [longitude, latitude]
 */
function calculateMultiPolygonCenter(geometry: GeoJSONMultiPolygon): [number, number] {
  let totalLng = 0;
  let totalLat = 0;
  let totalPoints = 0;

  geometry.coordinates.forEach(polygon => {
    // Use outer ring (polygon[0]) for center calculation
    polygon[0].forEach(coord => {
      totalLng += coord[0];
      totalLat += coord[1];
      totalPoints++;
    });
  });

  return [totalLng / totalPoints, totalLat / totalPoints];
}

/**
 * Move camera to administrative boundary
 * @param geometry - GeoJSON MultiPolygon
 * @param duration - Animation duration in seconds (default: 1.5)
 */
function flyToBoundary(geometry: GeoJSONMultiPolygon, duration: number = 0): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer || !viewer.camera) {
      console.warn('[flyToBoundary] Cesium viewer or camera not available');
      return;
    }

    const [longitude, latitude] = calculateMultiPolygonCenter(geometry);
    const destination = Cartesian3.fromDegrees(longitude, latitude, 5000); // 5km height

    viewer.camera.flyTo({
      destination: destination,
      duration: duration,
      complete: () => {
        console.log(`[flyToBoundary] Camera moved to (${longitude}, ${latitude})`);
      }
    });
  } catch (error) {
    console.error('[flyToBoundary] Failed to move camera:', error);
  }
}

/**
 * Render administrative boundary on Cesium viewer
 *
 * @param geometry - GeoJSON MultiPolygon geometry
 * @param fullName - Full name of administrative division
 */
export async function renderAdministrativeBoundary(
  geometry: GeoJSONMultiPolygon,
  fullName: string
): Promise<void> {
  try {
    console.log('[administrativeRenderer] Rendering boundary:', fullName, geometry);

    // Clear existing boundary
    clearAdministrativeBoundary();

    // Check/create DataSource
    let dataSource = findDataSource(ADMINISTRATIVE_DATASOURCE_NAME);
    if (!dataSource) {
      dataSource = createDataSource(ADMINISTRATIVE_DATASOURCE_NAME);
    }

    // Render each polygon in MultiPolygon
    geometry.coordinates.forEach((polygon, index) => {
      // polygon[0] is the outer ring (exterior boundary)
      const outerRing = polygon[0];

      // Convert coordinates to Cartesian3 array
      const positions = outerRing.map(coord =>
        Cartesian3.fromDegrees(coord[0], coord[1])
      );

      // Create polygon entity
      const entity = new Entity({
        id: `${ADMINISTRATIVE_DATASOURCE_NAME}_${index}`,
        name: `${fullName} - Polygon ${index + 1}`,
        polygon: new PolygonGraphics({
          hierarchy: new PolygonHierarchy(positions),
          material: Color.fromCssColorString('#0BE300').withAlpha(0.2),
          heightReference: HeightReference.CLAMP_TO_GROUND,
        }),
        polyline: {
          clampToGround: true,
          positions: positions,
          width: 5,
          material: Color.fromCssColorString('#0BE300').withAlpha(0.8),
        },
      });

      dataSource.entities.add(entity);
    });

    console.log(`[administrativeRenderer] Rendered ${geometry.coordinates.length} polygons for ${fullName}`);

    // Move camera to boundary
    flyToBoundary(geometry);
  } catch (error) {
    console.error('[administrativeRenderer] Failed to render boundary:', error);
  }
}

/**
 * Clear administrative boundary from Cesium viewer
 */
export function clearAdministrativeBoundary(): void {
  console.log('[administrativeRenderer] Clearing boundary');
  clearDataSource(ADMINISTRATIVE_DATASOURCE_NAME);
}

/**
 * Check if administrative boundary is currently rendered
 */
export function isAdministrativeBoundaryRendered(): boolean {
  const dataSource = findDataSource(ADMINISTRATIVE_DATASOURCE_NAME);
  return dataSource ? dataSource.entities.values.length > 0 : false;
}

/**
 * Render multiple administrative boundaries with labels
 *
 * @param boundaries - Array of { geometry, fullName, neighborhoodCode }
 */
export async function renderMultipleAdministrativeBoundaries(
  boundaries: Array<{ geometry: GeoJSONMultiPolygon; fullName: string; neighborhoodCode: string }>
): Promise<void> {
  try {
    console.log('[administrativeRenderer] Rendering multiple boundaries:', boundaries.length);

    // Clear existing boundaries
    clearAdministrativeBoundary();

    // Check/create DataSource
    let dataSource = findDataSource(ADMINISTRATIVE_DATASOURCE_NAME);
    if (!dataSource) {
      dataSource = createDataSource(ADMINISTRATIVE_DATASOURCE_NAME);
    }

    // Render each boundary
    boundaries.forEach((boundary) => {
      const { geometry, fullName, neighborhoodCode } = boundary;

      // Calculate center for label
      const center = calculateMultiPolygonCenter(geometry);

      // Render polygons
      geometry.coordinates.forEach((polygon, index) => {
        const outerRing = polygon[0];
        const positions = outerRing.map(coord =>
          Cartesian3.fromDegrees(coord[0], coord[1])
        );
        const entity = new Entity({
          id: `${ADMINISTRATIVE_DATASOURCE_NAME}_${neighborhoodCode}_${index}`,
          name: `${fullName} - Polygon ${index + 1}`,
          polygon: new PolygonGraphics({
            hierarchy: new PolygonHierarchy(positions),
            material: new ColorMaterialProperty(new CallbackProperty(() => {
              const isSelected = administrativeStore.selectedNeighborhoodCode === neighborhoodCode;
              return isSelected
                ? Color.fromCssColorString('#FFFFFF').withAlpha(0.8)
                : Color.fromCssColorString('#0BE300').withAlpha(0.2);
            }, false)),
            heightReference: HeightReference.CLAMP_TO_GROUND,
          }),
          polyline: {
            clampToGround: true,
            positions: positions,
            width: 3,
            material:  new ColorMaterialProperty(new CallbackProperty(() => {
              const isSelected = administrativeStore.selectedNeighborhoodCode === neighborhoodCode;
              return isSelected
                ? Color.fromCssColorString('#FFFFFF').withAlpha(0.8)
                : Color.fromCssColorString('#0BE300').withAlpha(0.2);
            }, false)),
          },
        });

        dataSource.entities.add(entity);
      });

      // Add label at center
      const labelEntity = new Entity({
        id: `${ADMINISTRATIVE_DATASOURCE_NAME}_label_${neighborhoodCode}`,
        name: `${fullName} - Label`,
        position: Cartesian3.fromDegrees(center[0], center[1], 50),
        label: new LabelGraphics({
          text: fullName,
          font: 'bold 22px Pretendard, sans-serif',
          fillColor: new CallbackProperty(() => {
            const isSelected = administrativeStore.selectedNeighborhoodCode === neighborhoodCode;
            return isSelected ? Color.BLACK : Color.WHITE;
          }, false),
          outlineColor: new CallbackProperty(() => {
            const isSelected = administrativeStore.selectedNeighborhoodCode === neighborhoodCode;
            return isSelected ? Color.WHITE : Color.BLACK;
          }, false),
          outlineWidth: 5,
          style: 0, // FILL_AND_OUTLINE
          verticalOrigin: VerticalOrigin.CENTER,
          horizontalOrigin: HorizontalOrigin.CENTER,
          pixelOffset: new Cartesian3(0, 0, 0),
          heightReference: 0, // NONE - absolute height
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        })
      });

      dataSource.entities.add(labelEntity);
    });

    console.log(`[administrativeRenderer] Rendered ${boundaries.length} boundaries with labels`);
  } catch (error) {
    console.error('[administrativeRenderer] Failed to render multiple boundaries:', error);
  }
}

/**
 * Global click event handler for administrative boundaries
 */
let administrativeBoundaryClickHandler: ScreenSpaceEventHandler | null = null;

/**
 * Setup click event handler for administrative boundary selection
 */
export function setupAdministrativeBoundaryClickHandler(): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.warn('[administrativeRenderer] Cesium viewer not available');
      return;
    }

    // Remove existing handler if present
    removeAdministrativeBoundaryClickHandler();

    // Create new handler
    administrativeBoundaryClickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    // Register LEFT_CLICK event
    administrativeBoundaryClickHandler.setInputAction((movement: { position: Cartesian2 }) => {
      const pickedObject = viewer.scene.pick(movement.position);

      if (defined(pickedObject) && defined(pickedObject.id)) {
        const entity = pickedObject.id as Entity;
        const entityId = entity.id;

        // Check if clicked entity is an administrative boundary
        if (entityId.startsWith(ADMINISTRATIVE_DATASOURCE_NAME)) {
          // Extract neighborhoodCode from entity ID
          // ID patterns:
          // - administrative_boundary_{neighborhoodCode}_{polygonIndex}
          // - administrative_boundary_label_{neighborhoodCode}
          let neighborhoodCode: string | null = null;

          if (entityId.startsWith(`${ADMINISTRATIVE_DATASOURCE_NAME}_label_`)) {
            // Label entity
            neighborhoodCode = entityId.replace(`${ADMINISTRATIVE_DATASOURCE_NAME}_label_`, '');
          } else {
            // Polygon entity
            const parts = entityId.split('_');
            if (parts.length >= 3) {
              // Remove 'administrative', 'boundary', and the last polygon index
              neighborhoodCode = parts.slice(2, -1).join('_');
            }
          }

          if (neighborhoodCode) {
            // Toggle selection
            if (administrativeStore.selectedNeighborhoodCode === neighborhoodCode) {
              console.log('[administrativeRenderer] Deselecting neighborhood:', neighborhoodCode);
              administrativeStore.selectedNeighborhoodCode = null;
            } else {
              console.log('[administrativeRenderer] Selecting neighborhood:', neighborhoodCode);
              administrativeStore.selectedNeighborhoodCode = neighborhoodCode;
            }
          }
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    console.log('[administrativeRenderer] Click handler registered');
  } catch (error) {
    console.error('[administrativeRenderer] Failed to setup click handler:', error);
  }
}

/**
 * Remove click event handler for administrative boundaries
 */
export function removeAdministrativeBoundaryClickHandler(): void {
  if (administrativeBoundaryClickHandler) {
    administrativeBoundaryClickHandler.destroy();
    administrativeBoundaryClickHandler = null;
    console.log('[administrativeRenderer] Click handler removed');
  }
}
