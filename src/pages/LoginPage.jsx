import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth.jsx'

const initialForm = { email: '', password: '' }

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? `[${err.code}] ${err.message}` : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
        <form onSubmit={onSubmit} className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-semibold">Login</h1>
          <p className="mt-1 text-sm text-slate-400">Use your account credentials to access home.</p>

          {error ? <p className="mt-4 rounded-md bg-red-950/70 px-3 py-2 text-sm text-red-200">{error}</p> : null}

          <div className="mt-4 grid gap-3">
            <input
              required
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="Email"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
            />
            <input
              required
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Password"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <p className="mt-4 text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-cyan-300 hover:text-cyan-200">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
