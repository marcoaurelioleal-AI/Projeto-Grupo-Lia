import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AssistantPage } from './pages/AssistantPage';
import { ChecklistsPage } from './pages/ChecklistsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ManualsPage } from './pages/ManualsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
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
      { path: 'manuals', element: <ManualsPage /> },
      { path: 'assistant', element: <AssistantPage /> }
    ]
  },
  { path: '*', element: <Navigate to="/" replace /> }
]);
