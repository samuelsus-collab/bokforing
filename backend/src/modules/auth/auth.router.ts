import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { authLimiter } from '../../middleware/rateLimiter.middleware'
import { loginSchema, changePasswordSchema } from './auth.schema'
import * as ctrl from './auth.controller'

const router = Router()

router.post('/login', authLimiter, validate(loginSchema), ctrl.loginHandler)
router.get('/me', authenticate, ctrl.meHandler)
router.post('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePasswordHandler)

export default router
