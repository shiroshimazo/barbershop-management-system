import { useEffect, useMemo, useState } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import Toast from '../../components/Toast.jsx'

function EyeIcon({ isVisible }) {
  return (
    <svg
      aria-hidden="true"
      className="auth-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {isVisible ? (
        <>
          <path
            d="M2.75 12S6 5.75 12 5.75 21.25 12 21.25 12 18 18.25 12 18.25 2.75 12 2.75 12Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14.75A2.75 2.75 0 1 0 12 9.25a2.75 2.75 0 0 0 0 5.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </>
      ) : (
        <>
          <path
            d="M3.5 3.5 20.5 20.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M9.4 5.95A8.1 8.1 0 0 1 12 5.5C18 5.5 21.25 12 21.25 12a16.6 16.6 0 0 1-2.7 3.55M14.1 18.2a8.35 8.35 0 0 1-2.1.3C6 18.5 2.75 12 2.75 12a16.75 16.75 0 0 1 4.1-4.75"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.15 10.15a2.75 2.75 0 0 0 3.7 3.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="google-icon"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.6 12.23c0-.76-.07-1.48-.19-2.18H12v4.13h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.47Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.59-4.11H3.07v2.58A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.91A6 6 0 0 1 6.1 12c0-.66.11-1.3.31-1.91V7.51H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.49l3.34-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.51l3.34 2.58C7.2 7.73 9.4 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage({ onCreateAccount, onForgotPassword }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const shouldReduceMotion = useReducedMotion()
  const headingControls = useAnimationControls()
  const formControls = useAnimationControls()

  const softTransition = useMemo(
    () => ({
      duration: shouldReduceMotion ? 0 : 0.85,
      ease: [0.22, 1, 0.36, 1],
    }),
    [shouldReduceMotion],
  )

  const slideAnimation = useMemo(
    () => (shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }),
    [shouldReduceMotion],
  )

  const headingStart = useMemo(
    () => (shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -36 }),
    [shouldReduceMotion],
  )

  const formStart = useMemo(
    () => (shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 36 }),
    [shouldReduceMotion],
  )

  useEffect(() => {
    headingControls.set(headingStart)
    formControls.set(formStart)

    headingControls.start({
      ...slideAnimation,
      transition: softTransition,
    })

    formControls.start({
      ...slideAnimation,
      transition: { ...softTransition, delay: shouldReduceMotion ? 0 : 0.32 },
    })
  }, [
    headingControls,
    headingStart,
    formControls,
    formStart,
    shouldReduceMotion,
    slideAnimation,
    softTransition,
  ])

  const handleSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')?.toString().trim()
    const password = formData.get('password')?.toString().trim()

    if (!email || !password) {
      setToastMessage('Please fill in all text fields.')
    }
  }

  return (
    <main className="auth-page">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      <section className="brand-panel" aria-label="Barbershop workspace">
        <div className="brand-content">
          <motion.h2 initial={headingStart} animate={headingControls}>
            Keep every chair booked and every visit easy to manage.
          </motion.h2>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="login-heading">
        <motion.form
          className="login-form"
          initial={formStart}
          animate={formControls}
          onSubmit={handleSubmit}
        >
          <div className="form-heading">
            <h1 id="login-heading">Welcome Back</h1>
            <p>
              Sign in to Book your next cut, manage upcoming visits, and keep
              track your barber.
            </p>
          </div>

          <label className="field-group" htmlFor="email">
            <span>Email</span>
            <input id="email" name="email" type="email" placeholder="your@email" />
          </label>

          <label className="field-group" htmlFor="password">
            <span>Password</span>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="*******"
              />
              <button
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                className="icon-button"
                type="button"
                onClick={() => setIsPasswordVisible((current) => !current)}
              >
                <EyeIcon isVisible={isPasswordVisible} />
              </button>
            </div>
          </label>

          <div className="form-options">
            <label className="check-option" htmlFor="keep-signed-in">
              <input id="keep-signed-in" name="remember" type="checkbox" />
              <span>Keep me signed in</span>
            </label>
            <a
              href="#forgot-password"
              onClick={(event) => {
                event.preventDefault()
                onForgotPassword?.()
              }}
            >
              Forgot Password?
            </a>
          </div>

          <motion.button
            className="primary-button"
            type="submit"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          >
            Sign In
          </motion.button>

          <div className="divider" aria-label="or continue with">
            <span>or continue with</span>
          </div>

          <motion.button
            className="google-button"
            type="button"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          >
            <GoogleIcon />
            <span>Google</span>
          </motion.button>

          <p className="signup-prompt">
            New Customer?{' '}
            <a
              href="#register"
              onClick={(event) => {
                event.preventDefault()
                onCreateAccount?.()
              }}
            >
              Create an account
            </a>
          </p>
        </motion.form>
      </section>
    </main>
  )
}
