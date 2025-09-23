import { observer } from 'mobx-react-lite'
import { useState } from 'react'

interface RouteItem {
  routeName: string
  label: string
}

const routes: RouteItem[] = [
  { routeName: '10', label: '10번버스' },
  { routeName: '31', label: '31번버스' },
  { routeName: '44', label: '44번버스' },
  { routeName: '167', label: '167번버스' }
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
          className={`
            px-4 py-3 text-left rounded-lg transition-colors
            ${selectedRoute === route.routeName
              ? 'bg-yellow-400 text-black font-medium'
              : 'bg-black bg-opacity-80 text-white hover:bg-opacity-60'
            }
          `}
        >
          {route.label}
        </button>
      ))}
    </div>
  )
})

export default RouteSelector