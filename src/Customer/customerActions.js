const BOOKING_DRAFT_KEY = 'bladeco.booking-draft'

function safeWindow() {
  return typeof window !== 'undefined' ? window : null
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function csvEscape(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function formatIcsDate(date) {
  const d = new Date(date)
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function openDirections(location) {
  const win = safeWindow()
  if (!win) return

  const query = encodeURIComponent(`Blade & Co. ${location || 'Downtown'}`)
  win.open(
    `https://www.google.com/maps/search/?api=1&query=${query}`,
    '_blank',
    'noopener,noreferrer',
  )
}

export function downloadCalendarInvite({
  title,
  description,
  location,
  startAt,
  durationMinutes = 45,
  filename,
}) {
  const win = safeWindow()
  if (!win || !startAt) return

  const start = new Date(startAt)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const uid = `${slugify(title)}-${start.getTime()}@bladeco.local`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Blade & Co.//Customer Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${String(title || 'Appointment').replace(/\n/g, ' ')}`,
    `DESCRIPTION:${String(description || '').replace(/\n/g, ' ')}`,
    `LOCATION:${String(location || 'Blade & Co.').replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slugify(filename || title || 'appointment') || 'appointment'}.ics`
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename, rows) {
  const win = safeWindow()
  if (!win || !rows || rows.length === 0) return

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key))
      return set
    }, new Set()),
  )

  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row?.[header])).join(',')),
  ].join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slugify(filename || 'export') || 'export'}.csv`
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function setBookingDraft(draft) {
  const win = safeWindow()
  if (!win) return
  win.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft || {}))
}

export function readBookingDraft() {
  const win = safeWindow()
  if (!win) return null
  const raw = win.sessionStorage.getItem(BOOKING_DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearBookingDraft() {
  const win = safeWindow()
  if (!win) return
  win.sessionStorage.removeItem(BOOKING_DRAFT_KEY)
}
