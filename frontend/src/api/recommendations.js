import { httpJson } from './http'

const BASE = '/api/interaction/recommendations'

export const sendRecommendation = (data) =>
    httpJson(BASE, {
        method: 'POST',
        body: JSON.stringify(data)
    })

export const getIncomingRecommendations = () =>
    httpJson(`${BASE}/incoming`)

export const getOutgoingRecommendations = () =>
    httpJson(`${BASE}/outgoing`)

export const deleteRecommendation = (id) =>
    httpJson(`${BASE}/${id}`, {
        method: 'DELETE'
    })