import { useEffect, useRef } from 'react';
import { Viewer, Ion } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const CesiumViewer = () => {
  const cesiumContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable Ion for development (no API key needed)
    Ion.defaultAccessToken = import.meta.env.VITE_ION_TOKEN;

    if (cesiumContainer.current) {
      const viewer = new Viewer(cesiumContainer.current, {
        terrainProvider: undefined, // Disable terrain
        baseLayerPicker: false,     // Disable base layer picker
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false
      });

      return () => {
        viewer.destroy();
      };
    }
  }, []);

  return (
    <div 
      ref={cesiumContainer}
      style={{ 
        width: '100%', 
        height: '100vh' 
      }}
    />
  );
};

export default CesiumViewer;