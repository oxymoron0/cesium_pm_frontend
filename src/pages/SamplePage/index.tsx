import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '@/index.css'
import { userStore } from '@/stores/UserStore'

let root: Root | null = null;

interface MountProps {
  container?: Element;
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
  user?: string;
}

export async function bootstrap() {
  console.log('[qiankun] SamplePage bootstrap');
}

export async function mount(props: MountProps) {
  const { container, onCloseMicroApp, dispatch, user = 'leorca' } = props
  console.log('[qiankun] SamplePage mount', props);

  // Register user in UserStore
  userStore.setUser(user);

  const domElement = container
    ? container.querySelector('#microapp-SamplePage')
    : document.getElementById('microapp-SamplePage');

  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <App onCloseMicroApp={onCloseMicroApp} dispatch={dispatch} />
    );
  }
}

export async function unmount() {
  console.log('[qiankun] SamplePage unmount');

  // Clear user from UserStore
  userStore.clearUser();

  if (root) {
    root.unmount();
    root = null;
  }
}

// 독립 실행 모드
if (!window.__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-SamplePage') || document.getElementById('root');
  if (container) {
    root = createRoot(container);
    root.render(
      <App />
    );
  }
}