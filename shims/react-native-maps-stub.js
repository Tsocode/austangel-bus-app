/**
 * react-native-maps stub for web
 * 
 * This is a stub module that prevents errors when react-native-maps
 * is conditionally required on web platform.
 */

class MockMapView {
  constructor(props) {
    console.warn('[Stub] MapView not available on web platform');
  }
  render() {
    return null;
  }
}

class MockMarker {
  render() {
    return null;
  }
}

class MockPolyline {
  render() {
    return null;
  }
}

class MockAnimatedRegion {
  constructor() {}
  timing() {
    return { start: () => {} };
  }
}

class MockLatLng {
  constructor(lat, lng) {
    this.latitude = lat;
    this.longitude = lng;
  }
}

module.exports = {
  default: MockMapView,
  MapView: MockMapView,
  Marker: MockMarker,
  MarkerAnimated: MockMarker,
  Polyline: MockPolyline,
  AnimatedRegion: MockAnimatedRegion,
  LatLng: MockLatLng,
};
