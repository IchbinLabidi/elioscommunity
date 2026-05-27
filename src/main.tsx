import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import SupabaseSetupGuard from './components/SupabaseSetupGuard';
import MaintenanceGuard from './components/MaintenanceGuard';
import { AuthProvider } from './contexts/AuthContext';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SupabaseSetupGuard>
      <BrowserRouter>
        <AuthProvider>
          <MaintenanceGuard>
            <App />
          </MaintenanceGuard>
        </AuthProvider>
      </BrowserRouter>
    </SupabaseSetupGuard>
  </React.StrictMode>,
);
