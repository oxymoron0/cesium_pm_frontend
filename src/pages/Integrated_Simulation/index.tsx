import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'
import { userStore, type User } from '@/stores/UserStore'
import { cleanupAll } from './cleanup'

let root: Root | null = null;

interface MountProps {
  container?: Element;
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
  user?: User | string;
}

export async function bootstrap() {
  console.log('[qiankun] Integrated_Simulation bootstrap');
}

export async function mount(props: MountProps) {
  const { container, onCloseMicroApp, dispatch, user } = props
  console.log('[qiankun] Integrated_Simulation mount', props);

  // Register user in UserStore (overrides default if provided)
  if (user) {
    userStore.setUser(user);
  }

  const domElement = container
    ? container.querySelector('#microapp-Integrated_Simulation')
    : document.getElementById('microapp-Integrated_Simulation');

  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <App onCloseMicroApp={onCloseMicroApp} dispatch={dispatch} />
    );
  }
}

export async function unmount() {
  console.log('[qiankun] Integrated_Simulation unmount');

  // Clean up all services
  cleanupAll();

  // Clear user from UserStore
  userStore.clearUser();

  if (root) {
    root.unmount();
    root = null;
  }
}

// 독립 실행 모드
if (!window.__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-Integrated_Simulation') || document.getElementById('root');
  if (container) {
    root = createRoot(container);
    root.render(
      <App />
    );
  }
}
