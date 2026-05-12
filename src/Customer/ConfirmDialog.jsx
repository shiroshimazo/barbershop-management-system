export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
  children,
}) {
  return (
    <div className="customer-modal-backdrop" role="presentation">
      <section
        aria-modal="true"
        className="customer-logout-modal customer-confirm-modal"
        role="dialog"
      >
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {children}
        <div className="customer-modal-actions">
          <button
            className="customer-button customer-button-cancel"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className="customer-button customer-button-primary"
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
