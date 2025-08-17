import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import '../../index.css'

let root: Root | null = null;

export async function bootstrap() {
  console.log('[qiankun] SamplePage bootstrap');
}

export async function mount(props: any) {
  console.log('[qiankun] SamplePage mount', props);
  
  const { container } = props;
  const domElement = container 
    ? container.querySelector('#microapp-SamplePage') 
    : document.getElementById('microapp-SamplePage');
  
  if (domElement) {
    root = createRoot(domElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}

export async function unmount() {
  console.log('[qiankun] SamplePage unmount');
  if (root) {
    root.unmount();
    root = null;
  }
}

// 독립 실행 모드
if (!(window as any).__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-SamplePage') || document.getElementById('root');
  if (container) {
    root = createRoot(container);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}

// Qiankun lifecycle 함수 노출
(window as any).SamplePage = {
  bootstrap,
  mount,
  unmount
};