export function getResponsiveEmissionZoom(width: number, height: number): number {
  let zoom = 3.5;
  
  if (width < 480) {
    zoom = 2.5; // Mobile phones
  } else if (width < 640) {
    zoom = 2.8; // Large mobile phones  
  } else if (width < 768) {
    zoom = 3.0; // Small tablets (portrait)
  } else if (width < 1024) {
    zoom = 3.3; // Medium tablets (landscape)
  } else if (width < 1280) {
    zoom = 3.6; // Desktop
  } else {
    zoom = 3.8; // Large desktop
  }
  
  // Adjust for very short screens
  if (height < 400) {
    zoom = Math.max(2.0, zoom - 0.5);
  } else if (height < 500) {
    zoom = Math.max(2.2, zoom - 0.3);
  }
  
  return zoom;
}

export function getInitialEmissionView(width: number = 1024, height: number = 500) {
  return {
    longitude: -95.0,
    latitude: 39.0,
    zoom: getResponsiveEmissionZoom(width, height),
    bearing: 0,  // Prevent map rotation
    pitch: 0     // Prevent map tilting
  };
}
