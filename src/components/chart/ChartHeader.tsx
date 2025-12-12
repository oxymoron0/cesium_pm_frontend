import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'
import { isCivil } from '@/utils/env'

interface ChartHeaderProps {
  period: 'today' | 'week' | 'month'
  currentDate?: string // MM/DD format for 'today'
}

/**
 * Chart Header Component
 *
 * Displays period-specific title and sensor type selector
 * - Today: "MM/DD 공기질 농도 변화"
 * - Week: "주간 공기질 농도 변화"
 * - Month: "월간 공기질 농도 변화"
 */
const ChartHeader = observer(function ChartHeader({
  period,
  currentDate
}: ChartHeaderProps) {
  const civilMode = isCivil()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const getTitle = () => {
    switch (period) {
      case 'today':
        return `${currentDate || ''}  공기질 농도 변화`
      case 'week':
        return '주간 공기질 농도 변화'
      case 'month':
        return '월간 공기질 농도 변화'
    }
  }

  const getSensorTypeLabel = (type: 'PM' | 'VOCs') => {
    return type === 'PM' ? '미세·초미세먼지' : 'VOCs'
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleSensorTypeSelect = (type: 'PM' | 'VOCs') => {
    sensorSelectionStore.setSensorType(type)
    setIsDropdownOpen(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignSelf: 'stretch',
        paddingBottom: '12px',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #C4C6C6'
      }}
    >
      {/* Left: Title */}
      <div
        style={{
          color: '#FFF',
          fontVariantNumeric: 'lining-nums tabular-nums',
          fontFamily: 'Pretendard',
          fontSize: '16px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: '20px'
        }}
      >
        {getTitle()}
      </div>

      {/* Right: Dropdown Selector - Civil 모드에서는 숨김 (PM만 사용) */}
      {!civilMode && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleDropdown}
            style={{
              display: 'flex',
              padding: '6px 16px 6px 10px',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '4px',
              border: '1px solid #C4C6C6',
              background: '#000',
              cursor: 'pointer',
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: 'normal'
            }}
          >
            {getSensorTypeLabel(sensorSelectionStore.selectedSensorType)}
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <path d="M1 1L6 6L11 1" stroke="#C4C6C6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '4px',
                border: '1px solid #C4C6C6',
                background: '#000',
                overflow: 'hidden',
                zIndex: 10,
                minWidth: '140px'
              }}
            >
              <button
                onClick={() => handleSensorTypeSelect('PM')}
                style={{
                  display: 'flex',
                  padding: '8px 16px',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: sensorSelectionStore.isPMSelected ? '#1A1A1A' : '#000',
                  color: sensorSelectionStore.isPMSelected ? '#FFD040' : '#FFF',
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: 'normal',
                  border: 'none',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!sensorSelectionStore.isPMSelected) {
                    e.currentTarget.style.background = '#1A1A1A'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sensorSelectionStore.isPMSelected) {
                    e.currentTarget.style.background = '#000'
                  }
                }}
              >
                미세·초미세먼지
              </button>
              <button
                onClick={() => handleSensorTypeSelect('VOCs')}
                style={{
                  display: 'flex',
                  padding: '8px 16px',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: sensorSelectionStore.isVOCsSelected ? '#1A1A1A' : '#000',
                  color: sensorSelectionStore.isVOCsSelected ? '#FFD040' : '#FFF',
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: 'normal',
                  border: 'none',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!sensorSelectionStore.isVOCsSelected) {
                    e.currentTarget.style.background = '#1A1A1A'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sensorSelectionStore.isVOCsSelected) {
                    e.currentTarget.style.background = '#000'
                  }
                }}
              >
                VOCs
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default ChartHeader
