import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'

let root: Root | null = null;

export async function bootstrap() {
}

export async function mount(props: any) {
  const { container, onCloseMicroApp, dispatch } = props

  const domElement = container
    ? container.querySelector('#microapp-Monitoring')
    : document.getElementById('microapp-Monitoring');

  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <App onCloseMicroApp={onCloseMicroApp} dispatch={dispatch} />
    );
  }
}

export async function unmount() {
  if (root) {
    root.unmount();
    root = null;
  }
}

// 독립 실행 모드
if (!(window as any).__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-Monitoring') || document.getElementById('root');
  if (container) {
    root = createRoot(container);
    root.render(
      <App />
    );
  }
}