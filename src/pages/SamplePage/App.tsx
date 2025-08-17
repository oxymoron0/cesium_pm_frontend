import CesiumViewer from '../../components/CesiumViewer'
import MobXTest from '../../components/MobXTest'

function App() {
  return (
    <div className="fixed top-4 left-4 w-60 h-[720px] bg-slate-800 bg-opacity-50 rounded-lg border border-gray-400 border-opacity-30 z-[2000]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 bg-blue-500/80 text-white p-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">PM Control Panel</h2>
        <p className="text-blue-100 text-sm">Microfrontend Controls</p>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4 overflow-y-auto h-[632px]">
        <div className="border-b border-gray-300/30 pb-4">
          <h3 className="text-sm font-medium text-white mb-2">State Management</h3>
          <MobXTest />
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-white mb-2">3D Viewer Controls</h3>
          <CesiumViewer />
        </div>
      </div>
    </div>
  )
}

export default App