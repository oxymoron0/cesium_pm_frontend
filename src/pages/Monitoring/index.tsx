import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'
import { cleanupAll } from './cleanup'
import { userStore } from '@/stores/UserStore'

let root: Root | null = null;

interface MountProps {
  container?: Element;
  onCloseMicroApp?: () => void;
  user?: string;
}

export async function bootstrap() {
  console.log('[qiankun] Monitoring bootstrap');
}

export async function mount(props: MountProps) {
  const { container, onCloseMicroApp, user } = props
  console.log('[qiankun] Monitoring mount', props);

  // Register user in UserStore (overrides default if provided)
  if (user) {
    userStore.setUser(user);
  }

  const domElement = container
    ? container.querySelector('#microapp-Monitoring')
    : document.getElementById('microapp-Monitoring');

  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <App onCloseMicroApp={onCloseMicroApp} />
    );
  }
}

export async function unmount() {
  console.log('[qiankun] Monitoring unmount');

  // Clear user from UserStore
  userStore.clearUser();

  cleanupAll();

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