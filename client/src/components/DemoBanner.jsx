import { IconAlert } from './Icons'

/**
 * DemoBanner Component
 * Shows a persistent compact banner when VITE_DEMO_MODE is active.
 */
export default function DemoBanner() {
  return (
    <aside
      className="demo-banner"
      role="banner"
      aria-label="Demo mode announcement"
    >
      <IconAlert size={15} className="shrink-0" />
      <span lang="en">Demo. Fake data only, nothing is submitted.</span>
      <span lang="ta">மாதிரி. போலியான தரவு மட்டுமே, எங்கும் சமர்ப்பிக்கப்படாது.</span>
    </aside>
  )
}
