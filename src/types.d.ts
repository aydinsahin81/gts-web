declare module 'leaflet' {
  export type LatLngExpression = 
    | { lat: number; lng: number }
    | [number, number]
    | number[];
  
  export class Icon {
    constructor(options: IconOptions);
  }
  
  export interface IconOptions {
    iconUrl: string;
    iconRetinaUrl?: string;
    shadowUrl?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
    shadowSize?: [number, number];
  }
  
  export namespace Icon {
    const Default: {
      prototype: {
        _getIconUrl?: string;
      };
      mergeOptions: (options: Record<string, string>) => void;
    };
  }
}

declare module 'react-leaflet' {
  import { ComponentType, ReactNode } from 'react';
  import * as L from 'leaflet';
  
  export interface MapContainerProps {
    center?: L.LatLngExpression;
    zoom?: number;
    scrollWheelZoom?: boolean;
    style?: React.CSSProperties;
    children?: ReactNode;
  }
  
  export interface TileLayerProps {
    attribution?: string;
    url: string;
    children?: ReactNode;
  }
  
  export interface MarkerProps {
    position: L.LatLngExpression;
    icon?: L.Icon;
    children?: ReactNode;
  }
  
  export interface PopupProps {
    children?: ReactNode;
  }
  
  export interface MapViewProps {
    center: L.LatLngExpression;
    zoom: number;
    children?: ReactNode;
  }
  
  export const MapContainer: ComponentType<MapContainerProps>;
  export const TileLayer: ComponentType<TileLayerProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export function useMap(): any;
} 