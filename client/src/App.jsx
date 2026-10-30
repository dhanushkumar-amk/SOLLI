import { lazy, Suspense, useEffect, useState } from 'react'
import DemoBanner from './components/DemoBanner'
import { IS_DEMO_MODE } from './config'
import VoiceApp from './pages/VoiceApp'

// Lazy load dev routes strictly in DEV mode
const DevCollect = import.meta.env.DEV ? lazy(() => import('./pages/DevCollect')) : null
const DevRoundtrip = import.meta.env.DEV ? lazy(() => import('./pages/DevRoundtrip')) : null

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
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

  return (
    <div>
      {/* Sticky Demo Mode Banner (Active when VITE_DEMO_MODE=true) */}
      {IS_DEMO_MODE && <DemoBanner />}

      {/* Dev Navigation Bar (Dead-code eliminated in production builds) */}
      {import.meta.env.DEV && (
        <nav
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            padding: '0.4rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
          }}
          aria-label="Developer mode navigation"
        >
          <span>
            <strong>Solli DEV</strong> — Route: <code>{currentPath}</code>
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/app')}
              style={{
                background: currentPath === '/' || currentPath === '/app' ? '#2563eb' : '#334155',
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
                background: currentPath === '/dev/roundtrip' ? '#2563eb' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              /dev/roundtrip
            </button>
            <button
              type="button"
              onClick={() => navigate('/dev/collect')}
              style={{
                background: currentPath === '/dev/collect' ? '#2563eb' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              /dev/collect
            </button>
          </div>
        </nav>
      )}

      {/* Primary Voice Form Route */}
      {currentPath === '/app' || currentPath === '/' ? (
        <VoiceApp />
      ) : import.meta.env.DEV && currentPath === '/dev/collect' && DevCollect ? (
        <Suspense fallback={<div style={{ padding: '2rem' }}>Loading DevCollect...</div>}>
          <DevCollect />
        </Suspense>
      ) : import.meta.env.DEV && currentPath === '/dev/roundtrip' && DevRoundtrip ? (
        <Suspense fallback={<div style={{ padding: '2rem' }}>Loading DevRoundtrip...</div>}>
          <DevRoundtrip />
        </Suspense>
      ) : (
        <VoiceApp />
      )}
    </div>
  )
}

export default App
