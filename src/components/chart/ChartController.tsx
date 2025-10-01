import { observer } from 'mobx-react-lite'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'
import Icon from '@/components/basic/Icon'

/**
 * ChartController Component
 *
 * Conditional rendering based on selected sensor type
 * - Renders when PM sensors are selected
 * - Hidden when VOCs is selected
 *
 * Purpose: Color map selector for PM10/PM25 visualization
 */
const ChartController = observer(function ChartController() {
  // Only render for PM sensors
  if (!sensorSelectionStore.isPMSelected) {
    return null
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch'
      }}
    >
      {/* Left: Color map label and icons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span
          style={{
            color: '#FFF',
            fontVariantNumeric: 'lining-nums tabular-nums',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: 700,
            lineHeight: '16px'
          }}
        >
          컬러맵
        </span>
        <div
          style={{ width: '84px', height: '24px', cursor: 'pointer' }}
          onClick={() => sensorSelectionStore.togglePMType('PM10')}
        >
          <Icon
            name={sensorSelectionStore.isPM10Selected ? 'pm10_on' : 'pm10'}
            className="w-full h-full"
          />
        </div>
        <div
          style={{ width: '84px', height: '24px', cursor: 'pointer' }}
          onClick={() => sensorSelectionStore.togglePMType('PM25')}
        >
          <Icon
            name={sensorSelectionStore.isPM25Selected ? 'pm25_on' : 'pm25'}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Right: Color bar indicators */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '4px',
          width: '136px',
          height: '32px'
        }}
      >
        {(sensorSelectionStore.selectedPMType === null || sensorSelectionStore.isPM10Selected) && (
          <div style={{ width: '121px', height: '14px' }}>
            <Icon name="pm10_bar" className="w-full h-full" />
          </div>
        )}
        {(sensorSelectionStore.selectedPMType === null || sensorSelectionStore.isPM25Selected) && (
          <div style={{ width: '136px', height: '14px' }}>
            <Icon name="pm25_bar" className="w-full h-full" />
          </div>
        )}
      </div>
    </div>
  )
})

export default ChartController
