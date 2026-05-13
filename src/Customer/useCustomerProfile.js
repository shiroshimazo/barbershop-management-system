import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

function emptyFacts() {
  return {
    favoriteBarber: null,
    latestVisit: null,
    nextAppointment: null,
    visitsCount: 0,
    upcomingCount: 0,
  }
}

export function tierLabel(tier) {
  if (!tier) return 'Silver'
  return tier[0].toUpperCase() + tier.slice(1)
}

export function memberIdFrom(uuid) {
  if (!uuid) return '-'
  const clean = uuid.replace(/-/g, '').toUpperCase()
  return `BLC-${clean.slice(0, 4)}-${clean.slice(4, 7)}`
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatDate(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatMemberSince(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.getFullYear().toString()
}

export function formatMoney(cents) {
  if (typeof cents !== 'number') return '-'
  return `$${(cents / 100).toFixed(2)}`
}

export function toggleText(value) {
  return value ? 'On' : 'Off'
}

export function valueOrEmpty(value, fallback = 'Not added') {
  return value == null || value === '' ? fallback : value
}

export function emailStatus(user) {
  if (user?.email_confirmed_at || user?.confirmed_at) return 'Verified'
  return 'Needs confirmation'
}

export function mapCustomerRow(data, session) {
  const settings = data?.settings && typeof data.settings === 'object' ? data.settings : {}
  return {
    id: data?.id || session?.user?.id || '',
    name: data?.fullname || session?.user?.user_metadata?.fullname || '',
    email: data?.email || session?.user?.email || '',
    phone: data?.phone || session?.user?.user_metadata?.phone || '',
    location: settings.preferred_location || '',
    tier: data?.tier || 'silver',
    loyaltyPoints: data?.loyalty_points || 0,
    memberSince: data?.member_since || data?.created_at || session?.user?.created_at || null,
    updatedAt: data?.updated_at || null,
    settings,
  }
}

export function useCustomerProfile(session) {
  const userId = session?.user?.id
  const [customer, setCustomer] = useState(() => mapCustomerRow(null, session))
  const [facts, setFacts] = useState(emptyFacts)
  const [customerLoading, setCustomerLoading] = useState(Boolean(userId))
  const [customerError, setCustomerError] = useState('')
  const [factsLoading, setFactsLoading] = useState(Boolean(userId))
  const [factsError, setFactsError] = useState('')
  const [factsRefresh, setFactsRefresh] = useState(0)

  const refreshFacts = useCallback(() => {
    setFactsRefresh((tick) => tick + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      queueMicrotask(() => {
        if (cancelled) return
        setCustomer(mapCustomerRow(null, session))
        setCustomerLoading(false)
        setCustomerError('')
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      setCustomer(mapCustomerRow(null, session))
      setCustomerLoading(true)
      setCustomerError('')
    })

    supabase
      .from('customers')
      .select('id, fullname, email, phone, tier, loyalty_points, member_since, updated_at, settings')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setCustomerError(error.message)
          setCustomerLoading(false)
          return
        }
        if (data) setCustomer(mapCustomerRow(data, session))
        setCustomerLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session, userId])

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      queueMicrotask(() => {
        if (cancelled) return
        setFacts(emptyFacts())
        setFactsLoading(false)
        setFactsError('')
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      setFactsLoading(true)
      setFactsError('')
    })

    Promise.all([
      supabase
        .from('favorites')
        .select('barber:barbers ( id, fullname, specialty, location )')
        .eq('customer_id', userId)
        .order('created_at', { ascending: true })
        .limit(1),
      supabase
        .from('visits')
        .select(
          'id, service, visited_at, location, price_cents, rating, barber:barbers ( fullname, location )',
          { count: 'exact' },
        )
        .eq('customer_id', userId)
        .order('visited_at', { ascending: false })
        .limit(1),
      supabase
        .from('appointments')
        .select(
          'id, service, scheduled_at, duration_minutes, location, price_cents, status, barber:barbers ( fullname, location )',
          { count: 'exact' },
        )
        .eq('customer_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1),
    ])
      .then(([favoriteRes, visitsRes, upcomingRes]) => {
        if (cancelled) return

        const nextFacts = {
          favoriteBarber: favoriteRes.data?.[0]?.barber || null,
          latestVisit: visitsRes.data?.[0] || null,
          nextAppointment: upcomingRes.data?.[0] || null,
          visitsCount: visitsRes.count || 0,
          upcomingCount: upcomingRes.count || 0,
        }

        setFacts(nextFacts)
        setFactsLoading(false)
        if (favoriteRes.error || visitsRes.error || upcomingRes.error) {
          const firstError = favoriteRes.error || visitsRes.error || upcomingRes.error
          setFactsError(firstError.message)
        }
      })
      .catch((error) => {
        if (cancelled) return
        setFacts(emptyFacts())
        setFactsError(error.message || 'Unable to load customer activity.')
        setFactsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [factsRefresh, userId])

  useEffect(() => {
    if (!userId) return undefined

    const channel = supabase
      .channel(`customer-profile-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new) setCustomer(mapCustomerRow(payload.new, session))
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `customer_id=eq.${userId}` },
        refreshFacts,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits', filter: `customer_id=eq.${userId}` },
        refreshFacts,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'favorites', filter: `customer_id=eq.${userId}` },
        refreshFacts,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshFacts, session, userId])

  return {
    customer,
    customerError,
    customerLoading,
    facts,
    factsError,
    factsLoading,
    refreshFacts,
    setCustomer,
  }
}
