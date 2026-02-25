import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth.jsx'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, isRefreshing, getAuthorized, refreshTokens, logout } = useAuth()
  const [status, setStatus] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null)

  const runAction = async (action, callback) => {
    setLoadingAction(action)
    setStatus('')

    try {
      await callback()
    } catch (error) {
      setStatus(error instanceof ApiError ? `[${error.code}] ${error.message}` : 'Unexpected error.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleRefresh = async () => {
    await runAction('refresh', async () => {
      await refreshTokens()
      setStatus('Token refreshed.')
    })
  }

  const handleTest = async () => {
    await runAction('test', async () => {
      const result = await getAuthorized('/api/test')
      setTestResult(result)
      setStatus('Protected endpoint called successfully.')
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-3xl font-semibold">Home (Protected)</h1>
          <p className="mt-2 text-sm text-slate-400">Visible only for authenticated users.</p>
        </header>

        {status ? (
          <p className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">{status}</p>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-medium">User details</h2>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="text-slate-400">User ID:</dt>
              <dd className="font-mono text-slate-100">{user?.userId ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="text-slate-400">Email:</dt>
              <dd className="font-mono text-slate-100">{user?.email ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="text-slate-400">Role:</dt>
              <dd className="font-mono text-slate-100">{user?.role ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="text-slate-400">Access expires:</dt>
              <dd className="font-mono text-slate-100">{user?.accessTokenExpiresAt ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="text-slate-400">Refresh expires:</dt>
              <dd className="font-mono text-slate-100">{user?.refreshTokenExpiresAt ?? '-'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="text-slate-400">Auto-refresh state:</dt>
              <dd className="font-mono text-slate-100">{isRefreshing ? 'refreshing' : 'idle'}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loadingAction === 'refresh'}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {loadingAction === 'refresh' ? 'Refreshing...' : 'Refresh token'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={loadingAction === 'test'}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
            >
              {loadingAction === 'test' ? 'Calling...' : 'Call /api/test'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
            >
              Logout
            </button>
          </div>

          {testResult ? (
            <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          ) : null}
        </section>
      </div>
    </main>
  )
}
