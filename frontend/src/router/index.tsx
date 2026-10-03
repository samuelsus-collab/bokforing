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
import { VatReportPage } from '@/pages/reports/VatReportPage'
import { LedgerPage } from '@/pages/reports/LedgerPage'
import { YearEndPage } from '@/pages/reports/YearEndPage'
import { SiePage } from '@/pages/sie/SiePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

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
          { path: 'rapporter/moms', element: <VatReportPage /> },
          { path: 'huvudbok', element: <LedgerPage /> },
          { path: 'arsbokslut', element: <YearEndPage /> },
          { path: 'sie', element: <SiePage /> },
          { path: 'kontoplan', element: <AccountsPage /> },
          { path: 'rakenskapsar', element: <FiscalYearsPage /> },
          { path: 'installningar', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
