export default function AdminPage({ session, onLogout }) {
  const email = session?.user?.email || 'admin'
  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-mark">B</span>
          <strong>BLADE &amp; CO. — Admin</strong>
        </div>
        <div className="admin-topbar-right">
          <span className="admin-user">{email}</span>
          <button className="admin-logout" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <section className="admin-body" aria-label="Admin workspace">
        {/* Intentionally blank — workspace will be built out here. */}
      </section>
    </main>
  )
}
