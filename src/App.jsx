import { useEffect, useState } from 'react'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import RegisterPage from './features/auth/RegisterPage.jsx'
import './App.css'

function App() {
  const [page, setPage] = useState(() =>
    window.location.hash === '#register'
      ? 'register'
      : window.location.hash === '#forgot-password'
        ? 'forgot-password'
        : 'login',
  )

  useEffect(() => {
    const handleHashChange = () => {
      setPage(
        window.location.hash === '#register'
          ? 'register'
          : window.location.hash === '#forgot-password'
            ? 'forgot-password'
            : 'login',
      )
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => window.removeEventListener('hashchange', handleHashChange)
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

  if (page === 'register') {
    return <RegisterPage onSignIn={goToLogin} />
  }

  if (page === 'forgot-password') {
    return <ForgotPasswordPage onBack={goToLogin} />
  }

  return <LoginPage onCreateAccount={goToRegister} onForgotPassword={goToForgotPassword} />
}

export default App
