import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { config } from './config'
import { errorHandler } from './middleware/errorHandler.middleware'
import authRouter from './modules/auth/auth.router'
import accountsRouter from './modules/accounts/accounts.router'
import fiscalYearsRouter from './modules/fiscalYears/fiscalYears.router'
import verificationsRouter from './modules/verifications/verifications.router'
import reportsRouter from './modules/reports/reports.router'
import sieRouter from './modules/sie/sie.router'

const app = express()

app.use(helmet())
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }))
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/accounts', accountsRouter)
app.use('/api/v1/fiscal-years', fiscalYearsRouter)
app.use('/api/v1/verifications', verificationsRouter)
app.use('/api/v1/reports', reportsRouter)
app.use('/api/v1/sie', sieRouter)

app.use(errorHandler)

export default app
