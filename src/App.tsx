import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type CSSProperties,
} from 'react'

/* ── Types ─────────────────────────────────────────────────────── */
interface Mcp {
  endpoint: string
  tools: string[]
  prompt: string
}
interface ProjectColor {
  bg: string
  ring: string
  text: string
  shadow: string
}
interface Project {
  id: string
  name: string
  icon: string
  url: string
  desc: string
  color: ProjectColor
  soon?: boolean
  mcp?: Mcp
}

/* ── Projects ──────────────────────────────────────────────────── */
const PROJECTS: Project[] = [
  {
    id: 'resume',
    name: 'Resume Maker',
    icon: '✒',
    url: 'https://sandeepsj.github.io/resume-maker/#/resumes',
    desc: 'Build, version, and export résumés. Pick a template, fill in the blanks, ship the PDF.',
    color: { bg: '#eef5f0', ring: '#5a8a6a', text: '#2a5a3a', shadow: 'rgba(90,138,106,.22)' },
  },
  {
    id: 'exceli',
    name: 'Excelidraw',
    icon: '✦',
    url: 'https://sandeepsj.github.io/excelidraw/#/dashboard',
    desc: 'Whiteboard sketches and diagrams saved to a personal dashboard. Quick visual thinking.',
    color: { bg: '#eef0f5', ring: '#5a6a8a', text: '#2a3a5a', shadow: 'rgba(90,106,138,.22)' },
  },
  {
    id: 'doc2dash',
    name: 'Doc to Dashboard',
    icon: '◫',
    url: 'https://sandeepsj.github.io/doc-to-dashboard/',
    desc: 'Drop in markdown, get a browsable dashboard. Front matter, Mermaid, KaTeX, callouts — all rendered.',
    color: { bg: '#f5eef0', ring: '#8a5a6a', text: '#5a2a3a', shadow: 'rgba(138,90,106,.22)' },
  },
  {
    id: 'journal',
    name: 'Journal',
    icon: '❦',
    url: 'https://sandeepsj.github.io/journal/',
    desc: 'Daily writing space. Date-stamped entries, kept private and close at hand.',
    color: { bg: '#f5f0ee', ring: '#8a7a5a', text: '#5a4a2a', shadow: 'rgba(138,122,90,.22)' },
  },
  {
    id: 'flashcard',
    name: 'Flashcard',
    icon: '🗂',
    url: 'https://sandeepsj.github.io/flashcard/',
    desc: 'Spaced-repetition decks. Build cards, drill them, remember them.',
    color: { bg: '#eef5f5', ring: '#4a8a8a', text: '#1a5a5a', shadow: 'rgba(74,138,138,.22)' },
    mcp: {
      endpoint: 'https://flashdsa-mcp.sandeepsj0000.workers.dev/mcp',
      tools: ['get_deck_overview', 'list_cards', 'add_cards'],
      prompt:
        'Look at my flashcard deck, then create 3 flashcards about binary search and add them wherever they fit best.',
    },
  },
  {
    id: 'octave',
    name: 'Octave',
    icon: '♪',
    url: 'https://github.com/sandeepsj/octave',
    desc: 'A tuned little something in eight notes. Repo is up — the app is on its way.',
    color: { bg: '#f4f5ee', ring: '#7a8a5a', text: '#4a5a2a', shadow: 'rgba(122,138,90,.22)' },
    soon: true,
  },
  {
    id: 'sonata',
    name: 'Sonata Face',
    icon: '◐',
    url: 'https://sonata-face.vercel.app/payments',
    desc: 'Admin console for Revathi Music & Arts School — student records and fee management in one place.',
    color: { bg: '#f5eee8', ring: '#8a6a4a', text: '#5a3a1a', shadow: 'rgba(138,106,74,.22)' },
  },
  {
    id: 'notebook',
    name: 'Notebook',
    icon: '✎',
    url: 'https://sandeepsj.github.io/notebook-app/#/',
    desc: 'Handwrite with a stylus on ruled or blank pages. Ink with pen or highlighter, sync to Drive, and let Claude read your writing back as text.',
    color: { bg: '#f1eef5', ring: '#6a5a8a', text: '#3a2a5a', shadow: 'rgba(106,90,138,.22)' },
  },
  {
    id: 'northstar',
    name: 'NorthStar',
    icon: '✶',
    url: 'https://sandeepsj.github.io/northstar/',
    desc: 'A long-range life map. Lay out areas as lanes and milestones across the years — where you are, what matters, and what you\'ve done.',
    color: { bg: '#eceef7', ring: '#4a5a9a', text: '#1a2a6a', shadow: 'rgba(74,90,154,.22)' },
  },
]

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/* ── The motion engine ─────────────────────────────────────────────
   Every orb is a point on its own elliptical (Lissajous) curve:
     e(t) = primary harmonic  +  λ-scaled secondary harmonic
   parametrised by ONE shared time t. Cranking the wheel advances t,
   so every orb flows at once — varied, never-repeating, yet bound
   by the same equation. Size breathes on its own sine curve.        */
interface Orb {
  cx: number
  cy: number
  Rx: number
  Ry: number
  w1: number
  lam: number
  kap: number
  r1: number
  rW: number
  rP: number
  p1: number
  p2: number
  th0: number
  base: number
  sAmp: number
  sW: number
  sPh: number
  launch: number
}

function makeOrbs(n: number): Orb[] {
  const padX = 6,
    padY = 9,
    mrg = 4
  const orbs: Orb[] = []
  for (let i = 0; i < n; i++) {
    const cx = rand(48, 52),
      cy = rand(48, 52)
    const ph = (i / n) * Math.PI * 2 // stagger starting phases so they spread across time
    orbs.push({
      cx,
      cy,
      Rx: Math.min(cx - padX, 100 - padX - cx) - mrg, // screen-fit half-extents: orb can never leave
      Ry: Math.min(cy - padY, 100 - padY - cy) - mrg,
      w1: rand(0.5, 1.4), // base angular speed (unique per orb)
      lam: rand(1.3, 2.7), // λ — secondary-harmonic ratio (precession), unique per orb
      kap: rand(-0.55, 0.55), // tilt-rotation rate — the ellipse turns as the wheel turns
      r1: rand(0.5, 0.72), // epicycle arm split (r1 + r2 = 1 always → stays in unit disk)
      rW: rand(0.2, 0.6),
      rP: rand(0, 6.28), // the arms breathe over time (sum kept at 1)
      p1: ph + rand(-0.4, 0.4),
      p2: rand(0, 6.28),
      th0: rand(0, 6.28), // initial tilt
      base: rand(92, 118), // base diameter (px)
      sAmp: rand(0.07, 0.13),
      sW: rand(0.4, 0.9),
      sPh: rand(0, 6.28),
      launch: i * 0.07,
    })
  }
  return orbs
}

function orbAt(o: Orb, t: number) {
  // two-arm epicycle on the unit disk: |(nx,ny)| <= r1 + r2 = 1
  let r1 = o.r1 + 0.15 * Math.sin(o.rW * t + o.rP)
  if (r1 < 0.3) r1 = 0.3
  else if (r1 > 0.85) r1 = 0.85
  const r2 = 1 - r1
  const a = o.w1 * t + o.p1,
    b = o.lam * o.w1 * t + o.p2
  const nx = r1 * Math.cos(a) + r2 * Math.cos(b)
  const ny = r1 * Math.sin(a) + r2 * Math.sin(b)
  // rotate the whole figure by a time-growing tilt (preserves magnitude <= 1)
  const th = o.th0 + o.kap * t,
    c = Math.cos(th),
    s = Math.sin(th)
  const mx = nx * c - ny * s,
    my = nx * s + ny * c
  // scale into this orb's screen-fit ellipse — |mx|,|my| <= 1 so it never leaves
  return {
    x: o.cx + o.Rx * mx,
    y: o.cy + o.Ry * my,
    size: o.base * (1 + o.sAmp * Math.sin(o.sW * t + o.sPh)),
  }
}

/* ── Audio tick (Web Audio, no files) ──────────────────────────── */
let _ac: AudioContext | null = null
function playTick() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!_ac) _ac = new Ctor()
    if (_ac.state === 'suspended') _ac.resume()
    const t = _ac.currentTime,
      o = _ac.createOscillator(),
      g = _ac.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(2450, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.001)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028)
    o.connect(g)
    g.connect(_ac.destination)
    o.start(t)
    o.stop(t + 0.035)
  } catch {
    /* audio unavailable — silent */
  }
}

/* A tiny haptic blip to accompany each tick, where supported.
   navigator.vibrate is the Android vibrator hook (Chrome/Firefox);
   it no-ops on iOS Safari and desktop. */
function playHaptic() {
  try {
    navigator.vibrate?.(8)
  } catch {
    /* vibration unavailable — silent */
  }
}

/* ── Garden leaves SVG ─────────────────────────────────────────── */
type Leaf = [number, number, number, number, number, number, string]
const LEAVES: Leaf[] = [
  [22, 96, 0.9, 4.5, -5, 0.1, '#5a8a6a'],
  [50, 96, 1, 5, 4, 0.09, '#5a8060'],
  [78, 96, 0.9, 4.5, -5, 0.09, '#5a8a6a'],
  [5, 90, 3, 7.5, 42, 0.1, '#5a8a6a'],
  [92, 90, 3, 7.5, -40, 0.1, '#5a8060'],
  [3, 7, 2.5, 6.5, 28, 0.18, '#5a8a6a'],
  [6, 3, 2, 5, -12, 0.14, '#4a7a5a'],
  [1, 15, 3.5, 8.5, 55, 0.17, '#6a9a7a'],
  [8, 10, 1.8, 5, 18, 0.12, '#5a8060'],
  [5, 20, 2.5, 7.5, 68, 0.14, '#4a7050'],
  [2, 25, 2, 6, 80, 0.11, '#5a8a6a'],
  [92, 5, 2.5, 6.5, -24, 0.18, '#5a8a6a'],
  [89, 2, 2, 5, 10, 0.14, '#4a7a5a'],
  [95, 14, 3.5, 8, -52, 0.17, '#6a9a7a'],
  [93, 20, 1.8, 5.5, -18, 0.12, '#5a8060'],
  [2, 40, 2.5, 6.5, 82, 0.12, '#5a8a6a'],
  [3, 54, 2, 7, 66, 0.1, '#4a7a5a'],
  [98, 36, 2.5, 6.5, -80, 0.12, '#5a8a6a'],
  [97, 52, 2, 7, -65, 0.1, '#4a7a5a'],
  [28, 33, 1.4, 4, 32, 0.06, '#5a8060'],
  [68, 27, 1.3, 3.8, -22, 0.05, '#5a8a6a'],
  [52, 70, 1.4, 4, 46, 0.07, '#4a7050'],
  [35, 46, 1.2, 3.5, 12, 0.05, '#5a8a6a'],
]

function GardenBackground() {
  return (
    <svg
      className="garden-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0,20 C4,15 5,9 3,5 C1,1 3,-1 5,2" stroke="#5a8a6a" strokeWidth="0.35" fill="none" opacity="0.14" />
      <path d="M8,100 C9,93 7,86 9,80" stroke="#5a8a6a" strokeWidth="0.38" fill="none" opacity="0.16" />
      <path d="M88,100 C87,93 89,86 87,80" stroke="#5a8a6a" strokeWidth="0.38" fill="none" opacity="0.16" />
      {LEAVES.map(([cx, cy, rx, ry, rot, op, col], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot},${cx},${cy})`} fill={col} opacity={op} />
      ))}
      <circle cx="14" cy="70" r="1.6" fill="#c4a06a" opacity="0.14" />
      <circle cx="72" cy="43" r="1.2" fill="#c4a06a" opacity="0.1" />
      <circle cx="40" cy="86" r="1.3" fill="#8a5a6a" opacity="0.12" />
      <circle cx="9" cy="76" r="1.5" fill="#6a9a7a" opacity="0.14" />
    </svg>
  )
}

/* ── CopyBtn ───────────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setDone(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button type="button" className={`btn-copy${done ? ' is-copied' : ''}`} onClick={copy}>
      {done ? 'copied ✓' : 'copy'}
    </button>
  )
}

/* ── Project dialog ────────────────────────────────────────────── */
function ProjectDialog({ project: p, onClose }: { project: Project; onClose: () => void }) {
  const isImg = /^(https?:|data:image)/i.test((p.icon || '').trim())
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const dlgStyle = {
    '--dlg-ring': p.color.ring,
    '--dlg-bg': p.color.bg,
  } as CSSProperties
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dlg" style={dlgStyle} onClick={(e) => e.stopPropagation()}>
        <button className="dlg__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="dlg__icon">{isImg ? <img src={p.icon} alt="" /> : <span>{p.icon}</span>}</div>
        <p className="dlg__eye">sandeepsj · project</p>
        <h2 className="dlg__name">{p.name}</h2>
        <p className="dlg__desc">{p.desc}</p>
        {p.soon ? (
          <div className="btn-open btn-open--soon">Not yet live — incoming ⟶</div>
        ) : (
          <a className="btn-open" href={p.url} target="_blank" rel="noopener noreferrer">
            Open project →
          </a>
        )}
        {p.mcp && (
          <div className="mcp">
            <div className="mcp__head">
              <span className="mcp__head-dot" aria-hidden="true"></span>Claude · MCP connection
            </div>
            <div className="mcp__row">
              <span className="mcp__key">endpoint</span>
              <div className="mcp__val">
                <div className="mcp__endpoint">
                  <span className="mcp__url">{p.mcp.endpoint}</span>
                  <CopyBtn text={p.mcp.endpoint} />
                </div>
              </div>
            </div>
            <div className="mcp__row">
              <span className="mcp__key">tools</span>
              <div className="mcp__tools mcp__val">
                {p.mcp.tools.map((t) => (
                  <span key={t} className="mcp__chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="mcp__row">
              <span className="mcp__key">try</span>
              <div className="mcp__val">
                <div className="mcp__try">
                  <span className="mcp__try-text">{p.mcp.prompt}</span>
                  <CopyBtn text={p.mcp.prompt} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── App ───────────────────────────────────────────────────────── */
const TICK_STEP = 0.16

function formatDate() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
}

interface Tween {
  from: number
  to: number
  start: number
  dur: number
}
interface BlastDir {
  ux: number
  uy: number
  mag: number
}
interface Blast {
  start: number
  dirs: BlastDir[]
}
interface DragState {
  active: boolean
  cx: number
  cy: number
  last: number
  total: number
}

export default function App() {
  const [selected, setSelected] = useState<Project | null>(null)
  const [dragging, setDragging] = useState(false)
  const today = useMemo(() => formatDate(), [])

  const orbs = useRef<Orb[]>(makeOrbs(PROJECTS.length))
  const els = useRef<(HTMLDivElement | null)[]>([])
  const fieldEl = useRef<HTMLDivElement | null>(null)
  const pinned = useRef<Record<number, { x: number; y: number }>>({}) // orbs the user has dragged into place — anchored until a blast
  const orbDrag = useRef<{ i: number; sx: number; sy: number; moved: boolean } | null>(null)
  const justDragged = useRef(false) // set on a drag so the trailing click doesn't open the dialog
  const wheelEl = useRef<SVGSVGElement | null>(null)
  const tRef = useRef(0) // shared time — only changes while you crank
  const prevT = useRef(0) // last frame's t (for tick detection)
  const tickAcc = useRef(0)
  const tween = useRef<Tween | null>(null) // brief eased scatter on tap, then stops
  const blast = useRef<Blast | null>(null) // decaying radial explosion after a re-roll
  const drag = useRef<DragState>({ active: false, cx: 0, cy: 0, last: 0, total: 0 })
  const start = useRef(0)
  const selRef = useRef<Project | null>(null)
  useEffect(() => {
    selRef.current = selected
  }, [selected])

  /* one rAF loop drives the whole garden */
  useEffect(() => {
    start.current = performance.now()
    let raf: number
    const loop = (now: number) => {
      /* a tap kicks off a brief eased scatter that settles and then stops */
      if (tween.current && !selRef.current) {
        const tw = tween.current,
          p = Math.min(1, (now - tw.start) / tw.dur)
        tRef.current = tw.from + (tw.to - tw.from) * (1 - Math.pow(1 - p, 3))
        if (p >= 1) tween.current = null
      }
      const t = tRef.current
      /* tick whenever t actually moved — covers dragging and the tap-scatter */
      const moved = Math.abs(t - prevT.current)
      if (moved > 0) {
        tickAcc.current += moved
        while (tickAcc.current >= TICK_STEP) {
          tickAcc.current -= TICK_STEP
          playTick()
          playHaptic()
        }
      }
      prevT.current = t
      const el0 = (now - start.current) / 1000
      let bF = 0
      let bDirs: BlastDir[] | null = null
      if (blast.current) {
        const bp = (now - blast.current.start) / 720
        if (bp >= 1) blast.current = null
        else {
          bF = Math.pow(1 - bp, 2)
          bDirs = blast.current.dirs
        }
      }
      orbs.current.forEach((o, i) => {
        const el = els.current[i]
        if (!el) return
        const pos = orbAt(o, t)
        const pin = pinned.current[i] // a dragged orb stays put — the crank no longer stirs it
        let x = pin ? pin.x : pos.x,
          y = pin ? pin.y : pos.y
        const size = pos.size
        if (bDirs && !pin) {
          const d = bDirs[i]
          x += d.ux * d.mag * bF
          y += d.uy * d.mag * bF * 0.72
        }
        x = Math.max(3, Math.min(97, x))
        y = Math.max(5, Math.min(95, y))
        let lf = (el0 - o.launch) / 0.62
        lf = lf < 0 ? 0 : lf > 1 ? 1 : lf
        lf = 1 - Math.pow(1 - lf, 3)
        const s = size * lf * (1 + 0.18 * bF)
        el.style.left = x + '%'
        el.style.top = y + '%'
        el.style.width = s + 'px'
        el.style.height = s + 'px'
        el.style.opacity = String(lf * (PROJECTS[i].soon ? 0.62 : 1))
        // stack by the orb's *stable* base diameter, not its per-frame breathing
        // size — otherwise overlapping orbs swap z-order every frame and the
        // pointer lands on whichever happens to be on top that instant.
        el.style.zIndex = String(20 + Math.round(o.base))
      })
      if (wheelEl.current) wheelEl.current.style.transform = `rotate(${t * 26}deg)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* wheel: drag cranks t directly; release freezes; tap = brief scatter */
  const onDown = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2
    drag.current = { active: true, cx, cy, last: Math.atan2(e.clientY - cy, e.clientX - cx), total: 0 }
    tween.current = null // grabbing the dial cancels any in-flight scatter
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture unsupported */
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active) return
    const ang = Math.atan2(e.clientY - d.cy, e.clientX - d.cx)
    let del = ang - d.last
    if (del > Math.PI) del -= 2 * Math.PI
    if (del < -Math.PI) del += 2 * Math.PI
    d.last = ang
    d.total += Math.abs(del)
    tRef.current += del // direct 1:1 crank (ticks handled in the loop)
  }
  const onUp = () => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    setDragging(false)
    /* drag release: orbs freeze exactly where they are — no momentum, no drift.
       a pure tap: one brief eased scatter to fresh spots, then it stops. */
    if (d.total < 0.06) {
      const delta = (Math.random() < 0.5 ? -1 : 1) * rand(2.4, 4)
      tween.current = { from: tRef.current, to: tRef.current + delta, start: performance.now(), dur: 850 }
    }
  }
  /* per-orb drag: a real drag pins the orb where you drop it;
     a tap that never moves falls through to opening the dialog. */
  const onOrbDown = (e: React.PointerEvent, i: number) => {
    orbDrag.current = { i, sx: e.clientX, sy: e.clientY, moved: false }
    justDragged.current = false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture unsupported */
    }
  }
  const onOrbMove = (e: React.PointerEvent, i: number) => {
    const od = orbDrag.current
    if (!od || od.i !== i) return
    if (!od.moved && Math.hypot(e.clientX - od.sx, e.clientY - od.sy) < 5) return
    od.moved = true
    const field = fieldEl.current
    if (!field) return
    const r = field.getBoundingClientRect()
    pinned.current[i] = {
      x: Math.max(3, Math.min(97, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(5, Math.min(95, ((e.clientY - r.top) / r.height) * 100)),
    }
  }
  const onOrbUp = (e: React.PointerEvent, i: number) => {
    const od = orbDrag.current
    orbDrag.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* pointer capture unsupported */
    }
    // a drag just repositions — flag it so the trailing click won't open the dialog.
    // a clean tap leaves the flag false and falls through to onClick below.
    if (od && od.i === i && od.moved) justDragged.current = true
  }

  const doBlast = () => {
    orbs.current = makeOrbs(PROJECTS.length) // brand-new constants for every orb
    pinned.current = {} // a blast frees every pinned orb back into motion
    tween.current = null
    blast.current = {
      start: performance.now(),
      dirs: orbs.current.map(() => {
        const a = Math.random() * Math.PI * 2
        return { ux: Math.cos(a), uy: Math.sin(a), mag: rand(30, 50) }
      }),
    }
    playTick()
    try {
      navigator.vibrate?.([12, 18, 12])
    } catch {
      /* vibration unavailable — silent */
    }
  }

  return (
    <>
      <header className="topbar">
        <span className="topbar__mark">
          <span className="topbar__dot" aria-hidden="true"></span>SJ'S TRUG&nbsp;
          <em className="topbar__em">· a basket of tools</em>
        </span>
        <span className="topbar__rule" aria-hidden="true"></span>
        <span className="topbar__date">{today}</span>
      </header>

      <div className="garden">
        <GardenBackground />
        <div className="bubble-field" ref={fieldEl}>
          {PROJECTS.map((p, i) => {
            const active = selected?.id === p.id
            const bubStyle = {
              left: '50%',
              top: '50%',
              width: 0,
              height: 0,
              opacity: 0,
              '--bub-bg': p.color.bg,
              '--bub-ring': p.color.ring,
              '--bub-text': p.color.text,
              '--bub-shadow': p.color.shadow,
            } as CSSProperties
            return (
              <div
                key={p.id}
                ref={(el) => {
                  els.current[i] = el
                }}
                className={`bubble${active ? ' bubble--active' : ''}${p.soon ? ' bubble--soon' : ''}`}
                style={bubStyle}
              >
                <div className="bubble__ring" aria-hidden="true"></div>
                <span className="bubble__icon" aria-hidden="true">
                  {p.icon}
                </span>
                <span className="bubble__label">{p.name}</span>
                {p.soon && <span className="bubble__soon">Incoming</span>}
                {/* circular hit layer — owns all pointer input so only the visible
                    disc is clickable/hoverable (see .bubble__hit in index.css) */}
                <div
                  className="bubble__hit"
                  onPointerDown={(e) => onOrbDown(e, i)}
                  onPointerMove={(e) => onOrbMove(e, i)}
                  onPointerUp={(e) => onOrbUp(e, i)}
                  onPointerCancel={() => {
                    orbDrag.current = null
                  }}
                  onClick={() => {
                    if (justDragged.current) {
                      justDragged.current = false // consume the post-drag click; don't open
                      return
                    }
                    setSelected(active ? null : p)
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${p.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(active ? null : p)
                    }
                  }}
                />
              </div>
            )
          })}
          <span className={`garden-hint${selected ? ' dim' : ''}`}>
            · tap a seedling to explore · drag it to replant · turn the dial to stir ·
          </span>
        </div>
      </div>

      {/* Crank dial — drag to stir the whole garden, tap to scatter */}
      <div className="wheel-wrap">
        <button
          className="blast-btn"
          onClick={doBlast}
          aria-label="Blast — scatter and re-randomise"
          title="Blast — explode & re-randomise"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2.5" x2="12" y2="6.5" />
            <line x1="12" y1="17.5" x2="12" y2="21.5" />
            <line x1="2.5" y1="12" x2="6.5" y2="12" />
            <line x1="17.5" y1="12" x2="21.5" y2="12" />
            <line x1="5.5" y1="5.5" x2="8.3" y2="8.3" />
            <line x1="15.7" y1="15.7" x2="18.5" y2="18.5" />
            <line x1="5.5" y1="18.5" x2="8.3" y2="15.7" />
            <line x1="15.7" y1="8.3" x2="18.5" y2="5.5" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button
          className={`wheel-btn${dragging ? ' dragging' : ''}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label="Crank the garden — drag to stir every orb, tap to scatter"
          title="Drag to stir · tap to scatter"
        >
          <svg className="wheel-svg" ref={wheelEl} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            {Array.from({ length: 24 }).map((_, i) => {
              const a = ((i * 15 - 90) * Math.PI) / 180,
                big = i % 3 === 0,
                r1 = 30,
                r2 = big ? 24 : 26.5
              return (
                <line
                  key={i}
                  x1={32 + r1 * Math.cos(a)}
                  y1={32 + r1 * Math.sin(a)}
                  x2={32 + r2 * Math.cos(a)}
                  y2={32 + r2 * Math.sin(a)}
                  stroke="currentColor"
                  strokeWidth={big ? 1.5 : 0.8}
                  opacity={big ? 0.42 : 0.2}
                  strokeLinecap="round"
                />
              )
            })}
            <g transform="translate(32,32)" fill="currentColor">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} cx="0" cy="-6.4" rx="3.3" ry="6.8" opacity="0.6" transform={`rotate(${a})`} />
              ))}
              <circle r="3.5" />
            </g>
          </svg>
          <span className="wheel-notch" aria-hidden="true"></span>
        </button>
        <span className="wheel-label">drag to stir</span>
      </div>

      {selected && <ProjectDialog project={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
