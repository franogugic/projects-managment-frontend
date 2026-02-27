import { getJson, postJson } from './api'

const PLAN_OPTIONS = [
  { id: '11111111-1111-1111-1111-111111111111', code: 'FREE', label: 'Free' },
  { id: '22222222-2222-2222-2222-222222222222', code: 'PREMIUM', label: 'Premium' },
  { id: '33333333-3333-3333-3333-333333333333', code: 'PRO', label: 'Pro' },
]

export async function createOrganization(payload) {
  return postJson('/api/organizations', payload)
}

export async function inviteOrganizationMember(organizationId, payload) {
  return postJson(`/api/organizations/${organizationId}/members/invite`, payload)
}

export async function acceptOrganizationInvitation(payload) {
  return postJson('/api/organizations/member-invitations/accept', payload)
}

export async function previewOrganizationInvitation(token) {
  const query = new URLSearchParams({ token }).toString()
  return getJson(`/api/organizations/member-invitations/preview?${query}`)
}

export async function getOrganizationMembers(organizationId, requestUserId) {
  const query = new URLSearchParams({ requestUserId }).toString()
  return getJson(`/api/organizations/${organizationId}/members?${query}`)
}

export function getPlanOptions() {
  return PLAN_OPTIONS
}
