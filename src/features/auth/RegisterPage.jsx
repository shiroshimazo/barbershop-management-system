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

function getPasswordStrength(password) {
  let score = 0

  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (!password) return { label: '', level: 'empty' }
  if (score <= 1) return { label: 'Weak', level: 'weak' }
  if (score <= 3) return { label: 'Good', level: 'good' }

  return { label: 'Strong', level: 'strong' }
}

export default function RegisterPage({ onSignIn }) {
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const shouldReduceMotion = useReducedMotion()
  const formControls = useAnimationControls()
  const headingControls = useAnimationControls()

  const passwordStrength = getPasswordStrength(password)

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

  const formStart = useMemo(
    () => (shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -36 }),
    [shouldReduceMotion],
  )

  const headingStart = useMemo(
    () => (shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 36 }),
    [shouldReduceMotion],
  )

  useEffect(() => {
    formControls.set(formStart)
    headingControls.set(headingStart)

    formControls.start({
      ...slideAnimation,
      transition: { ...softTransition, delay: shouldReduceMotion ? 0 : 0.32 },
    })

    headingControls.start({
      ...slideAnimation,
      transition: softTransition,
    })
  }, [
    formControls,
    formStart,
    headingControls,
    headingStart,
    shouldReduceMotion,
    slideAnimation,
    softTransition,
  ])

  const handleSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const requiredFields = [
      'fullname',
      'email',
      'phone',
      'password',
      'confirmPassword',
    ]
    const hasEmptyField = requiredFields.some(
      (field) => !formData.get(field)?.toString().trim(),
    )

    if (hasEmptyField) {
      setToastMessage('Please fill in all text fields.')
    }
  }

  return (
    <main className="register-page">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      <section className="auth-panel register-form-panel" aria-labelledby="register-heading">
        <motion.form
          className="login-form register-form"
          initial={formStart}
          animate={formControls}
          onSubmit={handleSubmit}
        >
          <div className="form-heading">
            <h1 id="register-heading">Create Account</h1>
            <p>
              Join to book appointments, track your favorite barber, and get
              reminders before every visit.
            </p>
          </div>

          <label className="field-group" htmlFor="fullname">
            <span>Fullname</span>
            <input id="fullname" name="fullname" type="text" placeholder="Juan Dela Cruz" />
          </label>

          <label className="field-group" htmlFor="register-email">
            <span>Email</span>
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="your@email"
            />
          </label>

          <label className="field-group" htmlFor="phone">
            <span>Phone</span>
            <div className="phone-field">
              <span>+63</span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                pattern="9\d{9}"
                maxLength="10"
                placeholder="9626881002"
                title="Enter the 10 digits after +63, like 9626881002."
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
                }}
              />
            </div>
          </label>

          <label className="field-group" htmlFor="register-password">
            <span>Password</span>
            <div className="password-field">
              <input
                id="register-password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="at least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
            <div className="password-meter" data-strength={passwordStrength.level}>
              <span className="password-meter-track">
                <span className="password-meter-fill" />
              </span>
              <span>{passwordStrength.label}</span>
            </div>
          </label>

          <label className="field-group" htmlFor="confirm-password">
            <span>Confirm Password</span>
            <div className="password-field">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={isConfirmPasswordVisible ? 'text' : 'password'}
                placeholder="Re-enter password"
              />
              <button
                aria-label={
                  isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'
                }
                className="icon-button"
                type="button"
                onClick={() => setIsConfirmPasswordVisible((current) => !current)}
              >
                <EyeIcon isVisible={isConfirmPasswordVisible} />
              </button>
            </div>
          </label>

          <label className="check-option terms-option" htmlFor="terms">
            <input id="terms" name="terms" type="checkbox" />
            <span>
              I agree to the <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>, and consent to receive
              booking reminders.
            </span>
          </label>

          <motion.button
            className="primary-button"
            type="submit"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          >
            Create Account
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
            Already have an account?{' '}
            <a
              href="#login"
              onClick={(event) => {
                event.preventDefault()
                onSignIn?.()
              }}
            >
              Sign in
            </a>
          </p>
        </motion.form>
      </section>

      <section className="brand-panel register-brand-panel" aria-label="Register workspace">
        <div className="brand-content register-brand-content">
          <motion.h2 initial={headingStart} animate={headingControls}>
            Find your chair.
            <br />
            Book your <span>cut.</span>
          </motion.h2>
        </div>
      </section>
    </main>
  )
}
