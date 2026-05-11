import { useEffect, useState } from 'react'
import BookAppointmentPage from './Customer/BookAppointmentPage.jsx'
import CustomerDashboard from './Customer/CustomerDashboard.jsx'
import CustomerShell from './Customer/CustomerShell.jsx'
import MyAppointmentsPage from './Customer/MyAppointmentsPage.jsx'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import RegisterPage from './features/auth/RegisterPage.jsx'
import { supabase } from './lib/supabase.js'
import './App.css'

const AUTH_PAGES = new Set(['login', 'register', 'forgot-password'])
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
  if (CUSTOMER_PAGES.has(hash)) return hash
  return 'login'
}

function App() {
  const [page, setPage] = useState(getPageFromHash)
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

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

  if (session) {
    const customerPage = CUSTOMER_PAGES.has(page) ? page : 'dashboard'
    const activeNav = customerPage === 'book' ? 'book' : customerPage

    return (
      <CustomerShell
        activeNav={activeNav}
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        {({ onOpenSidebar }) => {
          if (customerPage === 'book') {
            return (
              <BookAppointmentPage
                onOpenSidebar={onOpenSidebar}
                onBack={() => navigate('dashboard')}
              />
            )
          }
          if (customerPage === 'appointments') {
            return (
              <MyAppointmentsPage
                onOpenSidebar={onOpenSidebar}
                onNavigate={navigate}
              />
            )
          }
          return (
            <CustomerDashboard
              onOpenSidebar={onOpenSidebar}
              onNavigate={navigate}
            />
          )
        }}
      </CustomerShell>
    )
  }

  if (page === 'register') {
    return <RegisterPage onSignIn={() => navigate('login')} />
  }

  if (page === 'forgot-password') {
    return <ForgotPasswordPage onBack={() => navigate('login')} />
  }

  return (
    <LoginPage
      onCreateAccount={() => navigate('register')}
      onForgotPassword={() => navigate('forgot-password')}
      onSignIn={() => navigate('dashboard')}
    />
  )
}

export default App
