import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/Layout';
import { LoginPage, RegisterPage } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import {
  AccountsPage,
  CategoriesPage,
  BudgetsPage,
  RecurringPage,
  TransfersPage,
  AlertsPage,
} from './pages/OtherPages';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/accounts"     element={<AccountsPage />} />
            <Route path="/categories"   element={<CategoriesPage />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets"      element={<BudgetsPage />} />
            <Route path="/recurring"    element={<RecurringPage />} />
            <Route path="/transfers"    element={<TransfersPage />} />
            <Route path="/alerts"       element={<AlertsPage />} />
            <Route path="/analytics"    element={<Analytics />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
