import { User, Bell, Lock, Globe, Palette, Database } from "lucide-react";
import { useState } from "react";
import { downloadTextFile } from "../services/realtimeAi";
import { useEstimator } from "../state/estimatorStore";

export function Settings() {
  const { state, updateSettings, clearAllData } = useEstimator();
  const [statusMessage, setStatusMessage] = useState("");

  const saveProfile = () => {
    setStatusMessage(`Settings saved at ${new Date().toLocaleTimeString()}.`);
  };

  const exportAllData = () => {
    downloadTextFile("cost-estimator-backup.json", JSON.stringify(state, null, 2));
    setStatusMessage("All estimator data exported as JSON backup.");
  };

  const toggleTwoFactor = () => {
    updateSettings({ twoFactorEnabled: !state.settings.twoFactorEnabled });
    setStatusMessage(
      state.settings.twoFactorEnabled
        ? "Two-factor authentication disabled."
        : "Two-factor authentication enabled.",
    );
  };

  const clearCache = () => {
    clearAllData();
    setStatusMessage("Application cache cleared and default values restored.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and account settings
        </p>
      </div>

      {/* Profile Settings */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Profile Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Full Name</label>
            <input
              type="text"
              value={state.settings.fullName}
              onChange={(e) => updateSettings({ fullName: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Email</label>
            <input
              type="email"
              value={state.settings.email}
              onChange={(e) => updateSettings({ email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Company</label>
            <input
              type="text"
              value={state.settings.company}
              onChange={(e) => updateSettings({ company: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Role</label>
            <select
              value={state.settings.role}
              onChange={(e) => updateSettings({ role: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>Civil Engineer</option>
              <option>Contractor</option>
              <option>Architect</option>
              <option>Project Manager</option>
            </select>
          </div>
        </div>
        <button onClick={saveProfile} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>

      {/* Notification Settings */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Notification Preferences</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cost Alert Notifications</p>
              <p className="text-sm text-muted-foreground">Get notified when costs exceed budget</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={state.settings.notifications.costAlerts}
                onChange={(e) => updateSettings({ notifications: { costAlerts: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Risk Analysis Updates</p>
              <p className="text-sm text-muted-foreground">AI-powered risk assessment alerts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={state.settings.notifications.riskUpdates}
                onChange={(e) => updateSettings({ notifications: { riskUpdates: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Report Generation</p>
              <p className="text-sm text-muted-foreground">Weekly and monthly report notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={state.settings.notifications.reportGeneration}
                onChange={(e) => updateSettings({ notifications: { reportGeneration: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Regional Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Default Region</label>
            <select
              value={state.settings.defaultRegion}
              onChange={(e) => updateSettings({ defaultRegion: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>New York, NY</option>
              <option>Los Angeles, CA</option>
              <option>Chicago, IL</option>
              <option>Houston, TX</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Currency</label>
            <select
              value={state.settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>CAD ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Measurement System</label>
            <select
              value={state.settings.measurementSystem}
              onChange={(e) => updateSettings({ measurementSystem: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>Imperial (ft, in)</option>
              <option>Metric (m, cm)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Time Zone</label>
            <select
              value={state.settings.timezone}
              onChange={(e) => updateSettings({ timezone: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>Eastern Time (ET)</option>
              <option>Pacific Time (PT)</option>
              <option>Central Time (CT)</option>
              <option>Mountain Time (MT)</option>
            </select>
          </div>
        </div>
        <button onClick={saveProfile} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>

      {/* Security */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Security</h3>
        </div>
        <div className="space-y-4">
          <button className="w-full md:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            Change Password
          </button>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <button onClick={toggleTwoFactor} className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
              {state.settings.twoFactorEnabled ? "Disable" : "Enable"}
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Data Management</h3>
        </div>
        <div className="space-y-4">
          <button onClick={exportAllData} className="w-full md:w-auto px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity">
            Export All Data
          </button>
          <button onClick={clearCache} className="w-full md:w-auto ml-0 md:ml-3 px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            Clear Cache
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-sm text-muted-foreground">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
