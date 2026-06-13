import { Link, Navigate, Route, Routes } from 'react-router'
import './App.css'

function DashboardPage() {
  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">UMKM ERP</p>
        <h1>Operations Dashboard</h1>
        <p className="summary">
          Core workspace for sales, purchasing, inventory, accounting, and POS operations.
        </p>
      </section>

      <section className="status-grid" aria-label="Phase 0 status">
        <article>
          <span>Phase</span>
          <strong>0</strong>
          <p>Project foundation</p>
        </article>
        <article>
          <span>Frontend</span>
          <strong>Vite</strong>
          <p>React TypeScript workspace</p>
        </article>
        <article>
          <span>Routing</span>
          <strong>Ready</strong>
          <p>Base routes are configured</p>
        </article>
      </section>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">404</p>
        <h1>Page Not Found</h1>
        <p className="summary">The requested ERP workspace page does not exist.</p>
        <Link className="text-link" to="/">
          Back to dashboard
        </Link>
      </section>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
