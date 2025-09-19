import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'

let root: Root | null = null;

interface MountProps {
  container?: Element;
}

export async function bootstrap() {
}

export async function mount(props: MountProps) {
  const { container } = props
  // const { container, onCloseMicroApp, dispatch } = props

  const domElement = container
    ? container.querySelector('#microapp-Monitoring')
    : document.getElementById('microapp-Monitoring');

  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <App />
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
if (!window.__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-Monitoring') || document.getElementById('root');
  if (container) {
    root = createRoot(container);
    root.render(
      <App />
    );
  }
}