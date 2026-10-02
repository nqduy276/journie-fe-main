import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { categories } from '../../domain/categories'
import { poiById } from '../../domain/pois'
import { useTr } from '../../hooks/useTr'
import type { Stop } from '../../domain/types'

type Props = {
  stops: Stop[]
  activeUid?: string | null
  onSelect?: (uid: string) => void
  /** Live traveler position, drawn as a pulsing dot. */
  me?: { lat: number; lng: number } | null
  className?: string
  /** Extra points (e.g. search results) drawn as small markers. */
  extras?: { id: string; lat: number; lng: number; label: string; color?: string }[]
  onExtraClick?: (id: string) => void
  fitKey?: string
}

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

/** Cache road geometry per leg so panning around or re-rendering never refetches. */
const geometryCache = new Map<string, [number, number][]>()

async function roadGeometry(coords: { lat: number; lng: number }[], signal: AbortSignal): Promise<[number, number][] | null> {
  const key = coords.map((c) => `${c.lng.toFixed(4)},${c.lat.toFixed(4)}`).join(';')
  const cached = geometryCache.get(key)
  if (cached) return cached
  try {
    const response = await fetch(`${OSRM}/${key}?overview=simplified&geometries=geojson`, { signal })
    if (!response.ok) return null
    const json = (await response.json()) as { routes?: { geometry: { coordinates: [number, number][] } }[] }
    const line = json.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
    if (line) geometryCache.set(key, line)
    return line ?? null
  } catch {
    return null
  }
}

/**
 * Leaflet map of a day's route. Stops are numbered pins coloured by category; the line between them
 * is the OSRM road geometry when the public demo server answers, otherwise a straight hop, so the
 * map is always legible offline.
 */
export function RouteMap({ stops, activeUid, onSelect, me, className = '', extras, onExtraClick, fitKey }: Props) {
  const { tr } = useTr()
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const meMarker = useRef<L.Marker | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const onSelectRef = useRef(onSelect)
  const onExtraRef = useRef(onExtraClick)

  useEffect(() => {
    onSelectRef.current = onSelect
    onExtraRef.current = onExtraClick
  })

  useEffect(() => {
    if (!host.current || map.current) return
    const instance = L.map(host.current, { zoomControl: false, scrollWheelZoom: true, attributionControl: true }).setView([16.05, 108.2], 5)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance)
    L.control.zoom({ position: 'bottomright' }).addTo(instance)
    instance.attributionControl.setPrefix(false)
    layer.current = L.layerGroup().addTo(instance)
    map.current = instance
    return () => {
      instance.remove()
      map.current = null
    }
  }, [])

  // Draw pins and the route whenever the stops change.
  const stopKey = stops.map((stop) => stop.uid).join('|')
  useEffect(() => {
    const instance = map.current
    const group = layer.current
    if (!instance || !group) return
    group.clearLayers()
    markers.current.clear()

    const points = stops.map((stop) => poiById[stop.poiId])
    const latlngs = points.map((poi) => [poi.lat, poi.lng] as [number, number])

    const straight = L.polyline(latlngs, { color: '#173f35', weight: 3, opacity: 0.6, dashArray: '2 9', lineCap: 'round', className: 'route-line' }).addTo(group)

    stops.forEach((stop, index) => {
      const poi = poiById[stop.poiId]
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-pin" data-uid="${stop.uid}" style="background:${categories[poi.cat].color}"><span>${index + 1}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })
      const marker = L.marker([poi.lat, poi.lng], { icon, title: poi.name, keyboard: true }).addTo(group)
      marker.on('click', () => onSelectRef.current?.(stop.uid))
      markers.current.set(stop.uid, marker)
    })

    extras?.forEach((extra) => {
      const dot = L.circleMarker([extra.lat, extra.lng], { radius: 7, color: '#fff', weight: 2, fillColor: extra.color ?? '#d96745', fillOpacity: 1 }).addTo(group)
      dot.bindTooltip(extra.label, { direction: 'top', offset: [0, -6] })
      dot.on('click', () => onExtraRef.current?.(extra.id))
    })

    const all = [...latlngs, ...(extras ?? []).map((e) => [e.lat, e.lng] as [number, number])]
    if (all.length) instance.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 15, animate: true, duration: 0.8 })

    const controller = new AbortController()
    if (points.length > 1) {
      roadGeometry(points, controller.signal).then((line) => {
        if (!line || controller.signal.aborted || !group.hasLayer(straight)) return
        straight.setLatLngs(line)
        straight.setStyle({ opacity: 0.8, weight: 4 })
      })
    }
    return () => controller.abort()
    // stopKey summarises the stops; extras are compared by value below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopKey, JSON.stringify(extras), fitKey])

  // Highlight the active pin.
  useEffect(() => {
    markers.current.forEach((marker, uid) => {
      marker.getElement()?.querySelector('.map-pin')?.setAttribute('data-active', String(uid === activeUid))
    })
    if (activeUid) {
      const marker = markers.current.get(activeUid)
      if (marker && map.current) map.current.panTo(marker.getLatLng(), { animate: true, duration: 0.6 })
    }
  }, [activeUid, stopKey])

  // Live position.
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    if (!me) {
      meMarker.current?.remove()
      meMarker.current = null
      return
    }
    if (!meMarker.current) {
      meMarker.current = L.marker([me.lat, me.lng], {
        icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(instance)
    } else {
      meMarker.current.setLatLng([me.lat, me.lng])
    }
  }, [me])

  // Leaflet's own zoom buttons are English; keep them in the page language.
  useEffect(() => {
    const root = host.current
    if (!root) return
    for (const [selector, label] of [['.leaflet-control-zoom-in', tr('Phóng to', 'Zoom in')], ['.leaflet-control-zoom-out', tr('Thu nhỏ', 'Zoom out')]] as const) {
      const button = root.querySelector(selector)
      button?.setAttribute('title', label)
      button?.setAttribute('aria-label', label)
    }
  }, [tr])

  return <div ref={host} className={`journie-map ${className}`} role="application" aria-label={tr('Bản đồ lịch trình', 'Itinerary map')} />
}
