import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { exportSieSchema, importSieSchema } from './sie.schema'
import * as ctrl from './sie.controller'

const router = Router()
router.use(authenticate)

router.get('/export', validate(exportSieSchema, 'query'), ctrl.exportHandler)
router.post('/import', requireRole('USER'), validate(importSieSchema), ctrl.importHandler)

export default router
