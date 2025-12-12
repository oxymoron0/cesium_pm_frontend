import type { Viewer, Ion, Color, Cartesian3, Cartesian2, HeightReference, LabelStyle, VerticalOrigin } from 'cesium';
import type { RuntimeEnv } from '@/utils/env';

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __ENV__?: RuntimeEnv;
    cviewer?: Viewer;
    Cesium?: {
      Viewer: typeof Viewer;
      Ion: typeof Ion;
      Color: typeof Color;
      Cartesian3: typeof Cartesian3;
      Cartesian2: typeof Cartesian2;
      HeightReference: typeof HeightReference;
      LabelStyle: typeof LabelStyle;
      VerticalOrigin: typeof VerticalOrigin;
    };
  }
}

export {};