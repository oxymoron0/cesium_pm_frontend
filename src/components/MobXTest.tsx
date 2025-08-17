import { observer } from 'mobx-react-lite'
import { appStore } from '../stores/AppStore'

const MobXTest = observer(() => {
  return (
    <div className="relative z-[2000] bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="text-lg font-medium text-gray-800 mb-3">MobX 테스트</h4>
      <p className="text-gray-700 mb-4 text-xl font-semibold">{appStore.displayText}</p>

      <div className="flex gap-3 mb-4">
        <button 
          onClick={appStore.increment}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
        >
          +
        </button>
        <button 
          onClick={appStore.decrement}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
        >
          -
        </button>
      </div>

      <input
        type="text"
        value={appStore.name}
        onChange={(e) => appStore.setName(e.target.value)}
        placeholder="이름을 입력하세요"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
})

export default MobXTest