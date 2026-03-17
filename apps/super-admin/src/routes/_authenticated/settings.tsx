import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const thresholds = useQuery(api.platformAlerts.getThresholds, {});
  const setThresholds = useMutation(api.platformAlerts.setThresholds);

  const [lowActivityDays, setLowActivityDays] = useState("14");
  const [maxErrorRate, setMaxErrorRate] = useState("5");
  const [minMemberCount, setMinMemberCount] = useState("10");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (thresholds) {
      setLowActivityDays(thresholds.lowActivityDays.toString());
      setMaxErrorRate(thresholds.maxErrorRate.toString());
      setMinMemberCount(thresholds.minMemberCount.toString());
    }
  }, [thresholds]);

  async function handleSave() {
    await setThresholds({
      lowActivityDays: parseInt(lowActivityDays, 10) || 14,
      maxErrorRate: parseFloat(maxErrorRate) || 5,
      minMemberCount: parseInt(minMemberCount, 10) || 10,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Configure platform-wide settings and alert thresholds</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
          <CardDescription>Configure when the platform should flag issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="low-activity">Low Activity (days)</Label>
              <Input
                id="low-activity"
                type="number"
                value={lowActivityDays}
                onChange={(e) => setLowActivityDays(e.target.value)}
                placeholder="14"
              />
              <p className="text-xs text-muted-foreground">
                Flag tenants with no logins for this many days
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-error">Max Error Rate (%)</Label>
              <Input
                id="max-error"
                type="number"
                value={maxErrorRate}
                onChange={(e) => setMaxErrorRate(e.target.value)}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                Alert when API error rate exceeds this threshold
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-members">Min Member Count</Label>
              <Input
                id="min-members"
                type="number"
                value={minMemberCount}
                onChange={(e) => setMinMemberCount(e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Flag tenants with fewer active members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleSave}>Save Thresholds</Button>
            {saved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
