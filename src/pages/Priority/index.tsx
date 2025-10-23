import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'
import { userStore, type User } from '@/stores/UserStore'

let root: Root | null = null;

interface MountProps {
  container?: Element;
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
  user?: User | string;
}

export async function bootstrap() {
  console.log('[qiankun] Priority bootstrap');
}

export async function mount(props: MountProps) {
  const { container, onCloseMicroApp, dispatch, user } = props
  console.log('[qiankun] Priority mount', props);

  // Register user in UserStore (overrides default if provided)
  if (user) {
    userStore.setUser(user);
  }

  const domElement = container
    ? container.querySelector('#microapp-Priority')
    : document.getElementById('microapp-Priority');

  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <App onCloseMicroApp={onCloseMicroApp} dispatch={dispatch} />
    );
  }
}

export async function unmount() {
  console.log('[qiankun] Priority unmount');

  // Clear user from UserStore
  userStore.clearUser();

  if (root) {
    root.unmount();
    root = null;
  }
}

// 독립 실행 모드
if (!window.__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-Priority') || document.getElementById('root');
  if (container) {
    root = createRoot(container);
    root.render(
      <App />
    );
  }
}