import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Trip } from '../domain/types'
import { useAuthStore } from '../store/authStore'
import { getAnalytics } from './analytics'
import { createTrip, deleteTrip, getTrip, listTrips, saveTrip } from './trips'
import { getProfile, saveProfile, type Profile } from './profile'
import { getReviews } from './places'

export const keys = {
  trips: (userId: string) => ['trips', userId] as const,
  trip: (id: string) => ['trip', id] as const,
  profile: (userId: string) => ['profile', userId] as const,
  reviews: (poiId: string) => ['reviews', poiId] as const,
  analytics: ['analytics'] as const,
}

const useUserId = () => useAuthStore((state) => state.user?.id ?? '')

export function useTrips() {
  const userId = useUserId()
  return useQuery({ queryKey: keys.trips(userId), queryFn: () => listTrips(userId), enabled: !!userId })
}

export function useTrip(id: string | undefined) {
  const userId = useUserId()
  return useQuery({ queryKey: keys.trip(id ?? ''), queryFn: () => getTrip(id!, userId), enabled: !!id && !!userId, retry: false })
}

/** Saves a trip with an optimistic update, so drag-and-drop never waits on the network. */
export function useSaveTrip() {
  const client = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: saveTrip,
    onMutate: async (trip: Trip) => {
      await client.cancelQueries({ queryKey: keys.trip(trip.id) })
      const previous = client.getQueryData<Trip>(keys.trip(trip.id))
      client.setQueryData(keys.trip(trip.id), trip)
      return { previous }
    },
    onError: (_error, trip, context) => {
      if (context?.previous) client.setQueryData(keys.trip(trip.id), context.previous)
    },
    onSuccess: (saved) => {
      client.setQueryData(keys.trip(saved.id), saved)
      client.invalidateQueries({ queryKey: keys.trips(userId) })
    },
  })
}

export function useCreateTrip() {
  const client = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      client.setQueryData(keys.trip(trip.id), trip)
      client.invalidateQueries({ queryKey: keys.trips(userId) })
    },
  })
}

export function useDeleteTrip() {
  const client = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.trips(userId) }),
  })
}

export function useProfile() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: keys.profile(user?.id ?? ''),
    queryFn: () => getProfile(user!.id, user!.name),
    enabled: !!user,
  })
}

export function useSaveProfile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: saveProfile,
    onMutate: async (profile: Profile) => {
      const key = keys.profile(profile.userId)
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Profile>(key)
      client.setQueryData(key, profile)
      return { previous, key }
    },
    onError: (_error, _profile, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous)
    },
  })
}

export const useReviews = (poiId: string | null) =>
  useQuery({ queryKey: keys.reviews(poiId ?? ''), queryFn: () => getReviews(poiId!), enabled: !!poiId })

export const useAnalytics = () => useQuery({ queryKey: keys.analytics, queryFn: getAnalytics })
