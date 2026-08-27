import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from '@/hooks/useTheme';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toast/Toaster';
import { toast } from '@/components/ui/toast/useToastStore';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import HRDashboardPage from '@/pages/HRDashboardPage';
import CandidateInstructionsPage from '@/pages/CandidateInstructionsPage';
import CandidateCodingPage from '@/pages/CandidateCodingPage';
import QuestionBankPage from '@/pages/QuestionBankPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import CandidateResultsPage from '@/pages/CandidateResultsPage';
import ProctorReviewPage from '@/pages/ProctorReviewPage';
import OrgManagementPage from '@/pages/OrgManagementPage';
import AssessmentCreationPage from '@/pages/AssessmentCreationPage';
import AuditLogPage from '@/pages/AuditLogPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
    const user = useAuthStore((s) => s.user);
    const hasSuperAdmin = user?.roles?.some(r => r.toUpperCase() === 'SUPER_ADMIN');
    const hasRole = hasSuperAdmin || user?.roles?.some(r => roles.some(allowed => r.toUpperCase() === allowed.toUpperCase()));
    if (!hasRole) {
        toast.warning('Access denied', 'You do not have permission to view that page.');
        return <Navigate to="/app" replace />;
    }
    return <>{children}</>;
}

function App() {
    const restore = useAuthStore((s) => s.restore);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    useTheme();

    useEffect(() => {
        restore();
    }, [restore]);

    return (
        <>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/test/:token" element={<CandidateInstructionsPage />} />
                <Route path="/test/:sessionId/:section" element={<CandidateCodingPage />} />
                <Route path="/test/:sessionId/terminated" element={<div className="flex min-h-screen items-center justify-center bg-canvas"><div className="text-center"><h1 className="text-2xl font-semibold text-danger">Test Terminated</h1><p className="mt-2 text-sm text-text-secondary">Your test was terminated due to proctoring violations.</p></div></div>} />
                <Route path="/test/:sessionId/complete" element={<CandidateResultsPage />} />
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                <DashboardPage />
                            </AppShell>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/hr"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['HR', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <HRDashboardPage />
                                </AppShell>
                            </RoleRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/questions"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['HR', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <QuestionBankPage />
                                </AppShell>
                            </RoleRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/proctor"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['TECHNICAL_MANAGER', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <ProctorReviewPage />
                                </AppShell>
                            </RoleRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/analytics"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['TECHNICAL_MANAGER', 'HR', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <AnalyticsPage />
                                </AppShell>
                            </RoleRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/settings"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['HR', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <SettingsPage />
                                </AppShell>
                            </RoleRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/org"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['HR', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <OrgManagementPage />
                                </AppShell>
                            </RoleRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/assessments"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['HR', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <AssessmentCreationPage />
                                </AppShell>
                            </RoleRoute>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/audit"
                    element={
                        <ProtectedRoute>
                            <RoleRoute roles={['HR', 'TECHNICAL_MANAGER', 'SUPER_ADMIN']}>
                                <AppShell userEmail={user?.email} userRoles={user?.roles} onLogout={logout}>
                                    <AuditLogPage />
                                </AppShell>
                            </RoleRoute>
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
