import { useEffect, useState } from 'react'
import LoginPage from './features/auth/LoginPage.jsx'
import RegisterPage from './features/auth/RegisterPage.jsx'
import './App.css'

function App() {
  const [page, setPage] = useState(() =>
    window.location.hash === '#register' ? 'register' : 'login',
  )

  useEffect(() => {
    const handleHashChange = () => {
      setPage(window.location.hash === '#register' ? 'register' : 'login')
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

  return page === 'register' ? (
    <RegisterPage onSignIn={goToLogin} />
  ) : (
    <LoginPage onCreateAccount={goToRegister} />
  )
}

export default App
