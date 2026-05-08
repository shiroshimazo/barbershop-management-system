import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined

    const timeoutId = window.setTimeout(onClose, 2600)

    return () => window.clearTimeout(timeoutId)
  }, [message, onClose])

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          role="alert"
          className="toast"
          initial={{ opacity: 0, x: '-50%', y: -12 }}
          animate={{ opacity: 1, x: '-50%', y: 0 }}
          exit={{ opacity: 0, x: '-50%', y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
