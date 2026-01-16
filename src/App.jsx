import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function apiFetch(path, options) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    })

    const isJson = (res.headers.get('content-type') || '').includes('application/json')
    const data = isJson ? await res.json() : await res.text()

    if (!res.ok) {
        const msg =
            typeof data === 'string'
                ? data
                : data?.error
                    ? `${data.error}${data.details ? ' (see details)' : ''}`
                    : 'Request failed'
        const err = new Error(msg)
        err.status = res.status
        err.data = data
        throw err
    }

    return data
}

export default function App() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')

    const canCreate = useMemo(() => title.trim().length > 0 && body.trim().length > 0, [title, body])

    async function loadNotes() {
        setError('')
        setLoading(true)
        try {
            const json = await apiFetch('/notes', { method: 'GET' })
            setItems(Array.isArray(json.items) ? json.items : [])
        } catch (e) {
            setError(e.message || 'Failed to load notes')
        } finally {
            setLoading(false)
        }
    }

    async function createNote(e) {
        e.preventDefault()
        if (!canCreate) return

        setError('')
        setBusy(true)
        try {
            const created = await apiFetch('/notes', {
                method: 'POST',
                body: JSON.stringify({ title: title.trim(), body: body.trim() })
            })
            setItems((prev) => [created, ...prev])
            setTitle('')
            setBody('')
        } catch (e) {
            setError(e.message || 'Failed to create note')
        } finally {
            setBusy(false)
        }
    }

    async function deleteNote(id) {
        setError('')
        setBusy(true)
        try {
            await apiFetch(`/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
            setItems((prev) => prev.filter((n) => n.id !== id))
        } catch (e) {
            setError(e.message || 'Failed to delete note')
        } finally {
            setBusy(false)
        }
    }

    useEffect(() => {
        loadNotes()
    }, [])

    return (
        <div className="page">
            <header className="header">
                <h1>Notes</h1>
                <div className="sub">
                    <button onClick={loadNotes} disabled={loading || busy}>
                        {loading ? 'Loading…' : 'Refresh'}
                    </button>
                    <span className="hint">Backend: GET/POST/DELETE /notes</span>
                </div>
            </header>

            <section className="card">
                <h2>Create note</h2>
                <form onSubmit={createNote} className="form">
                    <label>
                        Title
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Short title"
                            maxLength={100}
                            disabled={busy}
                        />
                    </label>

                    <label>
                        Body
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write something…"
                            maxLength={2000}
                            rows={5}
                            disabled={busy}
                        />
                    </label>

                    <div className="row">
                        <button type="submit" disabled={!canCreate || busy}>
                            {busy ? 'Saving…' : 'Create'}
                        </button>
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                                setTitle('')
                                setBody('')
                                setError('')
                            }}
                            disabled={busy}
                        >
                            Clear
                        </button>
                    </div>
                </form>

                {error ? <p className="error">⚠️ {error}</p> : null}
            </section>

            <section className="card">
                <h2>
                    Notes list <span className="pill">{items.length}</span>
                </h2>

                {loading ? (
                    <p>Loading…</p>
                ) : items.length === 0 ? (
                    <p className="muted">No notes yet. Create the first one.</p>
                ) : (
                    <ul className="list">
                        {items.map((n) => (
                            <li key={n.id} className="item">
                                <div className="itemHeader">
                                    <strong className="title">{n.title}</strong>
                                    <button className="danger" onClick={() => deleteNote(n.id)} disabled={busy}>
                                        Delete
                                    </button>
                                </div>
                                <p className="body">{n.body}</p>
                                <div className="meta">
                                    <span>ID: {n.id}</span>
                                    <span>Updated: {new Date(n.updatedAt).toLocaleString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
