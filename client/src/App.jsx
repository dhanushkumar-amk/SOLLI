import React, { useState, useEffect } from 'react'
import DemoBanner from './components/DemoBanner'
import { IS_DEMO_MODE } from './config'
import LandingPage from './pages/LandingPage'
import VoiceApp from './pages/VoiceApp'

function App() {
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const search = window.location.search
      const hash = window.location.hash
      if (search.includes('kiosk=1') || search.includes('kiosk=true') || hash === '#kiosk') {
        return 'kiosk'
      }
    }
    return 'landing'
  }

  const [view, setView] = useState(getInitialView)

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#kiosk') {
        setView('kiosk')
      } else if (window.location.hash === '#landing' || !window.location.hash) {
        setView('landing')
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleLaunchKiosk = () => {
    setView('kiosk')
    if (typeof window !== 'undefined') {
      window.location.hash = 'kiosk'
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToLanding = () => {
    setView('landing')
    if (typeof window !== 'undefined') {
      window.location.hash = ''
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="app-root min-h-screen bg-[#161316]">
      {IS_DEMO_MODE && <DemoBanner />}
      {view === 'landing' ? (
        <LandingPage onLaunchKiosk={handleLaunchKiosk} />
      ) : (
        <VoiceApp onBackToLanding={handleBackToLanding} />
      )}
    </div>
  )
}

export default App
