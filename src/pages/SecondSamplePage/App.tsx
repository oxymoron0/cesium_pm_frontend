import CesiumViewer from '../../components/CesiumViewer'
import MobXTest from '../../components/MobXTest'

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Sample Microfrontend Page</h2>
      <p>This is a clean, minimal microfrontend template.</p>
      <MobXTest />
      <CesiumViewer />
    </div>
  )
}

export default App