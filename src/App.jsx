import { useEffect, useState } from 'react'
import CustomerDashboard from './Customer/CustomerDashboard.jsx'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import RegisterPage from './features/auth/RegisterPage.jsx'
import { supabase } from './lib/supabase.js'
import './App.css'

function getPageFromHash() {
  if (window.location.hash === '#register') return 'register'
  if (window.location.hash === '#forgot-password') return 'forgot-password'
  if (window.location.hash === '#dashboard') return 'dashboard'

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

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const goToRegister = () => {
    window.location.hash = 'register'
    setPage('register')
  }

  const goToLogin = () => {
    window.location.hash = 'login'
    setPage('login')
  }

  const goToForgotPassword = () => {
    window.location.hash = 'forgot-password'
    setPage('forgot-password')
  }

  const goToDashboard = () => {
    window.location.hash = 'dashboard'
    setPage('dashboard')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    goToLogin()
  }

  if (isAuthLoading) {
    return null
  }

  if (session) {
    return <CustomerDashboard onLogout={handleLogout} />
  }

  if (page === 'register') {
    return <RegisterPage onSignIn={goToLogin} />
  }

  if (page === 'forgot-password') {
    return <ForgotPasswordPage onBack={goToLogin} />
  }

  return (
    <LoginPage
      onCreateAccount={goToRegister}
      onForgotPassword={goToForgotPassword}
      onSignIn={goToDashboard}
    />
  )
}

export default App
