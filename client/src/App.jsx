import { useEffect, useState } from 'react'
import { getHealth } from './api'
import './App.css'

function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    getHealth().then(() => setConnected(true)).catch(() => setConnected(false))
  }, [])

  return <main className="welcome">
    <section aria-labelledby="solli-title">
      <p className="eyebrow">Voice form helper</p>
      <h1 id="solli-title">Solli</h1>
      <p className="tagline">Just say it. We&apos;ll fill the form.</p>
      <p className={`status ${connected ? 'connected' : 'offline'}`} role="status">
        {connected ? 'Server connected' : 'Server not reachable'}
      </p>
    </section>
  </main>
}

export default App
