import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  listVerificationsSchema,
  createVerificationSchema,
  updateVerificationSchema,
} from './verifications.schema'
import * as ctrl from './verifications.controller'

const router = Router()
router.use(authenticate)

router.get('/', validate(listVerificationsSchema, 'query'), ctrl.listHandler)
router.post('/', requireRole('USER'), validate(createVerificationSchema), ctrl.createHandler)
router.get('/:id', ctrl.getHandler)
router.patch('/:id', requireRole('USER'), validate(updateVerificationSchema), ctrl.updateHandler)
router.delete('/:id', requireRole('USER'), ctrl.deleteHandler)

export default router
