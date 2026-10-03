import rateLimit from 'express-rate-limit'

// Generell begränsning för hela API:t.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'För många förfrågningar, försök igen senare' } },
})

// Striktare begränsning för inloggning (skydd mot brute force).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // lyckade inloggningar räknas inte
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'För många inloggningsförsök, försök igen om en stund' } },
})
