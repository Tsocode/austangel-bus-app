export interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
}

export interface Route {
  id: string;
  name: string;
  stops: RouteStop[];
  createdAt?: number;
  updatedAt?: number;
}
