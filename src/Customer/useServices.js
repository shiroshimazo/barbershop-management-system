import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export const DEFAULT_SERVICES = [
  {
    id: 'classic-fade-beard',
    name: 'Classic Fade + Beard Trim',
    slug: 'classic-fade-beard',
    price: 48,
    duration: 45,
    descriptor: 'Most popular',
    tag: 'Signature',
    source: 'local',
  },
  {
    id: 'skin-fade',
    name: 'Skin Fade',
    slug: 'skin-fade',
    price: 40,
    duration: 40,
    descriptor: 'Sharp lines',
    source: 'local',
  },
  {
    id: 'classic-cut',
    name: 'Classic Cut',
    slug: 'classic-cut',
    price: 35,
    duration: 30,
    descriptor: 'Scissor & comb',
    source: 'local',
  },
  {
    id: 'beard-sculpt',
    name: 'Beard Sculpt & Hot Towel',
    slug: 'beard-sculpt',
    price: 32,
    duration: 30,
    descriptor: 'Includes oil',
    source: 'local',
  },
  {
    id: 'full-service',
    name: 'The Full Service',
    slug: 'full-service',
    price: 75,
    duration: 75,
    descriptor: 'Cut + beard + treatment',
    tag: 'Premium',
    source: 'local',
  },
  {
    id: 'kids-cut',
    name: "Kid's Cut",
    slug: 'kids-cut',
    price: 22,
    duration: 25,
    descriptor: 'Under 12',
    source: 'local',
  },
]

function mapService(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || row.id,
    price: Math.round((row.price_cents || 0) / 100),
    duration: row.duration_minutes || 45,
    descriptor: row.descriptor || '',
    tag: row.tag || '',
    source: 'db',
  }
}

export function useServices() {
  const [services, setServices] = useState(DEFAULT_SERVICES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usingFallback, setUsingFallback] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('services')
      .select('id, name, slug, price_cents, duration_minutes, descriptor, tag, active')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setServices(DEFAULT_SERVICES)
          setUsingFallback(true)
          setError(error.message)
          setLoading(false)
          return
        }
        if (!data?.length) {
          setServices(DEFAULT_SERVICES)
          setUsingFallback(true)
          setError('No active services found. Showing local defaults.')
          setLoading(false)
          return
        }
        setServices(data.map(mapService))
        setUsingFallback(false)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setServices(DEFAULT_SERVICES)
        setUsingFallback(true)
        setError(err.message || 'Unable to load services. Showing local defaults.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { services, loading, error, usingFallback }
}
