import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';

export default function RegisterPage() {
    const navigate = useNavigate();
    const register = useAuthStore((s) => s.register);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [role, setRole] = useState('HR');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(email, password, orgName, role);
            toast.success('Account created successfully!');
            navigate('/app');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            toast.danger(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
            <GlassCard className="w-full max-w-md p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold text-text-primary">Create Account</h1>
                    <p className="mt-2 text-sm text-text-secondary">Register your organization</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <GlassInput
                        label="Organization Name"
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corp"
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
                        placeholder="At least 8 characters"
                        required
                    />
                    <GlassSelect
                        label="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        options={[
                            { value: 'SUPER_ADMIN', label: 'Super Admin' },
                            { value: 'HR', label: 'HR' },
                            { value: 'TECHNICAL_MANAGER', label: 'Technical Manager' },
                            { value: 'CANDIDATE', label: 'Candidate' },
                        ]}
                    />
                    <GlassButton type="submit" variant="primary" className="w-full" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </GlassButton>
                </form>

                <p className="mt-6 text-center text-sm text-text-secondary">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent hover:text-accent-hover">
                        Sign in
                    </Link>
                </p>
            </GlassCard>
        </div>
    );
}
