import { observer } from 'mobx-react-lite'

const RouteDetail = observer(function RouteDetail() {
  return (
    <div
      className="flex flex-col self-stretch"
      style={{
        padding: '20px',
        gap: '12px',
        flex: '1 0 0',
        borderRadius: '8px',
        border: '1px solid #696A6A',
        background: 'rgba(0, 0, 0, 0.80)',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.10)'
      }}
    >
      <div className="text-white text-lg font-medium">
        10번 노선도
      </div>

      <div className="text-gray-300 text-sm">
        연제구청지하차 ↔ 감전동아파트 사거리
      </div>

      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        노선별 실시간 공기질 데이터가 표시됩니다.
      </div>
    </div>
  )
})

export default RouteDetail