import { observer } from 'mobx-react-lite'
import { appStore } from '../stores/AppStore'

const MobXTest = observer(() => {
  return (
    <div className="relative z-[2000] bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-lg font-medium text-gray-800 mb-3">MobX 테스트</div>
      <div className="text-gray-700 mb-4 text-xl font-semibold">{appStore.displayText}</div>

      <div className="flex gap-3 mb-4">
        <div 
          onClick={appStore.increment}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium cursor-pointer text-center"
        >
          +
        </div>
        <div 
          onClick={appStore.decrement}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium cursor-pointer text-center"
        >
          -
        </div>
      </div>

      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => appStore.setName(e.currentTarget.textContent || '')}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[40px] bg-white"
        style={{ 
          color: appStore.name ? '#374151' : '#9ca3af',
          fontStyle: appStore.name ? 'normal' : 'italic'
        }}
      >
        {appStore.name || '이름을 입력하세요'}
      </div>
    </div>
  )
})

export default MobXTest