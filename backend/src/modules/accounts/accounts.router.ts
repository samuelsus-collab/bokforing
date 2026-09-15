import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { listAccountsSchema, createAccountSchema, updateAccountSchema } from './accounts.schema'
import * as ctrl from './accounts.controller'

const router = Router()
router.use(authenticate)

router.get('/', validate(listAccountsSchema, 'query'), ctrl.listHandler)
router.post('/', requireRole('ADMIN'), validate(createAccountSchema), ctrl.createHandler)
router.patch('/:id', requireRole('ADMIN'), validate(updateAccountSchema), ctrl.updateHandler)
router.delete('/:id', requireRole('ADMIN'), ctrl.deleteHandler)

export default router
