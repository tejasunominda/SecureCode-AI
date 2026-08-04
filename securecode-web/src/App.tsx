import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toast/Toaster';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import HRDashboardPage from '@/pages/HRDashboardPage';
import CandidateInstructionsPage from '@/pages/CandidateInstructionsPage';
import CandidateCodingPage from '@/pages/CandidateCodingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
}

function App() {
    const restore = useAuthStore((s) => s.restore);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    useEffect(() => {
        restore();
    }, [restore]);

    return (
        <>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/test/:token" element={<CandidateInstructionsPage />} />
                <Route path="/test/:sessionId/:section" element={<CandidateCodingPage />} />
                <Route path="/test/:sessionId/terminated" element={<div className="flex min-h-screen items-center justify-center bg-canvas"><div className="text-center"><h1 className="text-2xl font-semibold text-danger">Test Terminated</h1><p className="mt-2 text-sm text-text-secondary">Your test was terminated due to proctoring violations.</p></div></div>} />
                <Route path="/test/:sessionId/complete" element={<div className="flex min-h-screen items-center justify-center bg-canvas"><div className="text-center"><h1 className="text-2xl font-semibold text-success">Test Submitted</h1><p className="mt-2 text-sm text-text-secondary">Your assessment has been submitted. You will be contacted by the hiring team.</p></div></div>} />
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <AppShell userEmail={user?.email} onLogout={logout}>
                                <DashboardPage />
                            </AppShell>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/hr"
                    element={
                        <ProtectedRoute>
                            <AppShell userEmail={user?.email} onLogout={logout}>
                                <HRDashboardPage />
                            </AppShell>
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
            <Toaster />
        </>
    );
}

export default App;
