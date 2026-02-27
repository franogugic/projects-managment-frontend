import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { acceptOrganizationInvitation, previewOrganizationInvitation } from '../lib/organizationApi'

export default function OrganizationInvitationAcceptPage() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [invitationPreview, setInvitationPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPreview = async () => {
      if (!token) {
        return
      }

      setPreviewLoading(true)
      setError('')

      try {
        const preview = await previewOrganizationInvitation(token)
        setInvitationPreview(preview)
      } catch (err) {
        setError(err instanceof ApiError ? `[${err.code}] ${err.message}` : 'Failed to load invitation.')
      } finally {
        setPreviewLoading(false)
      }
    }

    loadPreview()
  }, [token])

  const onAccept = async () => {
    if (!token) {
      setError('Missing invitation token.')
      return
    }

    setLoading(true)
    setError('')
    setStatus('')

    try {
      const result = await acceptOrganizationInvitation({ token })
      setStatus(result?.message ?? 'Invitation accepted successfully.')
    } catch (err) {
      setError(err instanceof ApiError ? `[${err.code}] ${err.message}` : 'Failed to accept invitation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-10">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-semibold">Organization invitation</h1>
          <p className="mt-2 text-sm text-slate-400">Confirm to join the organization.</p>

          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-400">Organization</p>
            <p className="mt-1 font-medium text-slate-100">
              {previewLoading
                ? 'Loading...'
                : invitationPreview?.organizationName ?? (token ? 'Unavailable' : 'Token is missing from URL.')}
            </p>
          </div>

          {error ? <p className="mt-4 rounded-md bg-red-950/70 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          {status ? <p className="mt-4 rounded-md bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{status}</p> : null}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onAccept}
              disabled={loading || !token}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? 'Accepting...' : 'Accept invitation'}
            </button>
            <Link
              to="/login"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
