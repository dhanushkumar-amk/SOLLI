import { useEffect, useState } from 'react'
import { getHealth } from './api'
import './App.css'
import DevRoundtrip from './pages/DevRoundtrip'
import VoiceApp from './pages/VoiceApp'

function App() {
  const [connected, setConnected] = useState(false)
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    getHealth().then(() => setConnected(true)).catch(() => setConnected(false))

    const onLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', onLocationChange)
    return () => window.removeEventListener('popstate', onLocationChange)
  }, [])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  const isDev = Boolean(import.meta.env.DEV)

  return (
    <div>
      {/* Dev Navigation Bar (Visible only in development mode) */}
      {isDev && (
        <nav
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            padding: '0.5rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
          }}
        >
          <span>
            <strong>Solli DEV</strong> — Route: <code>{currentPath}</code>
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: currentPath === '/' ? '#3b82f6' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/app')}
              style={{
                background: currentPath === '/app' ? '#3b82f6' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              /app (Voice Form)
            </button>
            <button
              type="button"
              onClick={() => navigate('/dev/roundtrip')}
              style={{
                background: currentPath === '/dev/roundtrip' ? '#3b82f6' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              /dev/roundtrip
            </button>
          </div>
        </nav>
      )}

      {/* Route matching */}
      {currentPath === '/app' ? (
        <VoiceApp />
      ) : isDev && currentPath === '/dev/roundtrip' ? (
        <DevRoundtrip />
      ) : (
        <main className="welcome">
          <section aria-labelledby="solli-title">
            <p className="eyebrow">Voice form helper</p>
            <h1 id="solli-title">Solli</h1>
            <p className="tagline">Just say it. We&apos;ll fill the form.</p>
            <p className={`status ${connected ? 'connected' : 'offline'}`} role="status">
              {connected ? 'Server connected' : 'Server not reachable'}
            </p>
            <p style={{ marginTop: '2rem' }}>
              <button
                type="button"
                onClick={() => navigate('/app')}
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  padding: '1rem 2rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                }}
              >
                Open Voice Form Helper (/app) →
              </button>
            </p>
            {isDev && (
              <p style={{ marginTop: '1.5rem' }}>
                <a
                  href="/dev/roundtrip"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/dev/roundtrip')
                  }}
                  style={{
                    color: '#64748b',
                    fontSize: '0.9rem',
                    textDecoration: 'underline',
                  }}
                >
                  Go to /dev/roundtrip (Prisma & Timbre Tester) →
                </a>
              </p>
            )}
          </section>
        </main>
      )}
    </div>
  )
}

export default App
