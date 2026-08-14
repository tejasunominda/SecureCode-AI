import { useSettingsStore } from '@/stores/useSettingsStore';
import { GlassCard, GlassButton, GlassInput, GlassSelect, GlassCheckbox, GlassBadge } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { Settings, Shield, Monitor, Volume2, Lock, RotateCcw, Save, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, updateProctoring, resetSettings } = useSettingsStore();

  const handleSave = () => {
    // Settings are auto-persisted to localStorage via Zustand store.
    // This explicitly confirms the save and re-writes to ensure persistence.
    localStorage.setItem('securecode_settings', JSON.stringify(settings));
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    resetSettings();
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">Configure application and proctoring preferences</p>
        </div>
        <div className="flex gap-2">
          <GlassButton variant="secondary" size="sm" onClick={handleReset}><RotateCcw className="h-4 w-4" /> Reset</GlassButton>
          <GlassButton variant="primary" size="sm" onClick={handleSave}><Save className="h-4 w-4" /> Save</GlassButton>
        </div>
      </div>

      {/* General Settings */}
      <GlassCard static className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-text-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">General</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <GlassSelect label="Theme" name="theme" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
            options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
          <GlassInput label="Default Expiry Days" name="defaultExpiryDays" type="number" value={settings.defaultExpiryDays}
            onChange={(e) => updateSettings({ defaultExpiryDays: parseInt(e.target.value) || 5 })} />
          <GlassInput label="Default Template ID" name="defaultTemplateId" value={settings.defaultTemplateId}
            onChange={(e) => updateSettings({ defaultTemplateId: e.target.value })} />
        </div>
      </GlassCard>

      {/* Proctoring Settings */}
      <GlassCard static className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-text-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Proctoring Configuration</h2>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <GlassInput label="Max Face Warnings" name="maxFaceWarnings" type="number" value={settings.proctoring.maxFaceWarnings}
            onChange={(e) => updateProctoring({ maxFaceWarnings: parseInt(e.target.value) || 3 })} />
          <GlassInput label="Max Tab Warnings" name="maxTabWarnings" type="number" value={settings.proctoring.maxTabWarnings}
            onChange={(e) => updateProctoring({ maxTabWarnings: parseInt(e.target.value) || 2 })} />
          <GlassInput label="Detection Interval (ms)" name="detectionIntervalMs" type="number" value={settings.proctoring.detectionIntervalMs}
            onChange={(e) => updateProctoring({ detectionIntervalMs: parseInt(e.target.value) || 3000 })} />
          <GlassInput label="Screenshot Interval (ms)" name="screenshotIntervalMs" type="number" value={settings.proctoring.screenshotIntervalMs}
            onChange={(e) => updateProctoring({ screenshotIntervalMs: parseInt(e.target.value) || 30000 })} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Screen Recording</p>
                <p className="text-xs text-text-muted">Record candidate's screen during assessment</p>
              </div>
            </div>
            <GlassCheckbox checked={settings.proctoring.enableScreenRecording} onChange={(v) => updateProctoring({ enableScreenRecording: v })} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Copy-Paste Detection</p>
                <p className="text-xs text-text-muted">Block and flag copy/paste/cut attempts</p>
              </div>
            </div>
            <GlassCheckbox checked={settings.proctoring.enableCopyPasteDetection} onChange={(v) => updateProctoring({ enableCopyPasteDetection: v })} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Audio Monitoring</p>
                <p className="text-xs text-text-muted">Monitor audio levels for suspicious noise</p>
              </div>
            </div>
            <GlassCheckbox checked={settings.proctoring.enableAudioMonitoring} onChange={(v) => updateProctoring({ enableAudioMonitoring: v })} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Browser Lockdown</p>
                <p className="text-xs text-text-muted">Force fullscreen mode, block navigation away</p>
              </div>
            </div>
            <GlassCheckbox checked={settings.proctoring.enableBrowserLockdown} onChange={(v) => updateProctoring({ enableBrowserLockdown: v })} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md bg-warning-bg p-3">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <p className="text-xs text-warning">
            Proctoring settings apply to all new assessment sessions. Existing sessions retain their original configuration.
          </p>
        </div>
      </GlassCard>

      {/* Current Configuration Summary */}
      <GlassCard static className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Current Configuration</h2>
        <div className="flex flex-wrap gap-2">
          <GlassBadge tone="info">Face Warnings: {settings.proctoring.maxFaceWarnings}</GlassBadge>
          <GlassBadge tone="info">Tab Warnings: {settings.proctoring.maxTabWarnings}</GlassBadge>
          <GlassBadge tone={settings.proctoring.enableScreenRecording ? 'success' : 'neutral'}>Screen Recording: {settings.proctoring.enableScreenRecording ? 'ON' : 'OFF'}</GlassBadge>
          <GlassBadge tone={settings.proctoring.enableCopyPasteDetection ? 'success' : 'neutral'}>Copy-Paste: {settings.proctoring.enableCopyPasteDetection ? 'ON' : 'OFF'}</GlassBadge>
          <GlassBadge tone={settings.proctoring.enableAudioMonitoring ? 'success' : 'neutral'}>Audio: {settings.proctoring.enableAudioMonitoring ? 'ON' : 'OFF'}</GlassBadge>
          <GlassBadge tone={settings.proctoring.enableBrowserLockdown ? 'success' : 'neutral'}>Lockdown: {settings.proctoring.enableBrowserLockdown ? 'ON' : 'OFF'}</GlassBadge>
        </div>
      </GlassCard>
    </div>
  );
}
