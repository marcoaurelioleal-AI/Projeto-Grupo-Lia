import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminPage } from './pages/AdminPage';
import { AssistantPage } from './pages/AssistantPage';
import { AuditPage } from './pages/AuditPage';
import { ChecklistsPage } from './pages/ChecklistsPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { LeadershipPage } from './pages/LeadershipPage';
import { LoginPage } from './pages/LoginPage';
import { ManualsPage } from './pages/ManualsPage';
import { ReportsPage } from './pages/ReportsPage';
import { TransfersPage } from './pages/TransfersPage';
import { WastePage } from './pages/WastePage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/lideranca/login', element: <Navigate to="/login" replace /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'checklists', element: <ChecklistsPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'waste', element: <WastePage /> },
      { path: 'transfers', element: <TransfersPage /> },
      { path: 'lideranca', element: <LeadershipPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'manuals', element: <ManualsPage /> },
      { path: 'assistant', element: <AssistantPage /> },
      { path: 'admin', element: <AdminPage /> }
    ]
  },
  { path: '*', element: <Navigate to="/" replace /> }
]);
