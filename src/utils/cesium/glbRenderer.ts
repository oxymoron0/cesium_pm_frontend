import { Entity, ModelGraphics, Cartesian3, Color, ColorBlendMode, HeightReference, HeadingPitchRange } from 'cesium'
import { createDataSource, findDataSource, removeDataSource } from './datasources'

export interface BusPosition {
  work_id: string
  sensor_id: string
  vehicle_number: string
  route_name: string
  recorded_at: string
  position: {
    longitude: number
    latitude: number
  }
  sensor_data: {
    humidity: number
    temperature: number
    voc: number
    co2: number
    pm: number
    fpm: number
  }
}

export interface BusTrajectoryData {
  vehicle_number: string
  route_name: string
  positions: BusPosition[]
}

const GLB_MODEL_URL = '/bump-svc3d-front-pm/CesiumMilkTruck.glb'
const DATASOURCE_NAME = 'bus_models'

// 노선별 색상 상수 (성능 최적화)
const ROUTE_COLORS: { [key: string]: Color } = {
  '10': Color.fromCssColorString('#FF0000'),   // 빨간색
  '31': Color.fromCssColorString('#00FF00'),   // 초록색
  '44': Color.fromCssColorString('#0000FF'),   // 파란색
  '167': Color.fromCssColorString('#FFFF00'),  // 노란색
}

const DEFAULT_COLOR = Color.WHITE

/**
 * 한국 시간대로 날짜를 포맷하는 함수
 */
function formatKoreanDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Seoul'
  })
}

/**
 * 버스 설명 HTML 생성 (재사용 가능한 유틸리티)
 */
function createBusDescription(
  vehicleNumber: string,
  routeName: string,
  position: BusPosition,
  longitude: number,
  latitude: number
): string {
  return `
    <div>
      <strong>버스 번호:</strong> ${vehicleNumber}<br/>
      <strong>노선:</strong> ${routeName}<br/>
      <strong>센서 ID:</strong> ${position.sensor_id}<br/>
      <strong>기록 시간:</strong> ${formatKoreanDateTime(position.recorded_at)}<br/>
      <strong>위치:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br/>
      <hr/>
      <strong>센서 데이터:</strong><br/>
      • 온도: ${position.sensor_data.temperature}°C<br/>
      • 습도: ${position.sensor_data.humidity}%<br/>
      • CO2: ${position.sensor_data.co2}ppm<br/>
      • PM: ${position.sensor_data.pm}μg/m³<br/>
      • VOC: ${position.sensor_data.voc}ppb
    </div>
  `
}

/**
 * 버스 GLB 모델을 렌더링하는 함수
 * @param busData - Bus trajectory API에서 받은 데이터
 */
export async function renderBusModels(busData: BusTrajectoryData[]): Promise<void> {
  const viewer = (window as any).cviewer
  if (!viewer) {
    console.error('[renderBusModels] Cesium viewer not available')
    return
  }

  console.log(`[renderBusModels] Rendering ${busData.length} bus models`)

  // 기존 DataSource 제거 후 새로 생성
  removeDataSource(DATASOURCE_NAME)
  const dataSource = createDataSource(DATASOURCE_NAME)

  // 각 버스의 첫 번째 위치에 GLB 모델 배치
  busData.forEach((bus) => {
    if (bus.positions.length === 0) return

    const firstPosition = bus.positions[0]
    const { longitude, latitude } = firstPosition.position

    // 노선별 색상 결정
    const color = ROUTE_COLORS[bus.route_name] || DEFAULT_COLOR

    const entity = new Entity({
      id: `bus_model_${bus.vehicle_number}`,
      name: `Bus ${bus.vehicle_number} (Route ${bus.route_name})`,
      position: Cartesian3.fromDegrees(longitude, latitude, 0),
      model: new ModelGraphics({
        uri: GLB_MODEL_URL,
        scale: 1,
        minimumPixelSize: 32,
        maximumScale: 64,
        color: color, // 정적 색상 (CallbackProperty 제거)
        colorBlendMode: ColorBlendMode.HIGHLIGHT,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      }),
      description: createBusDescription(bus.vehicle_number, bus.route_name, firstPosition, longitude, latitude)
    })

    dataSource.entities.add(entity)
  })

  console.log(`[renderBusModels] Successfully rendered ${dataSource.entities.values.length} bus models`)
}

/**
 * 모든 버스 모델을 제거하는 함수
 */
export function clearBusModels(): void {
  const success = removeDataSource(DATASOURCE_NAME)
  console.log(success ? '[clearBusModels] Bus models cleared' : '[clearBusModels] Bus models DataSource not found')
}

/**
 * 버스 모델 DataSource 가시성 토글
 */
export function toggleBusModels(visible?: boolean): void {
  const dataSource = findDataSource(DATASOURCE_NAME)
  if (dataSource) {
    dataSource.show = visible !== undefined ? visible : !dataSource.show
    console.log(`[toggleBusModels] Bus models ${dataSource.show ? 'shown' : 'hidden'}`)
  } else {
    console.warn('[toggleBusModels] Bus models DataSource not found')
  }
}

/**
 * 버스 모델 수 반환
 */
export function getBusModelCount(): number {
  const dataSource = findDataSource(DATASOURCE_NAME)
  return dataSource ? dataSource.entities.values.length : 0
}


/**
 * 특정 버스 모델에 시선 이동
 */
export function flyToBusModel(vehicleNumber: string): void {
  const viewer = (window as any).cviewer
  if (!viewer) return

  const dataSource = findDataSource(DATASOURCE_NAME)
  if (!dataSource) return

  const entity = dataSource.entities.getById(`bus_model_${vehicleNumber}`)
  if (entity) {
    viewer.flyTo(entity, {
      offset: new HeadingPitchRange(0, -0.5, 200)
    })
  }
}