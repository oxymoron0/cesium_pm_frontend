import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'
import { cleanupAll } from './cleanup'

let root: Root | null = null;

interface MountProps {
  container?: Element;
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

export async function bootstrap() {
  console.log('[qiankun] Simulation bootstrap');
}

export async function mount(props: MountProps) {
  const { container, onCloseMicroApp, dispatch } = props
  console.log('[qiankun] Simulation mount', props);

  const domElement = container
    ? container.querySelector('#microapp-Simulation')
    : document.getElementById('microapp-Simulation');

  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <App onCloseMicroApp={onCloseMicroApp} dispatch={dispatch} />
    );
  }
}

export async function unmount() {
  console.log('[qiankun] Simulation unmount');

  cleanupAll();

  if (root) {
    root.unmount();
    root = null;
  }
}

// 독립 실행 모드
if (!window.__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-Simulation') || document.getElementById('root');
  if (container) {
    root = createRoot(container);
    root.render(
      <App />
    );
  }
}