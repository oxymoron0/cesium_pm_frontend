import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { routeStore } from '../../../../stores/RouteStore'

interface RouteItem {
  route_name: string
  origin: string
  destination: string
}

interface RouteSelectorProps {
  onRouteSelect?: (routeName: string) => void
}

const RouteSelector = observer(function RouteSelector({ onRouteSelect }: RouteSelectorProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [routes, setRoutes] = useState<RouteItem[]>([])

  useEffect(() => {
    // Initialize route data if not loaded
    if (routeStore.routeInfoList.length === 0) {
      routeStore.initializeRouteData()
    }
  }, [])

  useEffect(() => {
    // Update local routes when RouteStore data changes
    if (routeStore.routeInfoList.length > 0) {
      setRoutes(routeStore.routeInfoList)
    }
  }, [routeStore.routeInfoList])

  const handleRouteSelect = (routeName: string) => {
    setSelectedRoute(routeName)
    onRouteSelect?.(routeName)
  }

  return (
    <div
      className="flex flex-col self-stretch"
      style={{
        width: '308px',
        padding: '12px 0',
        gap: '10px'
      }}
    >
      {routes.map((route) => (
        <button
          key={route.route_name}
          onClick={() => handleRouteSelect(route.route_name)}
          className="flex flex-col items-start gap-1 self-stretch text-left transition-colors"
          style={{
            borderRadius: '8px',
            border: selectedRoute === route.route_name
              ? '1px solid #FFD040'
              : '1px solid #C4C6C6',
            background: selectedRoute === route.route_name
              ? 'rgba(255, 208, 64, 0.30)'
              : '#000',
            padding: '16px 20px'
          }}
        >
          <div
            style={{
              color: selectedRoute === route.route_name ? '#FFD040' : '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            {route.route_name}번 버스
          </div>
          {selectedRoute === route.route_name && (
            <div
              style={{
                color: '#FFD040',
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: 'normal',
                fontVariantNumeric: 'lining-nums tabular-nums'
              }}
            >
              {route.origin} ↔ {route.destination}
            </div>
          )}
        </button>
      ))}

      {/* UI Version Toggle */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="mb-3">
          <span className="text-sm text-gray-400 font-medium">UI 버전</span>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => routeStore.setUIVersion('v1')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              routeStore.isV1
                ? 'bg-yellow-400 text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            V1
          </button>
          <button
            onClick={() => routeStore.setUIVersion('v2')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              routeStore.isV2
                ? 'bg-yellow-400 text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            V2
          </button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500">
            {routeStore.isV1 ? '기본 UI' : '개선된 UI'}
          </span>
        </div>
      </div>
    </div>
  )
})

export default RouteSelector