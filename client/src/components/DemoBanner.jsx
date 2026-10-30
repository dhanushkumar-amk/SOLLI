/**
 * DemoBanner Component
 * Shows a persistent high-contrast banner when VITE_DEMO_MODE is active.
 */
export default function DemoBanner() {
  return (
    <aside
      className="demo-banner"
      role="banner"
      aria-label="Demo mode announcement"
    >
      <span aria-hidden="true">⚠️</span>
      <span lang="en">DEMO — Fake data only, nothing is submitted</span>
      <span aria-hidden="true">•</span>
      <span lang="ta">மாதிரி — போலியான தரவு மட்டுமே, எங்கும் சமர்ப்பிக்கப்படாது</span>
    </aside>
  )
}
