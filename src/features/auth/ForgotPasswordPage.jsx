import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="M12 14.75A2.75 2.75 0 1 0 12 9.25a2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.8" />
        </>
      ) : (
        <>
          <path d="M3.5 3.5 20.5 20.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path
            d="M9.4 5.95A8.1 8.1 0 0 1 12 5.5C18 5.5 21.25 12 21.25 12a16.6 16.6 0 0 1-2.7 3.55M14.1 18.2a8.35 8.35 0 0 1-2.1.3C6 18.5 2.75 12 2.75 12a16.75 16.75 0 0 1 4.1-4.75"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="M10.15 10.15a2.75 2.75 0 0 0 3.7 3.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </>
      )}
    </svg>
  )
}

function MailIcon() {
  return (
    <svg aria-hidden="true" className="field-icon" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.75 6.75h14.5v10.5H4.75V6.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m5.5 7.5 6.5 5 6.5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="field-icon" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.75 10.75h10.5v8H6.75v-8Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M8.75 10.75V8.5a3.25 3.25 0 0 1 6.5 0v2.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
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

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(Array(6).fill(''))
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState(1)
  const [toastMessage, setToastMessage] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(30)
  const shouldReduceMotion = useReducedMotion()
  const codeRefs = useRef([])
  const passwordStrength = getPasswordStrength(password)

  const codeValue = code.join('')
  const isEmailLocked = step > 1
  const isCodeActive = step === 2
  const isPasswordActive = step === 3

  const formMotion = useMemo(
    () => ({
      initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
      animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
      transition: { duration: shouldReduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] },
    }),
    [shouldReduceMotion],
  )

  useEffect(() => {
    if (!isCodeActive || resendSeconds <= 0) return undefined

    const timeoutId = window.setTimeout(() => {
      setResendSeconds((current) => current - 1)
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [isCodeActive, resendSeconds])

  useEffect(() => {
    if (step === 2 && codeValue.length === 6) {
      window.setTimeout(() => setStep(3), 180)
    }
  }, [codeValue, step])

  const handleSendEmail = () => {
    if (!email.trim()) {
      setToastMessage('Please enter your email.')
      return
    }

    setStep(2)
    setResendSeconds(30)
    window.setTimeout(() => codeRefs.current[0]?.focus(), 60)
  }

  const handleCodeChange = (index, value) => {
    if (!isCodeActive) return

    const digit = value.replace(/\D/g, '').slice(-1)
    const nextCode = [...code]
    nextCode[index] = digit
    setCode(nextCode)

    if (digit && index < codeRefs.current.length - 1) {
      codeRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (event) => {
    if (!isCodeActive) return

    event.preventDefault()
    const pastedCode = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)

    if (!pastedCode) return

    const nextCode = Array(6).fill('')
    pastedCode.split('').forEach((digit, index) => {
      nextCode[index] = digit
    })
    setCode(nextCode)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (step < 3) {
      setToastMessage('Please complete the current step first.')
      return
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setToastMessage('Please fill in all text fields.')
      return
    }

    if (password !== confirmPassword) {
      setToastMessage('Passwords do not match.')
    }
  }

  return (
    <main className="forgot-page">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      <motion.form
        className="forgot-form"
        onSubmit={handleSubmit}
        initial={formMotion.initial}
        animate={formMotion.animate}
        transition={formMotion.transition}
      >
        <button
          aria-label="Back to sign in"
          className="back-button"
          type="button"
          onClick={onBack}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path
              d="M14.75 6.75 9.5 12l5.25 5.25"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.9"
            />
          </svg>
        </button>

        <div className="forgot-heading">
          <h1>Reset Password</h1>
          <p>Verify your email, then set a new password.</p>
        </div>

        <div className="step-progress" data-step={step} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <label className="field-group forgot-field" htmlFor="forgot-email">
          <span>Email</span>
          <div className="inline-action-field">
            <div className="icon-field">
              <MailIcon />
              <input
                id="forgot-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                disabled={isEmailLocked}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button type="button" disabled={isEmailLocked} onClick={handleSendEmail}>
              Send
            </button>
          </div>
        </label>

        <div className="forgot-field">
          <span className="forgot-label">Verification Code</span>
          <div className="code-grid" onPaste={handleCodePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  codeRefs.current[index] = element
                }}
                aria-label={`Verification code digit ${index + 1}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                disabled={!isCodeActive}
                onChange={(event) => handleCodeChange(index, event.target.value)}
                onKeyDown={(event) => handleCodeKeyDown(index, event)}
              />
            ))}
          </div>
          <div className="code-help">
            <span>Enter the 6-digit code we just sent.</span>
            <button
              type="button"
              disabled={!isCodeActive || resendSeconds > 0}
              onClick={() => setResendSeconds(30)}
            >
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
            </button>
          </div>
        </div>

        <fieldset className="password-reset-fields" disabled={!isPasswordActive}>
          <label className="field-group forgot-field" htmlFor="new-password">
            <span>New Password</span>
            <div className="password-field icon-field">
              <LockIcon />
              <input
                id="new-password"
                name="newPassword"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="At least 8 characters"
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

          <label className="field-group forgot-field" htmlFor="forgot-confirm-password">
            <span>Confirm Password</span>
            <div className="password-field icon-field">
              <LockIcon />
              <input
                id="forgot-confirm-password"
                name="confirmPassword"
                type={isConfirmPasswordVisible ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
        </fieldset>

        <motion.button
          className="primary-button reset-button"
          type="submit"
          disabled={!isPasswordActive}
          whileHover={shouldReduceMotion || !isPasswordActive ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion || !isPasswordActive ? undefined : { scale: 0.98 }}
        >
          Reset Password
        </motion.button>
      </motion.form>

      <p className="support-prompt">
        Need Help? <a href="#contact-support">Contact Support</a>
      </p>
    </main>
  )
}
