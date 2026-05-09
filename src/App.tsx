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
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Project[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // fall through to seed
  }
  const now = Date.now()
  return SEED.map((s, i) => ({
    ...s,
    id: uid(),
    added: now - (SEED.length - i) * 1000,
  }))
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
      [p.alias, p.name, p.description, p.url]
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
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />

      <header className="masthead">
        <div className="masthead__row">
          <span className="masthead__mark">
            <span className="dot" aria-hidden /> IDX. <em>vol. i</em>
          </span>
          <span className="masthead__rule" aria-hidden />
          <span className="masthead__date">{today}</span>
        </div>

        <h1 className="title">
          <span className="title__line">Personal</span>
          <span className="title__line title__line--accent">
            Directory<span className="title__period">.</span>
          </span>
        </h1>

        <p className="lede">
          A working catalogue of self-built tools, kept for the keeper. Aliases
          and entries live in this browser — bring your own&nbsp;dictionary.
        </p>

        <div className="masthead__row masthead__row--bottom">
          <span className="meta">
            <span className="meta__k">entries</span>
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
            <span className="composer__num">Nº new</span>
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

      <footer className="colophon">
        <span className="colophon__row">
          <span className="colophon__mark">¶</span>
          <span className="colophon__rule" aria-hidden />
          <span>set in Fraunces &amp; JetBrains Mono</span>
        </span>
        <span className="colophon__row">
          <span>state lives in&nbsp;<code>localStorage</code></span>
          <span className="colophon__rule" aria-hidden />
          <span>printed daily at&nbsp;{today.toLowerCase()}</span>
        </span>
      </footer>
    </div>
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
  const tilt = ((orderHint % 5) - 2) * 0.12 // -0.24deg .. +0.24deg

  if (isEditing) {
    return (
      <article
        className="card card--editing"
        style={{ '--tilt': `0deg` } as React.CSSProperties}
      >
        <header className="card__hed">
          <span className="card__num">Nº&nbsp;{num}</span>
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
      className="card"
      style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}
    >
      <header className="card__hed">
        <span className="card__num">Nº&nbsp;{num}</span>
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
            ↗
          </span>
        </footer>
      </a>
    </article>
  )
}
