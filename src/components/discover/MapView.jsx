import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Fix for default icon issue with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Teachmo icon
const teachmoIcon = new L.DivIcon({
  html: `<div class="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-md flex items-center justify-center"></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const UpdateMapCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export default function MapView({ events, userLocation }) {
  const mapCenter = userLocation 
    ? [userLocation.latitude, userLocation.longitude] 
    : (events.length > 0 ? [events[0].latitude, events[0].longitude] : [40.7128, -74.0060]); // Default to NYC

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No events with location data to display on the map.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MarkerClusterGroup>
          {events.filter(event => event.latitude && event.longitude).map(event => (
            <Marker key={event.id} position={[event.latitude, event.longitude]} icon={teachmoIcon}>
              <Popup>
                <div className="w-48">
                  {event.image_url && <img src={event.image_url} alt={event.title} className="w-full h-24 object-cover rounded-t-lg" />}
                  <div className="p-2">
                    <h4 className="font-bold text-sm mb-1">{event.title}</h4>
                    <p className="text-xs text-gray-600 mb-2">{event.location_name}</p>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" className="w-full">Get Directions</Button>
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
        <UpdateMapCenter center={mapCenter} />
      </MapContainer>
    </div>
  );
}

export { MapView };
