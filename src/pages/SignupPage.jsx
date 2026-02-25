import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth.jsx'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await signup(form)
      setSuccess(response?.message ?? 'Account created successfully. Redirecting to login...')
      setForm(initialForm)
      window.setTimeout(() => navigate('/login', { replace: true }), 800)
    } catch (err) {
      setError(err instanceof ApiError ? `[${err.code}] ${err.message}` : 'Signup failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
        <form onSubmit={onSubmit} className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-semibold">Signup</h1>
          <p className="mt-1 text-sm text-slate-400">Create account. Role is assigned by backend.</p>

          {error ? <p className="mt-4 rounded-md bg-red-950/70 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          {success ? <p className="mt-4 rounded-md bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{success}</p> : null}

          <div className="mt-4 grid gap-3">
            <input
              required
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              placeholder="First name"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
            <input
              required
              name="lastName"
              value={form.lastName}
              onChange={onChange}
              placeholder="Last name"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
            <input
              required
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="Email"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
            <input
              required
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Password"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-teal-400 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          <p className="mt-4 text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-300 hover:text-teal-200">
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
