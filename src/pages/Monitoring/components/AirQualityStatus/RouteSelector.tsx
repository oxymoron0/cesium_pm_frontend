import { observer } from 'mobx-react-lite'
import { useState } from 'react'

interface RouteItem {
  routeName: string
  label: string
  origin: string
  destination: string
}

const routes: RouteItem[] = [
  { routeName: '10', label: '10번 버스', origin: '해운대해수욕장', destination: '송정해수욕장' },
  { routeName: '31', label: '31번 버스', origin: '부산역', destination: '해운대' },
  { routeName: '44', label: '44번 버스', origin: '서면', destination: '광안리' },
  { routeName: '167', label: '167번 버스', origin: '남포동', destination: '태종대' }
]

const RouteSelector = observer(function RouteSelector() {
  const [selectedRoute, setSelectedRoute] = useState<string>('10')

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
          key={route.routeName}
          onClick={() => setSelectedRoute(route.routeName)}
          className="flex flex-col items-start gap-1 self-stretch text-left transition-colors"
          style={{
            borderRadius: '8px',
            border: selectedRoute === route.routeName
              ? '1px solid #FFD040'
              : '1px solid #C4C6C6',
            background: selectedRoute === route.routeName
              ? 'rgba(255, 208, 64, 0.30)'
              : '#000',
            padding: '16px 20px'
          }}
        >
          <div
            style={{
              color: selectedRoute === route.routeName ? '#FFD040' : '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            {route.label}
          </div>
          {selectedRoute === route.routeName && (
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
    </div>
  )
})

export default RouteSelector