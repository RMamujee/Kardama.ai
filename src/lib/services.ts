// Canonical service config — single source of truth for all routes, actions, and UI.

export const SERVICE_PRICES: Record<string, number> = {
  standard:          165,
  deep:              245,
  'move-out':        380,
  'post-construction': 450,
  airbnb:            195,
}

export const SERVICE_DURATIONS: Record<string, number> = {
  standard:          180,
  deep:              240,
  'move-out':        300,
  'post-construction': 360,
  airbnb:            120,
}

export const VALID_TIMES = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
] as const

export const VALID_SERVICE_TYPES = new Set(Object.keys(SERVICE_PRICES))
