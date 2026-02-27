import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { createOrganization, getPlanOptions, inviteOrganizationMember } from '../lib/organizationApi'
import { useAuth } from '../hooks/useAuth.jsx'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, isRefreshing, getAuthorized, refreshTokens, logout } = useAuth()
  const planOptions = getPlanOptions()
  const [status, setStatus] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [organizationResult, setOrganizationResult] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [organizationMembers, setOrganizationMembers] = useState({})
  const [organizationMembersErrors, setOrganizationMembersErrors] = useState({})
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [organizationsError, setOrganizationsError] = useState('')
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    isMenager: false,
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteStatus, setInviteStatus] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [loadingAction, setLoadingAction] = useState(null)
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    planId: planOptions[0]?.id ?? '',
  })

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

  const handleOrganizationChange = (event) => {
    const { name, value } = event.target
    setOrganizationForm((current) => ({ ...current, [name]: value }))
  }

  const handleCreateOrganization = async (event) => {
    event.preventDefault()

    await runAction('organization', async () => {
      if (!user?.userId) {
        throw new ApiError('Missing logged in user id.', 400, 'MISSING_USER_ID')
      }

      const payload = await createOrganization({
        name: organizationForm.name,
        planId: organizationForm.planId,
        createdByUserId: user.userId,
      })

      setOrganizationResult(payload)
      setOrganizationForm((current) => ({ ...current, name: '' }))
      setStatus('Organization created successfully.')
      await loadOrganizations()
    })
  }

  const loadOrganizations = async () => {
    if (!user?.userId) {
      setOrganizations([])
      return
    }

    setOrganizationsLoading(true)
    setOrganizationsError('')

    try {
      const result = await getAuthorized(`/api/organizations/user/${user.userId}`)
      const items = Array.isArray(result) ? result : []
      setOrganizations(items)
      await loadOrganizationMembers(items)
      setSelectedOrganization((current) => {
        if (!items.length) {
          return null
        }

        if (current && items.some((item) => item.organizationId === current.organizationId)) {
          return current
        }

        return items[0]
      })
    } catch (error) {
      setOrganizationsError(error instanceof ApiError ? `[${error.code}] ${error.message}` : 'Failed to load organizations.')
    } finally {
      setOrganizationsLoading(false)
    }
  }

  const loadOrganizationMembers = async (items) => {
    if (!user?.userId || !Array.isArray(items) || items.length === 0) {
      setOrganizationMembers({})
      setOrganizationMembersErrors({})
      return
    }

    const entries = await Promise.all(
      items.map(async (organization) => {
        try {
          const members = await getAuthorized(
            `/api/organizations/${organization.organizationId}/members?requestUserId=${user.userId}`,
          )
          return {
            organizationId: organization.organizationId,
            members: Array.isArray(members) ? members : [],
            error: '',
          }
        } catch (error) {
          return {
            organizationId: organization.organizationId,
            members: [],
            error: error instanceof ApiError ? `[${error.code}] ${error.message}` : 'Failed to load members.',
          }
        }
      }),
    )

    setOrganizationMembers(Object.fromEntries(entries.map((entry) => [entry.organizationId, entry.members])))
    setOrganizationMembersErrors(Object.fromEntries(entries.map((entry) => [entry.organizationId, entry.error])))
  }

  useEffect(() => {
    loadOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId])

  const handleInviteChange = (event) => {
    const { name, value, type, checked } = event.target
    setInviteForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleInviteSubmit = async (event) => {
    event.preventDefault()

    if (!selectedOrganization?.organizationId) {
      setInviteError('Select organization first.')
      return
    }

    if (!user?.userId) {
      setInviteError('Missing logged in user id.')
      return
    }

    setInviteLoading(true)
    setInviteError('')
    setInviteStatus('')

    try {
      const payload = await inviteOrganizationMember(selectedOrganization.organizationId, {
        invitedByUserId: user.userId,
        email: inviteForm.email,
        role: inviteForm.isMenager ? 'MENAGER' : 'EMPLOYEE',
      })

      setInviteStatus(
        `Invitation sent to ${payload.email} as ${payload.role}. Link: ${payload.invitationLink}`,
      )
      setInviteForm({ email: '', isMenager: false })
    } catch (error) {
      setInviteError(error instanceof ApiError ? `[${error.code}] ${error.message}` : 'Failed to send invitation.')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-6">
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
                  <dt className="text-slate-400">First name:</dt>
                  <dd className="font-mono text-slate-100">{user?.firstName ?? '-'}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <dt className="text-slate-400">Last name:</dt>
                  <dd className="font-mono text-slate-100">{user?.lastName ?? '-'}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <dt className="text-slate-400">Full name:</dt>
                  <dd className="font-mono text-slate-100">{user?.fullName ?? '-'}</dd>
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

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-medium">Create organization</h2>
              <p className="mt-2 text-sm text-slate-400">
                Organization is linked to your profile and selected plan.
              </p>

              <form onSubmit={handleCreateOrganization} className="mt-4 grid gap-3">
                <input
                  required
                  name="name"
                  value={organizationForm.name}
                  onChange={handleOrganizationChange}
                  placeholder="Organization name"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />

                <select
                  required
                  name="planId"
                  value={organizationForm.planId}
                  onChange={handleOrganizationChange}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                >
                  {planOptions.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.label} ({plan.code})
                    </option>
                  ))}
                </select>

                <input
                  readOnly
                  value={user?.fullName ?? ''}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-400"
                />

                <button
                  type="submit"
                  disabled={loadingAction === 'organization'}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loadingAction === 'organization' ? 'Creating...' : 'Create organization'}
                </button>
              </form>

              {organizationResult ? (
                <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
                  {JSON.stringify(organizationResult, null, 2)}
                </pre>
              ) : null}
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your organizations</h2>
              <button
                type="button"
                onClick={loadOrganizations}
                disabled={organizationsLoading}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
              >
                {organizationsLoading ? 'Loading...' : 'Reload'}
              </button>
            </div>

            {organizationsError ? (
              <p className="mt-3 rounded-md bg-red-950/70 px-3 py-2 text-xs text-red-200">{organizationsError}</p>
            ) : null}

            {!organizationsLoading && !organizationsError && organizations.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No organizations found for this user.</p>
            ) : null}

            <ul className="mt-3 grid gap-2">
              {organizations.map((item) => (
                <li
                  key={item.organizationId}
                  className={`rounded-xl border p-3 ${
                    selectedOrganization?.organizationId === item.organizationId
                      ? 'border-emerald-500 bg-slate-900'
                      : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-100">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Role</span>
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-200">{item.role}</span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Members</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {(organizationMembers[item.organizationId] ?? []).map((member) => (
                        <li
                          key={member.userId}
                          className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-2 py-1"
                        >
                          <span className="text-slate-200">
                            {`${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || '-'}
                          </span>
                          <span className="text-slate-400">{member.role}</span>
                        </li>
                      ))}
                    </ul>
                    {organizationMembersErrors[item.organizationId] ? (
                      <p className="mt-1 text-xs text-red-400">{organizationMembersErrors[item.organizationId]}</p>
                    ) : null}
                    {!organizationMembersErrors[item.organizationId] &&
                    (organizationMembers[item.organizationId] ?? []).length === 0 ? (
                      <p className="mt-1 text-xs text-slate-500">No members found.</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrganization(item)
                      setInviteError('')
                      setInviteStatus('')
                    }}
                    className="mt-3 w-full rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
                  >
                    {selectedOrganization?.organizationId === item.organizationId ? 'Selected' : 'Manage'}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <h3 className="text-sm font-semibold text-slate-100">Add member</h3>
              <p className="mt-1 text-xs text-slate-400">
                {selectedOrganization
                  ? `Organization: ${selectedOrganization.name}`
                  : 'Select organization to invite a member.'}
              </p>

              {inviteError ? <p className="mt-3 rounded-md bg-red-950/70 px-2 py-1 text-xs text-red-200">{inviteError}</p> : null}
              {inviteStatus ? (
                <p className="mt-3 break-all rounded-md bg-emerald-950/60 px-2 py-1 text-xs text-emerald-200">{inviteStatus}</p>
              ) : null}

              <form onSubmit={handleInviteSubmit} className="mt-3 grid gap-2">
                <input
                  required
                  name="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={handleInviteChange}
                  placeholder="Member email"
                  disabled={!selectedOrganization || inviteLoading}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs outline-none focus:border-emerald-400 disabled:opacity-60"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    name="isMenager"
                    type="checkbox"
                    checked={inviteForm.isMenager}
                    onChange={handleInviteChange}
                    disabled={!selectedOrganization || inviteLoading}
                  />
                  Assign role MENAGER (default is EMPLOYEE)
                </label>
                <button
                  type="submit"
                  disabled={!selectedOrganization || inviteLoading}
                  className="rounded-md bg-cyan-500 px-3 py-2 text-xs font-medium text-slate-900 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending invite...' : 'Send invitation email'}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
