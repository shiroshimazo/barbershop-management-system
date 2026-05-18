import { Suspense, lazy, useEffect, useState } from 'react'
import CustomerShell from './Customer/CustomerShell.jsx'
import { supabase } from './lib/supabase.js'
import './App.css'

const AdminPage = lazy(() => import('./Admin/AdminPage.jsx'))
const AdminAppointment = lazy(() => import('./Admin/AdminAppointment.jsx'))
const AdminBarbers = lazy(() => import('./Admin/AdminBarbers.jsx'))
const AdminCustomer = lazy(() => import('./Admin/AdminCustomer.jsx'))
const AdminServices = lazy(() => import('./Admin/AdminServices.jsx'))
const BookAppointmentPage = lazy(() => import('./Customer/BookAppointmentPage.jsx'))
const CustomerDashboard = lazy(() => import('./Customer/CustomerDashboard.jsx'))
const FavouritesPage = lazy(() => import('./Customer/FavouritesPage.jsx'))
const HistoryPage = lazy(() => import('./Customer/HistoryPage.jsx'))
const MyAppointmentsPage = lazy(() => import('./Customer/MyAppointmentsPage.jsx'))
const MyProfilePage = lazy(() => import('./Customer/MyProfilePage.jsx'))
const NotificationsPage = lazy(() => import('./Customer/NotificationsPage.jsx'))
const SettingsPage = lazy(() => import('./Customer/SettingsPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage.jsx'))
const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./features/auth/RegisterPage.jsx'))

const AUTH_PAGES = new Set(['login', 'register', 'forgot-password'])
const ADMIN_PAGES = new Set(['customers', 'barbers', 'services'])
const CUSTOMER_PAGES = new Set([
  'dashboard',
  'book',
  'appointments',
  'history',
  'favourites',
  'profile',
  'notifications',
  'settings',
])

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '')
  if (AUTH_PAGES.has(hash)) return hash
  if (ADMIN_PAGES.has(hash)) return hash
  if (CUSTOMER_PAGES.has(hash)) return hash
  return 'login'
}

function getInitialTheme() {
  const saved = localStorage.getItem('bladeco.theme')
  if (saved === 'dark' || saved === 'light') return saved
  return 'light'
}

function App() {
  const [page, setPage] = useState(getPageFromHash)
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [roleForUserId, setRoleForUserId] = useState(null)
  const [theme, setTheme] = useState(getInitialTheme)
  const [appointmentsByUser, setAppointmentsByUser] = useState({})
  const [appointmentsTick, setAppointmentsTick] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('bladeco.theme', theme)
  }, [theme])

  useEffect(() => {
    const handleHashChange = () => {
      setPage(getPageFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsAuthLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return
      // Recovery session must not route to the dashboard — the forgot-password
      // page needs the supabase client session to call updateUser, but the
      // React session state stays null until the user signs in normally.
      if (event === 'PASSWORD_RECOVERY') return
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const sessionUserId = session?.user?.id ?? null
  const isRoleLoading = !!sessionUserId && roleForUserId !== sessionUserId
  const [unreadByUser, setUnreadByUser] = useState({})
  const [unreadTick, setUnreadTick] = useState(0)
  const unreadCount = sessionUserId ? unreadByUser[sessionUserId] || 0 : 0
  const upcomingAppointmentsCount = sessionUserId
    ? appointmentsByUser[sessionUserId] || 0
    : 0

  useEffect(() => {
    if (!sessionUserId || userRole !== 'customer') return undefined
    let cancelled = false
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sessionUserId)
      .eq('is_unread', true)
      .then(({ count }) => {
        if (cancelled) return
        setUnreadByUser((prev) => ({ ...prev, [sessionUserId]: count || 0 }))
      })
    return () => {
      cancelled = true
    }
  }, [sessionUserId, userRole, unreadTick])

  useEffect(() => {
    if (!sessionUserId || userRole !== 'customer') return undefined
    let cancelled = false
    const nowIso = new Date().toISOString()
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', sessionUserId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', nowIso)
      .then(({ count }) => {
        if (cancelled) return
        setAppointmentsByUser((prev) => ({ ...prev, [sessionUserId]: count || 0 }))
      })
    return () => {
      cancelled = true
    }
  }, [sessionUserId, userRole, appointmentsTick])

  const refreshUnread = () => setUnreadTick((t) => t + 1)

  useEffect(() => {
    if (!sessionUserId) return undefined
    let cancelled = false
    supabase
      .from('customers')
      .select('role, settings')
      .eq('id', sessionUserId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setUserRole(data?.role === 'admin' ? 'admin' : 'customer')
        setRoleForUserId(sessionUserId)
        const savedTheme = data?.settings?.theme
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme)
        }
      })
    return () => {
      cancelled = true
    }
  }, [sessionUserId])

  const refreshAppointments = () => setAppointmentsTick((value) => value + 1)

  const navigate = (target) => {
    window.location.hash = target
    setPage(target)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('login')
  }

  if (isAuthLoading) {
    return null
  }

  if (session && isRoleLoading) {
    return null
  }

  if (session && userRole === 'admin') {
    const adminPage =
      page === 'appointments' || page === 'customers' || page === 'barbers' || page === 'services'
        ? page
        : 'dashboard'
    return (
      <Suspense fallback={null}>
        {adminPage === 'appointments' ? (
          <AdminAppointment session={session} onLogout={handleLogout} />
        ) : adminPage === 'customers' ? (
          <AdminCustomer session={session} onLogout={handleLogout} />
        ) : adminPage === 'barbers' ? (
          <AdminBarbers session={session} onLogout={handleLogout} />
        ) : adminPage === 'services' ? (
          <AdminServices session={session} onLogout={handleLogout} />
        ) : (
          <AdminPage session={session} onLogout={handleLogout} />
        )}
      </Suspense>
    )
  }

  if (session) {
    const customerPage = CUSTOMER_PAGES.has(page) ? page : 'dashboard'
    const activeNav = customerPage === 'book' ? 'book' : customerPage

    return (
      <CustomerShell
        activeNav={activeNav}
        appointmentsCount={upcomingAppointmentsCount}
        onNavigate={navigate}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      >
        {({ onOpenSidebar }) => {
          let content
          if (customerPage === 'book') {
            content = (
              <BookAppointmentPage
                onOpenSidebar={onOpenSidebar}
                onBack={() => navigate('dashboard')}
                onAppointmentsChange={refreshAppointments}
                onNavigate={navigate}
                session={session}
              />
            )
          } else if (customerPage === 'appointments') {
            content = (
              <MyAppointmentsPage
                onOpenSidebar={onOpenSidebar}
                onAppointmentsChange={refreshAppointments}
                onNavigate={navigate}
                session={session}
              />
            )
          } else if (customerPage === 'history') {
            content = (
              <HistoryPage
                onOpenSidebar={onOpenSidebar}
                onNavigate={navigate}
                session={session}
              />
            )
          } else if (customerPage === 'favourites') {
            content = (
              <FavouritesPage
                onOpenSidebar={onOpenSidebar}
                onNavigate={navigate}
                session={session}
              />
            )
          } else if (customerPage === 'profile') {
            content = (
              <MyProfilePage
                onOpenSidebar={onOpenSidebar}
                onNavigate={navigate}
                session={session}
              />
            )
          } else if (customerPage === 'notifications') {
            content = (
              <NotificationsPage
                onOpenSidebar={onOpenSidebar}
                onNavigate={navigate}
                session={session}
                onUnreadChange={refreshUnread}
              />
            )
          } else if (customerPage === 'settings') {
            content = (
              <SettingsPage
                onOpenSidebar={onOpenSidebar}
                onNavigate={navigate}
                theme={theme}
                onThemeChange={setTheme}
                session={session}
              />
            )
          } else {
            content = (
              <CustomerDashboard
                onOpenSidebar={onOpenSidebar}
                onAppointmentsChange={refreshAppointments}
                onNavigate={navigate}
                session={session}
                unreadCount={unreadCount}
              />
            )
          }
          return (
            <Suspense fallback={null}>
              {content}
            </Suspense>
          )
        }}
      </CustomerShell>
    )
  }

  if (page === 'register') {
    return (
      <Suspense fallback={null}>
        <RegisterPage onSignIn={() => navigate('login')} />
      </Suspense>
    )
  }

  if (page === 'forgot-password') {
    return (
      <Suspense fallback={null}>
        <ForgotPasswordPage onBack={() => navigate('login')} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={null}>
      <LoginPage
        onCreateAccount={() => navigate('register')}
        onForgotPassword={() => navigate('forgot-password')}
        onSignIn={() => navigate('dashboard')}
      />
    </Suspense>
  )
}

export default App
