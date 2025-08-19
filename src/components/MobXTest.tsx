import { observer } from 'mobx-react-lite'
import { appStore } from '../stores/AppStore'

const MobXTest = observer(() => {
  return (
    <div className="relative z-[2000] bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-3 text-lg font-medium text-gray-800">MobX 테스트</div>
      <div className="mb-4 text-xl font-semibold text-gray-700">{appStore.displayText}</div>

      <div className="flex gap-3 mb-4">
        <div 
          onClick={appStore.increment}
          className="px-4 py-2 font-medium text-center text-white transition-colors bg-blue-500 rounded-md cursor-pointer hover:bg-blue-600"
        >
          +
        </div>
        <div 
          onClick={appStore.decrement}
          className="px-4 py-2 font-medium text-center text-white transition-colors bg-red-500 rounded-md cursor-pointer hover:bg-red-600"
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