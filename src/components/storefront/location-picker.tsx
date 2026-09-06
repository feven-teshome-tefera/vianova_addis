"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = L.divIcon({
  className: "",
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 41C15 41 28 25.5 28 15A13 13 0 1 0 2 15C2 25.5 15 41 15 41Z" fill="#176b4d" stroke="#ffffff" stroke-width="2.5"/><circle cx="15" cy="15" r="5" fill="#ffffff"/></svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

/* The customer drags this to their gate, which is the only reliable correction for a
   coarse browser fix. Tiles come from OpenStreetMap: free, no key, attribution required. */
export default function LocationPicker({ latitude, longitude, onChange }: { latitude: number; longitude: number; onChange: (latitude: number, longitude: number) => void }) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const fromDrag = useRef(false);
  const notify = useRef(onChange);
  notify.current = onChange;

  useEffect(() => {
    if (!host.current || map.current) return;
    const instance = L.map(host.current, { attributionControl: true }).setView([latitude, longitude], 17);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance);
    const handle = L.marker([latitude, longitude], { draggable: true, icon: pin, autoPan: true }).addTo(instance);
    const move = (nextLatitude: number, nextLongitude: number) => { fromDrag.current = true; notify.current(nextLatitude, nextLongitude); };
    handle.on("dragend", () => { const point = handle.getLatLng(); move(point.lat, point.lng); });
    instance.on("click", (event: L.LeafletMouseEvent) => { handle.setLatLng(event.latlng); move(event.latlng.lat, event.latlng.lng); });
    map.current = instance;
    marker.current = handle;
    /* Leaflet measures the container on creation; checkout reveals it after a state change. */
    setTimeout(() => instance.invalidateSize(), 0);
    return () => { instance.remove(); map.current = null; marker.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map.current || !marker.current) return;
    if (fromDrag.current) { fromDrag.current = false; return; } // don't fight the drag
    marker.current.setLatLng([latitude, longitude]);
    map.current.setView([latitude, longitude], map.current.getZoom());
  }, [latitude, longitude]);

  return <div ref={host} className="sf-location-map" style={{ height: 260, width: "100%", borderRadius: 12, overflow: "hidden", zIndex: 0 }}/>;
}
