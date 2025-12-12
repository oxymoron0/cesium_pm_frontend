import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'
import { cleanupAll } from './cleanup'
import { userStore, type User } from '@/stores/UserStore'
import { loadConfig } from '@/utils/env'

let root: Root | null = null;

interface MountProps {
  container?: Element;
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
  user?: User | string;
}

export async function bootstrap() {
  console.log('[qiankun] Simulation bootstrap');
}

export async function mount(props: MountProps) {
  const { container, onCloseMicroApp, dispatch, user } = props
  console.log('[qiankun] Simulation mount', props);

  // Load runtime configuration before rendering
  await loadConfig();

  // Register user in UserStore (overrides default if provided)
  if (user) {
    userStore.setUser(user);
  }

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
  (async () => {
    // Load runtime configuration before rendering
    await loadConfig();

    const container = document.getElementById('microapp-Simulation') || document.getElementById('root');
    if (container) {
      root = createRoot(container);
      root.render(
        <App />
      );
    }
  })();
}