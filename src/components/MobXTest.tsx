import { observer } from 'mobx-react-lite'
import { appStore } from '../stores/AppStore'

const MobXTest = observer(() => {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px', zIndex: 2000, position: 'relative', backgroundColor: 'white' }}>
      <h3>MobX 테스트</h3>
      <p>{appStore.displayText}</p>
      <div style={{ gap: '10px', display: 'flex' }}>
        <button onClick={appStore.increment}>+</button>
        <button onClick={appStore.decrement}>-</button>
      </div>
      <input
        type="text"
        value={appStore.name}
        onChange={(e) => appStore.setName(e.target.value)}
        style={{ marginTop: '10px', padding: '5px' }}
      />
    </div>
  )
})

export default MobXTest