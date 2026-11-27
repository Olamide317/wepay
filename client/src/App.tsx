import React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizerLayout } from './layouts/OrganizerLayout';
import { LoginPage } from './pages/LoginPage';
import { OrganizerHubPage } from './pages/OrganizerHubPage';
import { FounderAdminPage } from './pages/admin/FounderAdminPage';
import { PublicCollectionPage } from './pages/PublicCollectionPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { RegisterPage } from './pages/RegisterPage';
import { AllTransactionsPage } from './pages/dashboard/AllTransactionsPage';
import { CollectionDetailsPage } from './pages/dashboard/CollectionDetailsPage';
import { CollectionLedgerPage } from './pages/dashboard/CollectionLedgerPage';
import { CreateCollectionPage } from './pages/dashboard/CreateCollectionPage';
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';
import { MyCollectionsPage } from './pages/dashboard/MyCollectionsPage';
import { ProductOverviewPage } from './pages/dashboard/ProductOverviewPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';

const FounderAdminGuard: React.FC = () => {
  const { organizer, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading founder access...</p>
      </div>
    );
  }
  if (!organizer?.isFounder && organizer?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default Root Route: WePay Overview */}
          <Route path="/" element={<OrganizerLayout requireAuth={false} />}>
            <Route index element={<ProductOverviewPage />} />
          </Route>

          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/c/:slug" element={<PublicCollectionPage />} />
          <Route path="/u/:handle" element={<OrganizerHubPage />} />
          <Route path="/receipt/:code" element={<ReceiptPage />} />

          <Route element={<FounderAdminGuard />}>
            <Route path="/admin" element={<OrganizerLayout />}>
              <Route index element={<FounderAdminPage />} />
            </Route>
          </Route>

          {/* Organizer Protected Routes */}
          <Route path="/dashboard" element={<OrganizerLayout />}>
            <Route index element={<DashboardOverviewPage />} />
            <Route path="overview" element={<Navigate to="/" replace />} />
            <Route path="collections" element={<MyCollectionsPage />} />
            <Route path="create" element={<CreateCollectionPage />} />
            <Route path="collections/:id" element={<CollectionDetailsPage />} />
            <Route path="collections/:id/ledger" element={<CollectionLedgerPage />} />
            <Route path="transactions" element={<AllTransactionsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
