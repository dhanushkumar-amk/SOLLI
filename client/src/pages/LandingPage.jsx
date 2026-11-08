import React from 'react'
import Logo from '../components/Logo'
import {
  Mic,
  ShieldCheck,
  Puzzle,
  Volume2,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Layers,
  Globe2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Clock,
  UserCheck,
} from 'lucide-react'

export default function LandingPage({ onLaunchKiosk }) {
  return (
    <div className="landing-root">
      {/* ── TOP NAV BAR ──────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Logo size={36} />

          <nav className="landing-nav-links">
            <a href="#how-it-works" className="landing-nav-link">
              How it works
            </a>
            <a href="#extension" className="landing-nav-link">
              Extension & Demo
            </a>
            <a href="#multilingual" className="landing-nav-link">
              Languages
            </a>
            <a href="#gnani" className="landing-nav-link">
              Built on Gnani AI
            </a>
            <a href="#about" className="landing-nav-link">
              About
            </a>
          </nav>

          <div className="landing-nav-actions">
            <div className="landing-pill">
              <span className="landing-pill-dot" />
              <span>Independent Prototype</span>
            </div>

            <button
              type="button"
              onClick={onLaunchKiosk}
              className="landing-btn-cta"
            >
              <Mic size={15} />
              <span>Launch Kiosk Demo</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
        <section className="landing-hero">
          <div className="landing-hero-glow" />

          <div className="landing-hero-content">
            <div className="landing-hero-badge">
              <span className="landing-pill-dot" />
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Solli: independent prototype</span>
              <span style={{ color: '#453027' }}>/</span>
              <span>Example Form: IGNOAPS Pension</span>
            </div>

            <h1 className="landing-hero-title">
              Just say it. <br />
              <span className="landing-hero-title-accent">We'll fill the form.</span>
            </h1>

            <p className="landing-hero-sub">
              Solli is a multilingual voice assistant that helps people who find forms hard to read or type fill them in by speaking in their own language.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                onClick={onLaunchKiosk}
                className="landing-btn-cta landing-btn-cta-lg"
              >
                <Mic size={18} />
                <span>Try Voice Form Demo — IGNOAPS</span>
                <ArrowRight size={17} />
              </button>

              <a href="#extension" className="landing-btn-ghost">
                <Puzzle size={17} style={{ color: '#FF6D29' }} />
                <span>Planned Browser Extension</span>
              </a>
            </div>

            {/* ── LIVE INTERACTIVE SIMULATION MOCKUP ──────────────────────────── */}
            <div className="landing-mockup-wrap">
              <div className="landing-mockup">
                <div className="landing-mockup-head">
                  <div className="landing-mockup-status">
                    <span className="landing-pill-dot" />
                    <span>Live Spoken Voice Assistant Demo</span>
                  </div>
                  <div className="landing-mockup-lang">
                    <span>ta-IN / en-IN (Tanglish)</span>
                  </div>
                </div>

                <div className="landing-mockup-body">
                  {/* Solli Prompt */}
                  <div className="landing-bubble landing-bubble-solli">
                    <div className="landing-bubble-label">
                      <Volume2 size={14} />
                      <span>Solli asks aloud:</span>
                    </div>
                    <p className="landing-bubble-text">
                      "உங்கள் பிறந்த தேதி என்ன?"
                    </p>
                    <p className="landing-bubble-sub">
                      What is your date of birth?
                    </p>
                  </div>

                  {/* Citizen Voice Response */}
                  <div className="landing-bubble landing-bubble-user">
                    <div className="landing-bubble-label" style={{ color: '#BABABA' }}>
                      <Mic size={14} style={{ color: '#FF6D29' }} />
                      <span>Citizen speaks naturally:</span>
                    </div>
                    <p className="landing-bubble-text" style={{ color: '#ffffff' }}>
                      "15 August 1958"
                    </p>
                  </div>

                  {/* Acoustic Telemetry Visualizer */}
                  <div className="landing-telemetry-row">
                    <div className="landing-telemetry-bars">
                      {[6, 12, 18, 14, 20, 16, 10, 18, 12, 16, 8, 4].map((h, i) => (
                        <span
                          key={i}
                          className="landing-t-bar"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                    <span className="landing-telemetry-text">
                      12-Bar Acoustic Telemetry Active · Auto-Normalized to 15/08/1958
                    </span>
                  </div>

                  {/* Verified Field Row */}
                  <div className="landing-mockup-field">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#BABABA' }}>05. Date of Birth:</span>
                      <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>15/08/1958</strong>
                    </div>
                    <span style={{ color: '#FF6D29', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── STATS STRIP ─────────────────────────────────────────────────── */}
            <div className="landing-stats-grid">
              <div className="landing-stat-card">
                <div className="landing-stat-val">436 / 436</div>
                <div className="landing-stat-label">Automated Tests Passing (100%)</div>
              </div>
              <div className="landing-stat-card">
                <div className="landing-stat-val landing-stat-val-accent">Tamil & English</div>
                <div className="landing-stat-label">Thoroughly Tested Speech</div>
              </div>
              <div className="landing-stat-card">
                <div className="landing-stat-val">10 Languages</div>
                <div className="landing-stat-label">Voice & Text Available</div>
              </div>
              <div className="landing-stat-card">
                <div className="landing-stat-val landing-stat-val-accent">Zero Storage</div>
                <div className="landing-stat-label">Volatile Memory · Fake Test Data Only</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 1. THE PROBLEM & 2. THE SOLUTION ───────────────────────────────── */}
        <section className="landing-section">
          <div className="landing-container">
            <div className="landing-problem-grid">
              {/* Problem */}
              <div className="landing-ps-card">
                <div className="landing-ps-icon">
                  <AlertCircle size={22} style={{ color: '#e11d48' }} />
                </div>
                <h2 className="landing-ps-title">1. The Problem</h2>
                <p className="landing-ps-text">
                  Many people miss pensions, scholarships and welfare benefits because of paperwork, not ineligibility. Forms are long, written in formal bureaucratic language, and rarely match the language spoken at home.
                </p>
                <ul className="landing-ps-list">
                  <li className="landing-ps-item">
                    <span style={{ color: '#e11d48', fontWeight: 700 }}>✕</span>
                    <span><strong>Elderly & Low-Vision Barrier:</strong> Millions cannot comfortably read dense small print or type on virtual keyboards.</span>
                  </li>
                  <li className="landing-ps-item">
                    <span style={{ color: '#e11d48', fontWeight: 700 }}>✕</span>
                    <span><strong>Middlemen & Exploitation:</strong> Applicants depend on cyber café operators who charge predatory fees and make clerical errors.</span>
                  </li>
                  <li className="landing-ps-item">
                    <span style={{ color: '#e11d48', fontWeight: 700 }}>✕</span>
                    <span><strong>Monolingual Digital Portals:</strong> Most public form tools only support one or two formal languages.</span>
                  </li>
                </ul>
              </div>

              {/* Solution */}
              <div className="landing-ps-card landing-ps-card-solution">
                <div className="landing-ps-icon landing-ps-icon-solution">
                  <Sparkles size={22} />
                </div>
                <h2 className="landing-ps-title">2. The Solution</h2>
                <p className="landing-ps-text">
                  Solli turns form filling into a natural spoken conversation. The applicant chooses their language, and Solli speaks each question aloud. The person simply speaks back to answer.
                </p>
                <ul className="landing-ps-list">
                  <li className="landing-ps-item">
                    <CheckCircle2 size={16} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Conversational Spoken Flow:</strong> Questions are spoken aloud in a friendly voice, accepting mixed colloquial speech.</span>
                  </li>
                  <li className="landing-ps-item">
                    <CheckCircle2 size={16} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Automatic Field Extraction:</strong> Spoken numbers, dates, and names are cleaned and populated directly into fields.</span>
                  </li>
                  <li className="landing-ps-item">
                    <CheckCircle2 size={16} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Acoustic Read-Back Confirmation:</strong> Critical values are read back in grouped chunks for vocal confirmation.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. HOW IT WORKS (PIPELINE) ───────────────────────────────────────── */}
        <section id="how-it-works" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-head">
              <span className="landing-tag">Conversational Pipeline</span>
              <h2 className="landing-section-title">3. How It Works</h2>
              <p className="landing-section-desc">
                From opening greeting to final printable receipt, Solli guides applicants step by step without typing.
              </p>
            </div>

            <div className="landing-steps-grid">
              <div className="landing-step-card">
                <div className="landing-step-num">01</div>
                <h3 className="landing-step-title">Choose Language</h3>
                <p className="landing-step-desc">
                  Pick from 10 Indian languages (or Tanglish). Screen text and spoken voice switch instantly.
                </p>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-num">02</div>
                <h3 className="landing-step-title">Solli Asks Aloud</h3>
                <p className="landing-step-desc">
                  Each question is spoken aloud in a natural, friendly Indic voice powered by Gnani AI.
                </p>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-num">03</div>
                <h3 className="landing-step-title">Answer Naturally</h3>
                <p className="landing-step-desc">
                  Speak freely, including mixed conversational speech such as Tamil-English or Hindi-English.
                </p>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-num">04</div>
                <h3 className="landing-step-title">Understand & Clean</h3>
                <p className="landing-step-desc">
                  Spoken numbers ("double five", lakh), dates, and vernacular words become verified values.
                </p>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-num">05</div>
                <h3 className="landing-step-title">Audio Read-Back</h3>
                <p className="landing-step-desc">
                  Phone, Aadhaar, and bank account numbers are read back in small groups with clear pauses.
                </p>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-num">06</div>
                <h3 className="landing-step-title">Voice Control</h3>
                <p className="landing-step-desc">
                  Say "repeat", "go back", "skip", or "change field" at any time to steer the conversation.
                </p>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-num">07</div>
                <h3 className="landing-step-title">Ledger Review</h3>
                <p className="landing-step-desc">
                  Inspect the complete verified form on screen. Edit any field with one tap or by voice.
                </p>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-num">08</div>
                <h3 className="landing-step-title">Printable Receipt</h3>
                <p className="landing-step-desc">
                  Generate an official-format PDF receipt, and memory is purged clean immediately after.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. MULTILINGUAL BY DESIGN ────────────────────────────────────────── */}
        <section id="multilingual" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head">
              <span className="landing-tag">Vernacular Voice Support</span>
              <h2 className="landing-section-title">4. Multilingual by Design</h2>
              <p className="landing-section-desc">
                One unified form definition powers every language. Adding a language means adding text and rules, not rebuilding the app.
              </p>
            </div>

            {/* Language Chips */}
            <div className="landing-lang-grid">
              <div className="landing-lang-chip landing-lang-chip-tested">
                <div className="landing-lang-name">தமிழ் (Tamil)</div>
                <div className="landing-lang-tag" style={{ color: '#FF6D29', fontWeight: 600 }}>Thoroughly Tested</div>
              </div>

              <div className="landing-lang-chip landing-lang-chip-tested">
                <div className="landing-lang-name">English (Indian)</div>
                <div className="landing-lang-tag" style={{ color: '#FF6D29', fontWeight: 600 }}>Thoroughly Tested</div>
              </div>

              <div className="landing-lang-chip landing-lang-chip-tested">
                <div className="landing-lang-name">Tanglish (Mixed)</div>
                <div className="landing-lang-tag" style={{ color: '#FF6D29', fontWeight: 600 }}>Thoroughly Tested</div>
              </div>

              <div className="landing-lang-chip">
                <div className="landing-lang-name">हिंदी (Hindi)</div>
                <div className="landing-lang-tag">Preview</div>
              </div>

              <div className="landing-lang-chip">
                <div className="landing-lang-name">తెలుగు (Telugu)</div>
                <div className="landing-lang-tag">Preview</div>
              </div>

              <div className="landing-lang-chip">
                <div className="landing-lang-name">ಕನ್ನಡ (Kannada)</div>
                <div className="landing-lang-tag">Preview</div>
              </div>

              <div className="landing-lang-chip">
                <div className="landing-lang-name">മലയാളം (Malayalam)</div>
                <div className="landing-lang-tag">Preview</div>
              </div>

              <div className="landing-lang-chip">
                <div className="landing-lang-name">বাংলা (Bengali)</div>
                <div className="landing-lang-tag">Preview</div>
              </div>

              <div className="landing-lang-chip">
                <div className="landing-lang-name">मराठी (Marathi)</div>
                <div className="landing-lang-tag">Preview</div>
              </div>

              <div className="landing-lang-chip">
                <div className="landing-lang-name">ગુજરાતી (Gujarati)</div>
                <div className="landing-lang-tag">Preview</div>
              </div>
            </div>

            {/* Honest Testing Note Callout */}
            <div className="landing-note-callout">
              <HelpCircle size={22} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>Honest Testing Notice</strong>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#BABABA', lineHeight: 1.6 }}>
                  "Solli's voice and screen text are available in 10 Indian languages. Speech understanding was tested most thoroughly in <strong style={{ color: '#ffffff' }}>Tamil and English (including Tanglish)</strong>. Other languages are an early preview, and accuracy may vary."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── EXTENSION & LIVE DEMO SECTION ───────────────────────────────────── */}
        <section id="extension" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-ext-box">
              <div>
                <div className="landing-pill" style={{ marginBottom: '1rem', borderColor: 'rgba(255,109,41,0.4)' }}>
                  <Puzzle size={13} style={{ color: '#FF6D29' }} />
                  <span style={{ color: '#FF6D29' }}>Roadmap: Browser Extension (Planned)</span>
                </div>

                <h2 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ffffff', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
                  Universal Voice Input on Any Web Form
                </h2>

                <p style={{ color: '#BABABA', fontSize: '0.9375rem', lineHeight: 1.65, margin: '0 0 1.25rem' }}>
                  Solli is being developed as a Chrome Extension side panel that scans the input fields of any web form (Google Forms, e-Sevai, or university portals) and lets the applicant fill them by voice, with a match table showing confirmed values. It never submits automatically.
                </p>

                <div style={{ padding: '0.85rem 1.15rem', borderRadius: '10px', background: '#161316', border: '1px solid #453027', fontSize: '0.8125rem', color: '#BABABA' }}>
                  <strong style={{ color: '#ffffff' }}>Example Form Demo:</strong> Below, you can test the complete voice-filling experience using the <span style={{ color: '#FF6D29' }}>Indira Gandhi National Old Age Pension (IGNOAPS)</span> form as our example schema.
                </div>
              </div>

              <div className="landing-ext-demo-card">
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#272024', border: '1px solid #453027', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6D29', margin: '0 auto 1rem' }}>
                  <Mic size={24} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', margin: '0 0 0.4rem' }}>
                  Launch Kiosk Demo
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#BABABA', margin: '0 0 1.25rem' }}>
                  Experience bilingual spoken questions, answers, and readback.
                </p>
                <button
                  type="button"
                  onClick={onLaunchKiosk}
                  className="landing-btn-cta"
                  style={{ width: '100%' }}
                >
                  <span>Open Voice Demo</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. BUILT ON GNANI AI ────────────────────────────────────────────── */}
        <section id="gnani" className="landing-section">
          <div className="landing-container" style={{ maxWidth: '860px' }}>
            <div className="landing-section-head">
              <span className="landing-tag">Speech Intelligence</span>
              <h2 className="landing-section-title">7. Built on Gnani AI</h2>
              <p className="landing-section-desc">
                Leveraging Gnani AI's specialized Indic acoustic models for conversational accuracy.
              </p>
            </div>

            <div className="landing-table-wrap">
              <div className="landing-table-row">
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '0.9375rem' }}>Prisma v2.5</strong>
                  <span className="landing-pill" style={{ marginLeft: '8px', background: 'rgba(255,109,41,0.12)', color: '#FF6D29', borderColor: 'rgba(255,109,41,0.3)' }}>Active</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#BABABA' }}>
                  Speech to text: understands the applicant's spoken answers in regional languages
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', fontFamily: 'monospace', color: '#FF6D29' }}>
                  STT Engine
                </div>
              </div>

              <div className="landing-table-row">
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '0.9375rem' }}>Timbre v3.0</strong>
                  <span className="landing-pill" style={{ marginLeft: '8px', background: 'rgba(255,109,41,0.12)', color: '#FF6D29', borderColor: 'rgba(255,109,41,0.3)' }}>Active</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#BABABA' }}>
                  Text to speech: speaks the questions and read-backs in natural voices (Chetana / Kalpana)
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', fontFamily: 'monospace', color: '#FF6D29' }}>
                  TTS Engine
                </div>
              </div>

              <div className="landing-table-row" style={{ background: '#191417' }}>
                <div>
                  <strong style={{ color: '#BABABA', fontSize: '0.9375rem' }}>Evon v3.3</strong>
                  <span className="landing-pill" style={{ marginLeft: '8px' }}>Planned</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#BABABA' }}>
                  Answer extraction currently uses a rule-based engine, and Evon LLM integration is planned.
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', fontFamily: 'monospace', color: '#BABABA' }}>
                  LLM Layer
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: '#BABABA' }}>
              The Gnani API key stays on the server and is never exposed to the browser.
            </p>
          </div>
        </section>

        {/* ── 9. PRIVACY, SAFETY AND HONESTY ──────────────────────────────────── */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container" style={{ maxWidth: '860px' }}>
            <div style={{ padding: '1.75rem 2rem', borderRadius: '16px', background: '#1F191D', border: '1px solid #453027' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ShieldCheck size={18} style={{ color: '#FF6D29' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  9. Privacy, Safety and Honesty Notice
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.8125rem', color: '#BABABA', lineHeight: 1.55 }}>
                <div style={{ padding: '0.75rem 1rem', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }}>
                  <strong style={{ color: '#ffffff' }}>Zero Data Stored:</strong> Answers exist only in memory during the session and are wiped after inactivity or when the session ends.
                </div>
                <div style={{ padding: '0.75rem 1rem', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }}>
                  <strong style={{ color: '#ffffff' }}>Fake Data Only:</strong> All demos and tests use synthetic fake data only.
                </div>
                <div style={{ padding: '0.75rem 1rem', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }}>
                  <strong style={{ color: '#ffffff' }}>Format Checking Only:</strong> Solli does not verify Aadhaar, phone or bank details against databases. It checks format only.
                </div>
                <div style={{ padding: '0.75rem 1rem', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }}>
                  <strong style={{ color: '#ffffff' }}>No Government Submissions:</strong> Solli prepares the form for a human operator. It is an independent student prototype, not an official government service.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 12. ABOUT ───────────────────────────────────────────────────────── */}
        <section id="about" className="landing-section" style={{ textAlign: 'center' }}>
          <div className="landing-container" style={{ maxWidth: '640px' }}>
            <span className="landing-tag">Project Background</span>
            <h2 className="landing-section-title">12. About Solli</h2>
            <p className="landing-section-desc" style={{ fontSize: '1rem', marginTop: '0.75rem' }}>
              Built by <strong style={{ color: '#ffffff' }}>Dhanushkumar G</strong> as a solo project for the{' '}
              <strong style={{ color: '#ffffff' }}>Great Indian AI Internship Challenge</strong>, using Gnani AI's models.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem', fontSize: '0.8125rem', color: '#FF6D29', fontFamily: 'monospace' }}>
              <span>#GnaniAI</span>
              <span>•</span>
              <span>#GreatIndianAIInternshipChallenge</span>
            </div>

            <div style={{ marginTop: '2.5rem' }}>
              <button
                type="button"
                onClick={onLaunchKiosk}
                className="landing-btn-cta landing-btn-cta-lg"
              >
                <Mic size={18} />
                <span>Launch Voice Form Demo</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #453027', background: '#161316', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: '#BABABA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Logo size={26} showSub={false} />
            <span>· Multilingual Voice Assistant (Independent Prototype)</span>
          </div>
          <div>
            <span>436 Automated Tests Passing (100%)</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
