import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function useTheme() {
    const theme = useSettingsStore((s) => s.settings.theme);

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    return theme;
}
