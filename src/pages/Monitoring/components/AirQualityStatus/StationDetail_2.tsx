import { observer } from 'mobx-react-lite'

interface StationDetailProps {
  stationId: string
  stationName?: string
  routeName?: string
  onClose: () => void
}

const StationDetail_2 = observer(function StationDetail_2({
  stationId
}: StationDetailProps) {

  // Placeholder for future implementation
  console.log('[StationDetail_2] Station ID:', stationId)

  return (
    <div
      className="flex flex-col self-stretch"
      style={{
        padding: '0',
        gap: '0',
        flex: '1 0 0',
        borderRadius: '12px',
        border: '1px solid #444',
        background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 20, 0.95))',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >

    </div>
  )
})

export default StationDetail_2