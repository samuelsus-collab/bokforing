import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { reportQuerySchema } from './reports.schema'
import * as ctrl from './reports.controller'

const router = Router()
router.use(authenticate)

router.get('/result', validate(reportQuerySchema, 'query'), ctrl.resultHandler)
router.get('/balance', validate(reportQuerySchema, 'query'), ctrl.balanceHandler)
router.get('/vat', validate(reportQuerySchema, 'query'), ctrl.vatHandler)
router.get('/year-end', validate(reportQuerySchema, 'query'), ctrl.yearEndHandler)

export default router
