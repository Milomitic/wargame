import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore.js";
import LoginPage from "./pages/LoginPage.js";
import RegisterPage from "./pages/RegisterPage.js";
import GameShell from "./components/layout/GameShell.js";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const player = useAuthStore((s) => s.player);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="spinner w-10 h-10" />
        <p className="text-sm text-[var(--text-muted)]">Preparing the realm...</p>
      </div>
    );
  }

  if (!player) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <GameShell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <GameShell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/army"
        element={
          <ProtectedRoute>
            <GameShell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diplomacy"
        element={
          <ProtectedRoute>
            <GameShell />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
