import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/ManagerDashboard';
import InventoryPage from './pages/InventoryPage';
import CashierPage from './pages/CashierPage';
import StaffManagementPage from './pages/StaffManagementPage';
import TransactionsPage from './pages/TransactionsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ManagerDashboard />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/cashier" element={<CashierPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/staff" element={<StaffManagementPage />} />
      </Routes>
    </Router>
  );
}

export default App;
