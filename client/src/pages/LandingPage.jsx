import React, { useEffect, useRef } from 'react'
import Logo from '../components/Logo'
import { motion } from 'motion/react'
import gsap from 'gsap'
import {
  Mic,
  ShieldCheck,
  Puzzle,
  Volume2,
  CheckCircle2,
  ArrowRight,
  Layers,
  Globe2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Clock,
  FileText,
} from 'lucide-react'

// Reusable sequential animation variants for scroll reveals
const sequentialGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
}

const sequentialCardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const langGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
}

const langCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export default function LandingPage({ onLaunchKiosk }) {
  const statsRef = useRef(null)

  useEffect(() => {
    if (statsRef.current) {
      const cards = statsRef.current.querySelectorAll('.landing-stat-card')
      gsap.fromTo(
        cards,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          delay: 0.2,
        }
      )
    }
  }, [])

  // 16 calibrated acoustic bar heights for the visualizer
  const acousticFrequencies = [6, 12, 18, 14, 20, 16, 10, 18, 12, 16, 8, 4, 12, 18, 10, 6]

  return (
    <div className="landing-root">
      {/* ── TOP NAVIGATION ─────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Logo size={32} />

          <nav className="landing-nav-links">
            <a href="#how-it-works" className="landing-nav-link">
              How it works
            </a>
            <a href="#multilingual" className="landing-nav-link">
              10 Languages
            </a>
            <a href="#extension" className="landing-nav-link">
              Extension preview
            </a>
            <a href="#gnani" className="landing-nav-link">
              Speech engine
            </a>
            <a href="#about" className="landing-nav-link">
              About
            </a>
          </nav>

          <div className="landing-nav-actions">
            <div className="landing-badge">
              <span className="landing-status-dot" aria-hidden="true" />
              <span>Independent prototype</span>
            </div>

            <motion.button
              type="button"
              onClick={onLaunchKiosk}
              className="landing-btn-primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Mic size={15} strokeWidth={1.5} />
              <span>Launch kiosk</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO SECTION WITH TASTEFUL AMBIENT GLOW ──────────────────────── */}
        <section className="landing-hero">
          {/* Subtle Ambient Ember Glow Effect */}
          <div className="landing-hero-glow" aria-hidden="true" />
          <div className="landing-hero-glow-secondary" aria-hidden="true" />

          <div className="landing-hero-inner">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="landing-hero-meta"
            >
              <span className="landing-status-dot" aria-hidden="true" />
              <span style={{ color: '#ffffff' }}>Solli prototype</span>
              <span className="landing-hero-meta-sep">/</span>
              <span>IGNOAPS Pension Form Example</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="landing-hero-title"
            >
              Just say it.{' '}
              <span className="landing-hero-title-accent">We'll fill the form.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="landing-hero-sub"
            >
              A multilingual voice assistant helping citizens who find forms difficult to read or type complete them by speaking in their own language.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="landing-hero-actions"
            >
              <motion.button
                type="button"
                onClick={onLaunchKiosk}
                className="landing-btn-primary landing-btn-hero"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mic size={17} strokeWidth={1.5} />
                <span>Try voice form demo</span>
                <ArrowRight size={16} strokeWidth={1.5} />
              </motion.button>

              <motion.a
                href="#extension"
                className="landing-btn-secondary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Puzzle size={16} strokeWidth={1.5} style={{ color: '#FF6D29' }} />
                <span>Browser extension preview</span>
              </motion.a>
            </motion.div>

            {/* ── PRODUCT PREVIEW MOMENT ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="landing-mockup-frame"
            >
              <div className="landing-mockup-window">
                <div className="landing-mockup-head">
                  <div className="landing-mockup-title">
                    <span className="landing-status-dot" aria-hidden="true" />
                    <span>Spoken session preview</span>
                  </div>
                  <span className="landing-mockup-code">ta-IN / en-IN (Tanglish)</span>
                </div>

                <div className="landing-mockup-body">
                  {/* Solli Prompt */}
                  <div className="landing-dialog-row landing-dialog-solli">
                    <div className="landing-dialog-speaker">
                      <Volume2 size={14} strokeWidth={1.5} />
                      <span>Solli asks</span>
                    </div>
                    <p className="landing-dialog-text">
                      "உங்கள் பிறந்த தேதி என்ன?"
                    </p>
                    <p className="landing-dialog-sub">
                      What is your date of birth?
                    </p>
                  </div>

                  {/* Citizen Voice Response */}
                  <div className="landing-dialog-row landing-dialog-user">
                    <div className="landing-dialog-speaker" style={{ color: '#BABABA' }}>
                      <Mic size={14} strokeWidth={1.5} style={{ color: '#FF6D29' }} />
                      <span>Citizen speaks</span>
                    </div>
                    <p className="landing-dialog-text">
                      "15 August 1958"
                    </p>
                  </div>

                  {/* Acoustic Telemetry Visualizer with Real Motion Waves */}
                  <div className="landing-telemetry-strip">
                    <div className="landing-telemetry-bars" aria-hidden="true">
                      {acousticFrequencies.map((baseH, i) => (
                        <motion.span
                          key={i}
                          className="landing-bar"
                          animate={{
                            height: [
                              baseH,
                              Math.min(22, Math.round(baseH * 1.5 + 2)),
                              Math.max(3, Math.round(baseH * 0.45)),
                              baseH,
                            ],
                          }}
                          transition={{
                            duration: 1.1 + (i % 5) * 0.15,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.05,
                          }}
                        />
                      ))}
                    </div>
                    <span className="landing-telemetry-caption">
                      Acoustic telemetry active · Normalized to 15/08/1958
                    </span>
                  </div>

                  {/* Normalized Field */}
                  <div className="landing-extracted-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#BABABA' }}>05. Date of birth:</span>
                      <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>15/08/1958</strong>
                      <span style={{ color: '#BABABA', fontSize: '12px' }}>(Age 66)</span>
                    </div>
                    <motion.button
                      type="button"
                      onClick={onLaunchKiosk}
                      className="landing-extracted-btn"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle2 size={14} strokeWidth={1.5} />
                      <span>Verified format · Test in kiosk</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── STATS ROW (ANIMATED VIA GSAP) ──────────────────────────────── */}
            <div ref={statsRef} className="landing-stats-grid">
              <div className="landing-stat-card">
                <div className="landing-stat-num">436 / 436</div>
                <div className="landing-stat-desc">Automated tests passing (100%)</div>
              </div>
              <div className="landing-stat-card">
                <div className="landing-stat-num landing-stat-num-accent">Tamil & English</div>
                <div className="landing-stat-desc">Tested with real speech</div>
              </div>
              <div className="landing-stat-card">
                <div className="landing-stat-num">10 Languages</div>
                <div className="landing-stat-desc">Voice and screen text ready</div>
              </div>
              <div className="landing-stat-card">
                <div className="landing-stat-num landing-stat-num-accent">0 Storage</div>
                <div className="landing-stat-desc">In-memory session, synthetic data only</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 1. THE PROBLEM & 2. THE SOLUTION (SEQUENTIAL SCROLL REVEAL) ──── */}
        <section className="landing-section">
          <div className="landing-container">
            <motion.div
              className="landing-ps-grid"
              variants={sequentialGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {/* Problem */}
              <motion.div className="landing-ps-card" variants={sequentialCardVariants}>
                <div className="landing-ps-icon">
                  <AlertCircle size={20} strokeWidth={1.5} style={{ color: '#e11d48' }} />
                </div>
                <h2 className="landing-ps-title">1. The problem</h2>
                <p className="landing-ps-body">
                  Many people miss pensions, scholarships and welfare benefits because of paperwork, not ineligibility. Forms are long, written in formal language, and rarely match the language spoken at home.
                </p>
                <ul className="landing-ps-list">
                  <li className="landing-ps-item">
                    <span style={{ color: '#e11d48', fontWeight: 600 }}>✕</span>
                    <span><strong>Elderly and low-vision barriers:</strong> Millions cannot read dense small print or type on keyboards.</span>
                  </li>
                  <li className="landing-ps-item">
                    <span style={{ color: '#e11d48', fontWeight: 600 }}>✕</span>
                    <span><strong>Middlemen fees:</strong> Applicants depend on third-party operators who charge fees and make clerical mistakes.</span>
                  </li>
                  <li className="landing-ps-item">
                    <span style={{ color: '#e11d48', fontWeight: 600 }}>✕</span>
                    <span><strong>Monolingual portals:</strong> Most public welfare websites only support one or two formal languages.</span>
                  </li>
                </ul>
              </motion.div>

              {/* Solution */}
              <motion.div className="landing-ps-card landing-ps-card-solution" variants={sequentialCardVariants}>
                <div className="landing-ps-icon landing-ps-icon-solution">
                  <CheckCircle2 size={20} strokeWidth={1.5} />
                </div>
                <h2 className="landing-ps-title">2. The solution</h2>
                <p className="landing-ps-body">
                  Solli turns form filling into a natural spoken conversation. The applicant chooses their language, and Solli speaks each question aloud. The person answers by speaking.
                </p>
                <ul className="landing-ps-list">
                  <li className="landing-ps-item">
                    <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Spoken conversation:</strong> Questions are spoken aloud in a friendly Indic voice, accepting mixed Tanglish speech.</span>
                  </li>
                  <li className="landing-ps-item">
                    <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Automatic field extraction:</strong> Spoken numbers, dates, and names are cleaned and filled directly into fields.</span>
                  </li>
                  <li className="landing-ps-item">
                    <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Audio read-back:</strong> Critical values are read back in grouped chunks for spoken or tap confirmation.</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── 3. HOW IT WORKS (ONE-BY-ONE SEQUENTIAL SCROLL ANIMATION) ──────── */}
        <section id="how-it-works" className="landing-section landing-section-alt">
          <div className="landing-container">
            <motion.div
              className="landing-section-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="landing-eyebrow">Step-by-step flow</span>
              <h2 className="landing-section-title">3. How it works</h2>
              <p className="landing-section-desc">
                From opening greeting to final printable receipt, Solli guides applicants step by step without typing.
              </p>
            </motion.div>

            {/* Sequential One-By-One Cascade: 01 to 08 */}
            <motion.div
              className="landing-steps-grid"
              variants={sequentialGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              {[
                { num: '01', icon: Globe2, title: 'Choose language', desc: 'Pick from 10 Indian languages. Screen text and spoken voice switch together.' },
                { num: '02', icon: Volume2, title: 'Solli asks', desc: 'Each question is spoken aloud in a natural, friendly voice powered by Gnani AI.' },
                { num: '03', icon: Mic, title: 'Person answers', desc: 'Speak freely, including mixed conversational speech such as Tamil-English.' },
                { num: '04', icon: Layers, title: 'Solli understands', desc: 'Speech becomes text, and text becomes clean values (name, date, phone).' },
                { num: '05', icon: CheckCircle2, title: 'Solli confirms', desc: 'Names, dates, and numbers are read back in small groups for confirmation.' },
                { num: '06', icon: RefreshCw, title: 'Person controls flow', desc: 'Say commands like "repeat", "go back", "skip", or "change field" at any time.' },
                { num: '07', icon: Clock, title: 'Review screen', desc: 'A final screen lists every field with its status, editable by voice or tap.' },
                { num: '08', icon: FileText, title: 'Finish and clear', desc: 'Generates an acknowledgment PDF, and the session clears safely from memory.' },
              ].map((step) => {
                const IconComponent = step.icon
                return (
                  <motion.div
                    key={step.num}
                    className="landing-step-card"
                    variants={sequentialCardVariants}
                    whileHover={{ y: -4, borderColor: '#FF6D29' }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="landing-step-head">
                      <span className="landing-step-num">{step.num}</span>
                      <IconComponent size={16} strokeWidth={1.5} className="landing-step-icon" />
                    </div>
                    <h3 className="landing-step-title">{step.title}</h3>
                    <p className="landing-step-desc">{step.desc}</p>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </section>

        {/* ── 4. MULTILINGUAL BY DESIGN (SEQUENTIAL SCROLL REVEAL) ─────────── */}
        <section id="multilingual" className="landing-section">
          <div className="landing-container">
            <motion.div
              className="landing-section-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="landing-eyebrow">Language coverage</span>
              <h2 className="landing-section-title">4. Multilingual by design</h2>
              <p className="landing-section-desc">
                One form definition powers every language. Adding a language means adding text and rules, not rebuilding the app.
              </p>
            </motion.div>

            {/* Sequential Reveal of all 10 Language Chips */}
            <motion.div
              className="landing-lang-grid"
              variants={langGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              {[
                { name: 'தமிழ் (Tamil)', status: 'Tested speech', tested: true },
                { name: 'English (Indian)', status: 'Tested speech', tested: true },
                { name: 'Tanglish (Mixed)', status: 'Tested speech', tested: true },
                { name: 'हिंदी (Hindi)', status: 'Preview', tested: false },
                { name: 'తెలుగు (Telugu)', status: 'Preview', tested: false },
                { name: 'ಕನ್ನಡ (Kannada)', status: 'Preview', tested: false },
                { name: 'മലയാളം (Malayalam)', status: 'Preview', tested: false },
                { name: 'বাংলা (Bengali)', status: 'Preview', tested: false },
                { name: 'मराठी (Marathi)', status: 'Preview', tested: false },
                { name: 'ગુજરાતી (Gujarati)', status: 'Preview', tested: false },
              ].map((lang) => (
                <motion.div
                  key={lang.name}
                  className={`landing-lang-chip ${lang.tested ? 'landing-lang-chip-tested' : ''}`}
                  variants={langCardVariants}
                  whileHover={{ y: -3, borderColor: '#FF6D29' }}
                  transition={{ duration: 0.14 }}
                >
                  <div className="landing-lang-name">{lang.name}</div>
                  <div className={`landing-lang-status ${lang.tested ? 'landing-lang-status-active' : ''}`}>
                    {lang.status}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="landing-callout"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <HelpCircle size={20} strokeWidth={1.5} style={{ color: '#FF6D29', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#ffffff', fontSize: '14px' }}>Honest testing note</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#BABABA', lineHeight: 1.6 }}>
                  Solli's voice and screen text are available in 10 Indian languages. Speech understanding was tested most thoroughly in <strong style={{ color: '#ffffff' }}>Tamil and English (including Tanglish)</strong> against 436 automated tests. Other languages are an early preview, and accuracy may vary.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── EXTENSION PREVIEW ────────────────────────────────────────────── */}
        <section id="extension" className="landing-section landing-section-alt">
          <div className="landing-container">
            <motion.div
              className="landing-ext-box"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <span className="landing-eyebrow">Deployment modes</span>
                <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#ffffff', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                  Universal voice input on any web form
                </h2>

                <p style={{ color: '#BABABA', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Solli is designed to run in two modes: a dedicated public kiosk for panchayat and e-Sevai centers, and a planned Chrome extension side panel that scans input fields on external welfare sites to fill them by voice. It never submits forms automatically.
                </p>

                <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#161316', border: '1px solid #453027', fontSize: '13px', color: '#BABABA' }}>
                  <strong style={{ color: '#ffffff' }}>Example form demo:</strong> Test the complete voice-filling experience using the <span style={{ color: '#FF6D29' }}>IGNOAPS Pension</span> form schema.
                </div>
              </div>

              <div className="landing-ext-card">
                <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#231F24', border: '1px solid #453027', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6D29', margin: '0 auto 16px' }}>
                  <Mic size={22} strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', margin: '0 0 6px' }}>
                  Launch kiosk demo
                </h3>
                <p style={{ fontSize: '13px', color: '#BABABA', margin: '0 0 20px' }}>
                  Experience spoken questions, answers, and audio read-backs.
                </p>
                <motion.button
                  type="button"
                  onClick={onLaunchKiosk}
                  className="landing-btn-primary"
                  style={{ width: '100%', height: '40px' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Open voice demo</span>
                  <ArrowRight size={15} strokeWidth={1.5} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 7. BUILT ON GNANI AI (SEQUENTIAL ROW REVEAL) ─────────────────── */}
        <section id="gnani" className="landing-section">
          <div className="landing-container" style={{ maxWidth: '860px' }}>
            <motion.div
              className="landing-section-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="landing-eyebrow">Speech technology</span>
              <h2 className="landing-section-title">7. Built on Gnani AI</h2>
              <p className="landing-section-desc">
                Specialized Indic acoustic models for conversational accuracy across vernacular dialects.
              </p>
            </motion.div>

            <motion.div
              className="landing-table-wrap"
              variants={sequentialGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.div className="landing-table-row" variants={sequentialCardVariants}>
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '14px' }}>Prisma v2.5</strong>
                  <span className="landing-badge" style={{ marginLeft: '8px', background: 'rgba(255,109,41,0.12)', color: '#FF6D29', borderColor: 'rgba(255,109,41,0.3)' }}>Active</span>
                </div>
                <div style={{ fontSize: '13px', color: '#BABABA' }}>
                  Speech to text: understands the applicant's spoken answers in regional Indian languages
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', color: '#FF6D29' }}>
                  STT Engine
                </div>
              </motion.div>

              <motion.div className="landing-table-row" variants={sequentialCardVariants}>
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '14px' }}>Timbre v3.0</strong>
                  <span className="landing-badge" style={{ marginLeft: '8px', background: 'rgba(255,109,41,0.12)', color: '#FF6D29', borderColor: 'rgba(255,109,41,0.3)' }}>Active</span>
                </div>
                <div style={{ fontSize: '13px', color: '#BABABA' }}>
                  Text to speech: speaks the questions and read-backs in natural voices (Chetana / Kalpana)
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', color: '#FF6D29' }}>
                  TTS Engine
                </div>
              </motion.div>

              <motion.div className="landing-table-row" variants={sequentialCardVariants} style={{ background: '#181519' }}>
                <div>
                  <strong style={{ color: '#BABABA', fontSize: '14px' }}>Evon v3.3</strong>
                  <span className="landing-badge" style={{ marginLeft: '8px' }}>Planned</span>
                </div>
                <div style={{ fontSize: '13px', color: '#BABABA' }}>
                  Answer extraction currently uses a rule-based engine; Evon LLM integration is planned
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', color: '#BABABA' }}>
                  LLM Layer
                </div>
              </motion.div>
            </motion.div>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#BABABA' }}>
              The Gnani API key stays secure on the server and is never exposed to the client browser.
            </p>
          </div>
        </section>

        {/* ── 9. PRIVACY & SAFETY (SEQUENTIAL CARD REVEAL) ──────────────────── */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container" style={{ maxWidth: '860px' }}>
            <motion.div
              style={{ padding: '24px 28px', borderRadius: '14px', background: '#1C191D', border: '1px solid #453027' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ShieldCheck size={18} strokeWidth={1.5} style={{ color: '#FF6D29' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', margin: 0 }}>
                  9. Privacy, safety, and honesty notice
                </h3>
              </div>

              <motion.div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '13px', color: '#BABABA', lineHeight: 1.55 }}
                variants={sequentialGridVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
              >
                <motion.div style={{ padding: '12px 16px', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }} variants={sequentialCardVariants}>
                  <strong style={{ color: '#ffffff' }}>Zero data stored:</strong> Answers exist only in volatile RAM during the session and are purged immediately after inactivity or restart.
                </motion.div>
                <motion.div style={{ padding: '12px 16px', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }} variants={sequentialCardVariants}>
                  <strong style={{ color: '#ffffff' }}>Fake data only:</strong> All demos and tests use synthetic fake data only.
                </motion.div>
                <motion.div style={{ padding: '12px 16px', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }} variants={sequentialCardVariants}>
                  <strong style={{ color: '#ffffff' }}>Format checking only:</strong> Solli checks format validity only. It does not verify records against live government databases.
                </motion.div>
                <motion.div style={{ padding: '12px 16px', background: '#161316', borderRadius: '8px', border: '1px solid #453027' }} variants={sequentialCardVariants}>
                  <strong style={{ color: '#ffffff' }}>No official submissions:</strong> Solli prepares forms for verification. It is an independent student prototype, not an official government service.
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── 12. ABOUT ────────────────────────────────────────────────────── */}
        <section id="about" className="landing-section" style={{ textAlign: 'center' }}>
          <div className="landing-container" style={{ maxWidth: '640px' }}>
            <span className="landing-eyebrow">Project background</span>
            <h2 className="landing-section-title">12. About Solli</h2>
            <p className="landing-section-desc" style={{ fontSize: '15px', marginTop: '10px' }}>
              Built by <strong style={{ color: '#ffffff' }}>Dhanushkumar G</strong> as an independent solo project for the{' '}
              <strong style={{ color: '#ffffff' }}>Great Indian AI Internship Challenge</strong>, utilizing Gnani AI Indic speech intelligence.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px', fontSize: '13px', color: '#FF6D29', fontFamily: 'monospace' }}>
              <span>#GnaniAI</span>
              <span>•</span>
              <span>#GreatIndianAIInternshipChallenge</span>
            </div>

            <div style={{ marginTop: '36px' }}>
              <motion.button
                type="button"
                onClick={onLaunchKiosk}
                className="landing-btn-primary landing-btn-hero"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mic size={17} strokeWidth={1.5} />
                <span>Launch voice form demo</span>
                <ArrowRight size={16} strokeWidth={1.5} />
              </motion.button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={24} showSub={false} />
            <span>· Multilingual Voice Assistant (Independent Prototype)</span>
          </div>
          <div>
            <span>436 automated tests passing (100%) · Ephemeral in-memory session</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
