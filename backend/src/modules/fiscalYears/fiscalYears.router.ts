import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { createFiscalYearSchema } from './fiscalYears.schema'
import * as ctrl from './fiscalYears.controller'

const router = Router()
router.use(authenticate)

router.get('/', ctrl.listHandler)
router.post('/', requireRole('ADMIN'), validate(createFiscalYearSchema), ctrl.createHandler)
router.post('/:id/close', requireRole('ADMIN'), ctrl.closeHandler)
router.post('/:id/reopen', requireRole('ADMIN'), ctrl.reopenHandler)

export default router
