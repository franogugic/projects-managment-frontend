import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, getJson, postJson } from '../lib/api'
import { clearSession, loadSession, saveSession } from '../lib/authSession'
import { decodeJwtPayload } from '../utils/decodeJwt'

const AuthContext = createContext(null)

function normalizeTokenPayload(payload, email) {
  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    accessTokenExpiresAt: payload.accessTokenExpiresAt,
    refreshTokenExpiresAt: payload.refreshTokenExpiresAt,
    email: email ?? null,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshPromiseRef = useRef(null)

  const setAndPersistSession = useCallback((nextSession) => {
    setSession(nextSession)
    if (nextSession) {
      saveSession(nextSession)
    } else {
      clearSession()
    }
  }, [])

  const signup = useCallback(async (request) => {
    return postJson('/api/auth/signup', request)
  }, [])

  const login = useCallback(
    async (request) => {
      const response = await postJson('/api/auth/login', request)
      const nextSession = normalizeTokenPayload(response, request.email)
      setAndPersistSession(nextSession)
      return response
    },
    [setAndPersistSession],
  )

  const logout = useCallback(() => {
    setAndPersistSession(null)
  }, [setAndPersistSession])

  const refreshTokens = useCallback(async () => {
    if (!session?.refreshToken) {
      throw new ApiError('No refresh token available.', 401, 'NO_REFRESH_TOKEN')
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const refreshOperation = (async () => {
      setIsRefreshing(true)

      try {
        const response = await postJson('/api/auth/refresh', {
          refreshToken: session.refreshToken,
        })

        const nextSession = normalizeTokenPayload(response, session.email)
        setAndPersistSession(nextSession)
        return nextSession
      } catch (error) {
        setAndPersistSession(null)
        throw error
      } finally {
        setIsRefreshing(false)
        refreshPromiseRef.current = null
      }
    })()

    refreshPromiseRef.current = refreshOperation
    return refreshOperation
  }, [session, setAndPersistSession])

  const getAuthorized = useCallback(
    async (path) => {
      if (!session?.accessToken) {
        throw new ApiError('You are not logged in.', 401, 'UNAUTHORIZED')
      }

      try {
        return await getJson(path, session.accessToken)
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401 || !session.refreshToken) {
          throw error
        }

        const refreshedSession = await refreshTokens()
        return getJson(path, refreshedSession.accessToken)
      }
    },
    [refreshTokens, session],
  )

  useEffect(() => {
    if (!session?.accessTokenExpiresAt || !session.refreshToken) {
      return undefined
    }

    const expiresAtMs = new Date(session.accessTokenExpiresAt).getTime()
    const refreshInMs = expiresAtMs - Date.now() - 30_000
    const safeDelay = Math.max(refreshInMs, 0)

    const timeoutId = window.setTimeout(async () => {
      try {
        await refreshTokens()
      } catch {
        setAndPersistSession(null)
      }
    }, safeDelay)

    return () => window.clearTimeout(timeoutId)
  }, [refreshTokens, session, setAndPersistSession])

  const jwtPayload = useMemo(() => decodeJwtPayload(session?.accessToken), [session?.accessToken])

  const user = useMemo(() => {
    if (!session) {
      return null
    }

    const firstName = jwtPayload?.first_name ?? null
    const lastName = jwtPayload?.last_name ?? null

    return {
      userId: jwtPayload?.sub ?? null,
      email: session.email ?? jwtPayload?.email ?? null,
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' ') || null,
      role: jwtPayload?.role ?? jwtPayload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? null,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    }
  }, [jwtPayload, session])

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated: Boolean(session?.accessToken),
      isRefreshing,
      signup,
      login,
      logout,
      refreshTokens,
      getAuthorized,
    }),
    [getAuthorized, isRefreshing, login, logout, refreshTokens, session, signup, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }
  return context
}
