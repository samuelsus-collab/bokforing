import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { loginSchema } from './auth.schema'
import * as ctrl from './auth.controller'

const router = Router()

router.post('/login', validate(loginSchema), ctrl.loginHandler)
router.get('/me', authenticate, ctrl.meHandler)

export default router
