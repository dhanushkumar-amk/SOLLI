import DemoBanner from './components/DemoBanner'
import { IS_DEMO_MODE } from './config'
import VoiceApp from './pages/VoiceApp'

function App() {
  return (
    <div className="app-root">
      {IS_DEMO_MODE && <DemoBanner />}
      <VoiceApp />
    </div>
  )
}

export default App
