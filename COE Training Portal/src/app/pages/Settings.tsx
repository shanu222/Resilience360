import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

type PortalSettings = {
  emailNotifications: boolean;
  showLocalTime: boolean;
  compactSidebar: boolean;
};

const defaultSettings: PortalSettings = {
  emailNotifications: true,
  showLocalTime: true,
  compactSidebar: false,
};

export function SettingsPage() {
  const { user } = useAuth();

  const storageKey = useMemo(
    () => (user ? `ndma_settings_${user.id}` : "ndma_settings_guest"),
    [user],
  );

  const [settings, setSettings] = useState<PortalSettings>(defaultSettings);

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached) as Partial<PortalSettings>;
      setSettings({ ...defaultSettings, ...parsed });
    } catch {
      setSettings(defaultSettings);
    }
  }, [storageKey]);

  const toggleSetting = (field: keyof PortalSettings) => {
    setSettings((previous) => ({ ...previous, [field]: !previous[field] }));
  };

  const saveSettings = () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    toast.success("Settings saved successfully.");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Update your portal preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-gray-600">Receive important training and exam notifications.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={() => toggleSetting("emailNotifications")}
              aria-label="Toggle email notifications"
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Show Local Time</Label>
              <p className="text-xs text-gray-600">Display local date/time in the top header.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.showLocalTime}
              onChange={() => toggleSetting("showLocalTime")}
              aria-label="Toggle local time"
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Compact Sidebar</Label>
              <p className="text-xs text-gray-600">Use a compact navigation sidebar layout.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.compactSidebar}
              onChange={() => toggleSetting("compactSidebar")}
              aria-label="Toggle compact sidebar"
            />
          </div>

          <Button type="button" onClick={saveSettings} className="bg-green-600 hover:bg-green-700">
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
