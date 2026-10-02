import { create } from 'zustand'
import type { CategoryId, CityId } from '../domain/types'
import type { PriceTier } from '../api/places'

/**
 * Transient interaction state (report §5.2.3): selected day, hovered stop, which panel is open and
 * the discovery filters. Server data lives in TanStack Query, never here.
 */
type UiState = {
  activeDay: number
  activeUid: string | null
  setActiveDay: (day: number) => void
  setActiveUid: (uid: string | null) => void

  poiSheet: string | null
  openPoi: (id: string | null) => void

  discover: {
    query: string
    cities: CityId[]
    categories: CategoryId[]
    prices: PriceTier[]
    minRating: number
    indoorOnly: boolean
    sort: 'relevance' | 'rating' | 'price' | 'distance'
    view: 'list' | 'map'
  }
  setDiscover: (patch: Partial<UiState['discover']>) => void
  resetDiscover: () => void
}

const discoverDefaults: UiState['discover'] = {
  query: '',
  cities: [],
  categories: [],
  prices: [],
  minRating: 0,
  indoorOnly: false,
  sort: 'relevance',
  view: 'list',
}

export const useUiStore = create<UiState>((set) => ({
  activeDay: 0,
  activeUid: null,
  setActiveDay: (activeDay) => set({ activeDay, activeUid: null }),
  setActiveUid: (activeUid) => set({ activeUid }),

  poiSheet: null,
  openPoi: (poiSheet) => set({ poiSheet }),

  discover: discoverDefaults,
  setDiscover: (patch) => set((state) => ({ discover: { ...state.discover, ...patch } })),
  resetDiscover: () => set({ discover: discoverDefaults }),
}))
