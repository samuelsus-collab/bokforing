import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AccountsPage } from '@/pages/accounts/AccountsPage'
import { FiscalYearsPage } from '@/pages/fiscalYears/FiscalYearsPage'
import { VerificationsPage } from '@/pages/verifications/VerificationsPage'
import { VerificationFormPage } from '@/pages/verifications/VerificationFormPage'
import { VerificationDetailPage } from '@/pages/verifications/VerificationDetailPage'
import { ResultReportPage } from '@/pages/reports/ResultReportPage'
import { BalanceReportPage } from '@/pages/reports/BalanceReportPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/verifikationer" replace /> },
          { path: 'verifikationer', element: <VerificationsPage /> },
          { path: 'verifikationer/ny', element: <VerificationFormPage /> },
          { path: 'verifikationer/:id', element: <VerificationDetailPage /> },
          { path: 'verifikationer/:id/redigera', element: <VerificationFormPage /> },
          { path: 'rapporter/resultat', element: <ResultReportPage /> },
          { path: 'rapporter/balans', element: <BalanceReportPage /> },
          { path: 'kontoplan', element: <AccountsPage /> },
          { path: 'rakenskapsar', element: <FiscalYearsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
