/// <reference types="google.maps" />

export type RouteResult = {
  result: google.maps.DirectionsResult;
  distanceText: string;
  durationText: string;
};

export function fetchRoute(
  g: typeof google,
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
): Promise<RouteResult> {
  const svc = new g.maps.DirectionsService();
  return new Promise((resolve, reject) => {
    svc.route(
      {
        origin,
        destination,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== g.maps.DirectionsStatus.OK || !result) {
          reject(new Error(`Directions failed: ${status}`));
          return;
        }
        const leg = result.routes[0]?.legs[0];
        resolve({
          result,
          distanceText: leg?.distance?.text ?? "",
          durationText: leg?.duration?.text ?? "",
        });
      },
    );
  });
}