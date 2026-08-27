import { useSettingsStore } from '@/stores/useSettingsStore';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
    const theme = useSettingsStore((s) => s.settings.theme);
    const updateSettings = useSettingsStore((s) => s.updateSettings);

    const toggle = () => {
        updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
    };

    return (
        <button
            onClick={toggle}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="capitalize">{theme} mode</span>
        </button>
    );
}
