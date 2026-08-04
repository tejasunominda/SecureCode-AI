import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { GlassCard, GlassButton, GlassInput } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const [orgId, setOrgId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(orgId, email, password);
            toast.success('Welcome back!');
            navigate('/app');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            toast.danger(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
            <GlassCard className="w-full max-w-md p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold text-text-primary">SecureCode AI</h1>
                    <p className="mt-2 text-sm text-text-secondary">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <GlassInput
                        label="Organization ID"
                        type="text"
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        placeholder="Enter your org UUID"
                        required
                    />
                    <GlassInput
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                    />
                    <GlassInput
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    <GlassButton type="submit" variant="primary" className="w-full" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </GlassButton>
                </form>

                <p className="mt-6 text-center text-sm text-text-secondary">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-accent hover:text-accent-hover">
                        Register
                    </Link>
                </p>
            </GlassCard>
        </div>
    );
}
