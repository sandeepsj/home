import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

type Project = {
  id: string
  name: string
  alias: string
  url: string
  description: string
  icon: string
  added: number
  comingSoon?: boolean
}

const STORAGE_KEY = 'home::projects::v2'

const SEED: Omit<Project, 'id' | 'added'>[] = [
  {
    name: 'Resume Maker',
    alias: '',
    url: 'https://sandeepsj.github.io/resume-maker/#/resumes',
    description:
      'Build, version, and export résumés. Pick a template, fill in the blanks, ship the PDF.',
    icon: '✒',
  },
  {
    name: 'Excelidraw',
    alias: '',
    url: 'https://sandeepsj.github.io/excelidraw/#/dashboard',
    description:
      'Whiteboard sketches and diagrams, saved to a personal dashboard. Quick visual thinking.',
    icon: '✦',
  },
  {
    name: 'Doc to Dashboard',
    alias: '',
    url: 'https://sandeepsj.github.io/doc-to-dashboard/',
    description:
      'Drop in markdown, get a browsable doc dashboard. Front matter, Mermaid, KaTeX, callouts — all rendered.',
    icon: '◫',
  },
  {
    name: 'Journal',
    alias: '',
    url: 'https://sandeepsj.github.io/journal/',
    description:
      'Daily writing space. Date-stamped entries, kept private and close at hand.',
    icon: '❦',
  },
  {
    name: 'Flashcard',
    alias: '',
    url: 'https://sandeepsj.github.io/flashcard/',
    description:
      'Spaced-repetition decks. Build cards, drill them, remember them.',
    icon: '🗂',
  },
  {
    name: 'Octave',
    alias: '',
    url: 'https://github.com/sandeepsj/octave',
    description:
      'A tuned little something in eight notes. Repo is up — the app is on its way.',
    icon: '♪',
    comingSoon: true,
  },
  {
    name: 'Sonata Face',
    alias: '',
    url: 'https://sonata-face.vercel.app/payments',
    description:
      'Admin console for Revathi Music & Arts School — student records and fee management in one place.',
    icon: '◐',
  },
]

/* ─── Claude MCP connectors ───────────────────────────────────
   One entry per uplink. Add future connectors here and the
   section renders them automatically. */

type Connector = {
  id: string
  name: string
  tagline: string
  endpoint: string
  blurb: string
  tools: { name: string; what: string }[]
  webSteps: (string | { text: string; code: string })[]
  cliSteps: (string | { text: string; code: string })[]
  tryPrompt: string
  note?: string
}

const CONNECTORS: Connector[] = [
  {
    id: 'flashcards',
    name: 'Flashcards',
    tagline: 'FlashDSA deck · spaced repetition',
    endpoint: 'https://flashdsa-mcp.sandeepsj0000.workers.dev/mcp',
    blurb:
      'Gives Claude direct read/write access to the flashcard deck. Claude can scan every topic, check for duplicate cards, and file brand-new cards into the right topic — they land in Google Drive and show up in the app, due immediately.',
    tools: [
      { name: 'get_deck_overview', what: 'every topic with its card counts' },
      { name: 'list_cards', what: 'browse / search existing cards' },
      { name: 'add_cards', what: 'file new cards into a topic' },
    ],
    webSteps: [
      'Open claude.ai → Settings → Connectors',
      'Choose “Add custom connector”',
      {
        text: 'Paste the endpoint URL',
        code: 'https://flashdsa-mcp.sandeepsj0000.workers.dev/mcp',
      },
      'Approve the connector, then complete the Google sign-in — the deck lives in your Google Drive',
      'In any chat, make sure the connector is enabled in the tools menu, then just ask',
    ],
    cliSteps: [
      {
        text: 'Register the server with Claude Code',
        code: 'claude mcp add --transport http flashcards https://flashdsa-mcp.sandeepsj0000.workers.dev/mcp',
      },
      {
        text: 'Inside a session, authenticate it',
        code: '/mcp',
      },
      'Pick “flashcards” and finish the OAuth flow in the browser',
    ],
    tryPrompt:
      'Look at my flashcard deck, then create 3 flashcards about binary search and add them wherever they fit best.',
    note: 'Cards are stored in flashcards-data.json in Drive — refresh the Flashcard app after adding and they appear, due today.',
  },
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const SEEN_KEY = 'home::seeds-seen::v1'

function loadProjects(): Project[] {
  let stored: Project[] | null = null
  let seen: string[] = []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Project[]
      if (Array.isArray(parsed)) stored = parsed
    }
    const seenRaw = localStorage.getItem(SEEN_KEY)
    if (seenRaw) {
      const parsedSeen = JSON.parse(seenRaw) as string[]
      if (Array.isArray(parsedSeen)) seen = parsedSeen
    }
  } catch {
    // fall through to defaults
  }

  const now = Date.now()
  const seedUrls = SEED.map((s) => s.url)

  // Fresh install: present the full seed.
  if (stored === null) {
    const projects = SEED.map((s, i) => ({
      ...s,
      id: uid(),
      added: now - (SEED.length - i) * 1000,
    }))
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seedUrls))
    } catch {}
    return projects
  }

  // Existing user without a seen list — bootstrap from what they already have
  // so we don't duplicate seeds they've kept.
  if (seen.length === 0) {
    seen = stored.map((p) => p.url)
  }

  // Refresh seed-derived copy for entries the user hasn't customized.
  const seedByUrl = new Map(SEED.map((s) => [s.url, s]))
  const refreshed = stored.map((p) => {
    const s = seedByUrl.get(p.url)
    if (!s) return p
    if (p.name === s.name && p.icon === s.icon) {
      return { ...p, description: s.description, comingSoon: s.comingSoon }
    }
    return p
  })

  const seenSet = new Set(seen)
  const newSeeds = SEED.filter((s) => !seenSet.has(s.url))

  if (newSeeds.length === 0) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
    } catch {}
    return refreshed
  }

  const additions = newSeeds.map((s, i) => ({
    ...s,
    id: uid(),
    added: now + i,
  }))
  try {
    localStorage.setItem(
      SEEN_KEY,
      JSON.stringify([...seen, ...newSeeds.map((s) => s.url)]),
    )
  } catch {}
  return [...refreshed, ...additions]
}

function isImageSrc(s: string) {
  return /^(https?:|data:image)/i.test(s.trim())
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatDate(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase()
}

const empty: Omit<Project, 'id' | 'added'> = {
  name: '',
  alias: '',
  url: '',
  description: '',
  icon: '',
  comingSoon: false,
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState(empty)

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    } catch {
      // ignore quota errors
    }
  }, [projects])

  // Focus search on mount and on `/`.
  useEffect(() => {
    searchRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isFormField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (e.key === '/' && !isFormField) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (e.key === 'Escape') {
        if (composing) setComposing(false)
        if (editingId) setEditingId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [composing, editingId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      [
        p.alias,
        p.name,
        p.description,
        p.url,
        p.comingSoon ? 'coming soon' : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [projects, query])

  const onSearchKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && filtered.length > 0) {
        const target = filtered[0]
        if (target.url) {
          window.open(target.url, '_blank', 'noopener,noreferrer')
        }
      }
    },
    [filtered],
  )

  const upsert = (next: Project) => {
    setProjects((curr) => {
      const idx = curr.findIndex((p) => p.id === next.id)
      if (idx === -1) return [...curr, next]
      const copy = curr.slice()
      copy[idx] = next
      return copy
    })
  }

  const remove = (id: string) => {
    setProjects((curr) => curr.filter((p) => p.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const submitDraft = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim() || !draft.url.trim()) return
    const finalUrl = /^https?:\/\//i.test(draft.url.trim())
      ? draft.url.trim()
      : `https://${draft.url.trim()}`
    const project: Project = {
      ...draft,
      name: draft.name.trim(),
      alias: draft.alias.trim(),
      url: finalUrl,
      description: draft.description.trim(),
      icon: draft.icon.trim() || '◇',
      id: uid(),
      added: Date.now(),
    }
    setProjects((curr) => [project, ...curr])
    setDraft(empty)
    setComposing(false)
  }

  const today = useMemo(() => formatDate(new Date()), [])

  return (
    <div className="page">
      <div className="bg-aurora" aria-hidden />
      <div className="bg-grid" aria-hidden />
      <div className="bg-scan" aria-hidden />
      <div className="bg-noise" aria-hidden />

      <header className="masthead">
        <div className="masthead__row">
          <span className="masthead__mark">
            <span className="dot" aria-hidden /> SJ://CONSOLE&nbsp;
            <em>v2.0</em>
          </span>
          <span className="masthead__rule" aria-hidden />
          <span className="masthead__date">{today}</span>
        </div>

        <h1 className="title">
          <span className="title__line">Personal</span>
          <span className="title__line title__line--accent">
            Directory<span className="title__cursor">_</span>
          </span>
        </h1>

        <p className="lede">
          A live console of self-built tools. Aliases and entries persist in
          this browser — bring your own dictionary.
        </p>

        <div className="masthead__row masthead__row--bottom">
          <span className="meta">
            <span className="meta__k">nodes</span>
            <span className="meta__leader" aria-hidden />
            <span className="meta__v">
              {String(projects.length).padStart(3, '0')}
            </span>
          </span>
          <span className="meta">
            <span className="meta__k">filter</span>
            <span className="meta__leader" aria-hidden />
            <span className="meta__v">
              {query
                ? `${filtered.length}/${projects.length}`
                : 'all visible'}
            </span>
          </span>
          <span className="meta">
            <span className="meta__k">uplinks</span>
            <span className="meta__leader" aria-hidden />
            <span className="meta__v">
              {String(CONNECTORS.length).padStart(2, '0')} live
            </span>
          </span>
          <span className="meta">
            <span className="meta__k">shortcut</span>
            <span className="meta__leader" aria-hidden />
            <span className="meta__v">
              <kbd>/</kbd> search · <kbd>↵</kbd> launch top
            </span>
          </span>
        </div>
      </header>

      <section className="toolbar" aria-label="Search and create">
        <label className="search">
          <span className="search__prompt" aria-hidden>
            ▸
          </span>
          <input
            ref={searchRef}
            className="search__input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="search by alias, name, or anything…"
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button
              className="search__clear"
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              clear
            </button>
          )}
        </label>

        <button
          type="button"
          className={`composer-toggle${composing ? ' is-open' : ''}`}
          onClick={() => setComposing((v) => !v)}
        >
          <span className="composer-toggle__plus" aria-hidden>
            {composing ? '×' : '+'}
          </span>
          {composing ? 'Cancel' : 'New entry'}
        </button>
      </section>

      {composing && (
        <form className="composer" onSubmit={submitDraft}>
          <div className="composer__hed">
            <span className="composer__num">// new node</span>
            <span className="composer__rule" aria-hidden />
            <span className="composer__hint">
              Press <kbd>Esc</kbd> to cancel
            </span>
          </div>
          <div className="composer__grid">
            <Field label="Icon" hint="emoji or image url">
              <input
                value={draft.icon}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, icon: e.target.value }))
                }
                placeholder="✺"
                maxLength={120}
              />
            </Field>
            <Field label="Name" hint="canonical title" required>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Recipe Box"
                required
              />
            </Field>
            <Field label="Alias" hint="something memorable">
              <input
                value={draft.alias}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, alias: e.target.value }))
                }
                placeholder="dinner"
              />
            </Field>
            <Field label="URL" hint="https:// optional" required>
              <input
                value={draft.url}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, url: e.target.value }))
                }
                placeholder="recipes.example.com"
                required
              />
            </Field>
            <Field label="Description" hint="one line is plenty" wide>
              <input
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="What it does, and why it earns its place."
              />
            </Field>
          </div>
          <div className="composer__actions">
            <label className="toggle">
              <input
                type="checkbox"
                checked={!!draft.comingSoon}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, comingSoon: e.target.checked }))
                }
              />
              <span className="toggle__box" aria-hidden>
                {draft.comingSoon ? '✓' : ''}
              </span>
              <span className="toggle__label">mark as coming soon</span>
            </label>
            <button type="submit" className="primary">
              File entry ↵
            </button>
          </div>
        </form>
      )}

      <main className="grid">
        {filtered.length === 0 ? (
          <div className="empty">
            <p className="empty__line">— no entries match your filter —</p>
            <button
              type="button"
              className="link"
              onClick={() => setQuery('')}
            >
              clear search
            </button>
          </div>
        ) : (
          filtered.map((p, i) => (
            <Card
              key={p.id}
              project={p}
              index={projects.indexOf(p) + 1}
              orderHint={i}
              isEditing={editingId === p.id}
              onEdit={() => setEditingId(p.id)}
              onCancel={() => setEditingId(null)}
              onSave={(updated) => {
                upsert(updated)
                setEditingId(null)
              }}
              onDelete={() => remove(p.id)}
            />
          ))
        )}
      </main>

      <UplinkSection />

      <footer className="colophon">
        <span className="colophon__row">
          <span className="colophon__mark">⟁</span>
          <span className="colophon__rule" aria-hidden />
          <span>set in Space Grotesk &amp; JetBrains Mono</span>
        </span>
        <span className="colophon__row">
          <span>state lives in&nbsp;<code>localStorage</code></span>
          <span className="colophon__rule" aria-hidden />
          <span>compiled at&nbsp;{today.toLowerCase()}</span>
        </span>
      </footer>
    </div>
  )
}

/* ─── Claude uplinks (MCP connectors) ────────────────────── */

function UplinkSection() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <section className="uplink" aria-label="Claude MCP connectors">
      <header className="uplink__hed">
        <span className="uplink__sigil" aria-hidden>
          ⟁
        </span>
        <div className="uplink__hed-text">
          <h2 className="uplink__title">Claude Uplinks</h2>
          <p className="uplink__sub">
            MCP connectors that let Claude operate these tools directly —
            reading state, filing data, doing the busywork.
          </p>
        </div>
        <span className="uplink__count">
          {String(CONNECTORS.length).padStart(2, '0')} live
        </span>
      </header>

      <div className="uplink__list">
        {CONNECTORS.map((c) => (
          <UplinkItem
            key={c.id}
            connector={c}
            open={openId === c.id}
            onToggle={() => setOpenId((v) => (v === c.id ? null : c.id))}
          />
        ))}
        <div className="uplink__soon">
          <span className="uplink__soon-dot" aria-hidden />
          more uplinks being forged — journal, resume maker, and friends will
          dock here
        </div>
      </div>
    </section>
  )
}

function UplinkItem({
  connector,
  open,
  onToggle,
}: {
  connector: Connector
  open: boolean
  onToggle: () => void
}) {
  const bodyId = `uplink-body-${connector.id}`
  return (
    <article className={`uplink-item${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="uplink-item__head"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className="uplink-item__status" aria-hidden>
          <span className="pulse" />
        </span>
        <span className="uplink-item__name">{connector.name}</span>
        <span className="uplink-item__tagline">{connector.tagline}</span>
        <span className="uplink-item__host">{hostOf(connector.endpoint)}</span>
        <span className="uplink-item__chev" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="uplink-item__body" id={bodyId}>
          <p className="uplink-item__blurb">{connector.blurb}</p>

          <div className="uplink-item__cols">
            <div className="uplink-path">
              <h3 className="uplink-path__title">
                <span className="uplink-path__badge">A</span> claude.ai · web
                &amp; desktop
              </h3>
              <ol className="uplink-path__steps">
                {connector.webSteps.map((s, i) => (
                  <Step key={i} step={s} />
                ))}
              </ol>
            </div>

            <div className="uplink-path">
              <h3 className="uplink-path__title">
                <span className="uplink-path__badge">B</span> claude code ·
                terminal
              </h3>
              <ol className="uplink-path__steps">
                {connector.cliSteps.map((s, i) => (
                  <Step key={i} step={s} />
                ))}
              </ol>
            </div>
          </div>

          <div className="uplink-item__tools">
            <span className="uplink-item__tools-label">exposed tools</span>
            {connector.tools.map((t) => (
              <span className="tool-chip" key={t.name} title={t.what}>
                {t.name}
              </span>
            ))}
          </div>

          <div className="uplink-item__try">
            <span className="uplink-item__try-label">first transmission</span>
            <CopyBlock text={connector.tryPrompt} kind="prompt" />
          </div>

          {connector.note && (
            <p className="uplink-item__note">{connector.note}</p>
          )}
        </div>
      )}
    </article>
  )
}

function Step({ step }: { step: string | { text: string; code: string } }) {
  if (typeof step === 'string') {
    return <li className="uplink-step">{step}</li>
  }
  return (
    <li className="uplink-step">
      {step.text}
      <CopyBlock text={step.code} kind="code" />
    </li>
  )
}

function CopyBlock({ text, kind }: { text: string; kind: 'code' | 'prompt' }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable; nothing to do
    }
  }

  return (
    <span className={`copyblock copyblock--${kind}`}>
      <code className="copyblock__text">{text}</code>
      <button
        type="button"
        className={`copyblock__btn${copied ? ' is-copied' : ''}`}
        onClick={copy}
        aria-label="Copy to clipboard"
      >
        {copied ? 'copied ✓' : 'copy'}
      </button>
    </span>
  )
}

function Field({
  label,
  hint,
  required,
  wide,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`field${wide ? ' field--wide' : ''}`}>
      <span className="field__label">
        {label}
        {required && <em className="field__req">·required</em>}
      </span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

type CardProps = {
  project: Project
  index: number
  orderHint: number
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (next: Project) => void
  onDelete: () => void
}

function Card({
  project,
  index,
  orderHint,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: CardProps) {
  const [draft, setDraft] = useState(project)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const aliasRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setDraft(project)
      setConfirmDelete(false)
      requestAnimationFrame(() => aliasRef.current?.focus())
    }
  }, [isEditing, project])

  const display = project.alias.trim() || project.name
  const showAka = !!project.alias.trim()
  const num = String(index).padStart(2, '0')
  const hue = (orderHint * 47) % 360 // per-card accent drift

  if (isEditing) {
    return (
      <article
        className="card card--editing"
        style={{ '--hue': hue } as React.CSSProperties}
      >
        <header className="card__hed">
          <span className="card__num">N{num}</span>
          <span className="card__hed-rule" aria-hidden />
          <span className="card__status">editing</span>
        </header>

        <div className="card__icon" aria-hidden>
          {isImageSrc(draft.icon) ? (
            <img src={draft.icon} alt="" />
          ) : (
            <span>{draft.icon || '◇'}</span>
          )}
        </div>

        <div className="card__body">
          <label className="inline-field">
            <span>alias</span>
            <input
              ref={aliasRef}
              value={draft.alias}
              onChange={(e) =>
                setDraft({ ...draft, alias: e.target.value })
              }
              placeholder="something easy to remember"
            />
          </label>
          <label className="inline-field">
            <span>name</span>
            <input
              value={draft.name}
              onChange={(e) =>
                setDraft({ ...draft, name: e.target.value })
              }
            />
          </label>
          <label className="inline-field">
            <span>icon</span>
            <input
              value={draft.icon}
              onChange={(e) =>
                setDraft({ ...draft, icon: e.target.value })
              }
              placeholder="emoji or image url"
            />
          </label>
          <label className="inline-field">
            <span>url</span>
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </label>
          <label className="inline-field inline-field--wide">
            <span>note</span>
            <input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <label className="inline-field inline-field--wide inline-field--toggle">
            <span>state</span>
            <label className="toggle toggle--inline">
              <input
                type="checkbox"
                checked={!!draft.comingSoon}
                onChange={(e) =>
                  setDraft({ ...draft, comingSoon: e.target.checked })
                }
              />
              <span className="toggle__box" aria-hidden>
                {draft.comingSoon ? '✓' : ''}
              </span>
              <span className="toggle__label">coming soon</span>
            </label>
          </label>
        </div>

        <footer className="card__foot card__foot--editing">
          <button
            type="button"
            className="ghost danger"
            onClick={() => {
              if (confirmDelete) onDelete()
              else setConfirmDelete(true)
            }}
          >
            {confirmDelete ? 'tap again to delete' : 'delete'}
          </button>
          <div className="card__actions-right">
            <button type="button" className="ghost" onClick={onCancel}>
              cancel
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => onSave(draft)}
            >
              save ↵
            </button>
          </div>
        </footer>
      </article>
    )
  }

  return (
    <article
      className={`card${project.comingSoon ? ' card--soon' : ''}`}
      style={{ '--hue': hue } as React.CSSProperties}
    >
      {project.comingSoon && (
        <span className="stamp" aria-label="coming soon">
          <span className="stamp__text">Incoming</span>
        </span>
      )}
      <header className="card__hed">
        <span className="card__num">N{num}</span>
        <span className="card__hed-rule" aria-hidden />
        <button
          type="button"
          className="card__edit"
          onClick={onEdit}
          aria-label={`Edit ${display}`}
        >
          edit
        </button>
      </header>

      <a
        className="card__face"
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="card__icon" aria-hidden>
          {isImageSrc(project.icon) ? (
            <img src={project.icon} alt="" loading="lazy" />
          ) : (
            <span>{project.icon || '◇'}</span>
          )}
        </div>

        <div className="card__body">
          <h2 className="card__title">{display}</h2>
          {showAka && (
            <p className="card__aka">
              <span className="card__aka-mark">aka</span>{' '}
              <span className="card__aka-name">{project.name}</span>
            </p>
          )}
          {project.description && (
            <p className="card__desc">{project.description}</p>
          )}
        </div>

        <footer className="card__foot">
          <span className="card__url">{hostOf(project.url)}</span>
          <span className="card__arrow" aria-hidden>
            {project.comingSoon ? '⟶' : '↗'}
          </span>
        </footer>
      </a>
    </article>
  )
}
