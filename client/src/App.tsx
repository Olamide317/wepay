import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrganizerLayout } from './layouts/OrganizerLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { OrganizerHubPage } from './pages/OrganizerHubPage';
import { PublicCollectionPage } from './pages/PublicCollectionPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { RegisterPage } from './pages/RegisterPage';
import { AllTransactionsPage } from './pages/dashboard/AllTransactionsPage';
import { CollectionDetailsPage } from './pages/dashboard/CollectionDetailsPage';
import { CollectionLedgerPage } from './pages/dashboard/CollectionLedgerPage';
import { CreateCollectionPage } from './pages/dashboard/CreateCollectionPage';
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';
import { MyCollectionsPage } from './pages/dashboard/MyCollectionsPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/c/:slug" element={<PublicCollectionPage />} />
          <Route path="/u/:handle" element={<OrganizerHubPage />} />
          <Route path="/receipt/:code" element={<ReceiptPage />} />

          {/* Organizer Protected Routes */}
          <Route path="/dashboard" element={<OrganizerLayout />}>
            <Route index element={<DashboardOverviewPage />} />
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
