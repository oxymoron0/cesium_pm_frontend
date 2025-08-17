import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'

let root: Root | null = null;

export async function bootstrap() {
  console.log('[qiankun] SecondSamplePage bootstrap');
}

export async function mount(props: any) {
  console.log('[qiankun] SecondSamplePage mount', props);
  
  const { container } = props;
  const domElement = container 
    ? container.querySelector('#microapp-SecondSamplePage') 
    : document.getElementById('microapp-SecondSamplePage');
  
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
  console.log('[qiankun] SecondSamplePage unmount');
  if (root) {
    root.unmount();
    root = null;
  }
}

// 독립 실행 모드
if (!(window as any).__POWERED_BY_QIANKUN__) {
  const container = document.getElementById('microapp-SecondSamplePage') || document.getElementById('root');
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