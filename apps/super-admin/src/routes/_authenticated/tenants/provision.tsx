import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tenants/provision")({
  component: ProvisionTenantPage,
});

type WizardStep = 1 | 2 | 3;

type BusinessInfo = {
  name: string;
  slug: string;
  contactEmail: string;
  phone: string;
  address: string;
  city: string;
  country: string;
};

const emptyBusiness: BusinessInfo = {
  name: "",
  slug: "",
  contactEmail: "",
  phone: "",
  address: "",
  city: "",
  country: "",
};

const FEATURE_MODULES = [
  { key: "workout_tracking", label: "Workout Tracking" },
  { key: "class_scheduling", label: "Class Scheduling" },
  { key: "billing_payments", label: "Billing & Payments" },
  { key: "social_community", label: "Social & Community" },
  { key: "coaching_tools", label: "Coaching Tools" },
  { key: "equipment_iot", label: "Equipment & IoT" },
  { key: "wearable_sync", label: "Wearable Sync" },
  { key: "messaging", label: "Messaging" },
  { key: "marketing_leads", label: "Marketing & Leads" },
  { key: "retail_pos", label: "Retail & POS" },
] as const;

function ProvisionTenantPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [business, setBusiness] = useState<BusinessInfo>(emptyBusiness);
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURE_MODULES.map((m) => [m.key, true]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProvisioning = useMutation(api.tenantProvisioning.create);
  const approveProvisioning = useMutation(api.tenantProvisioning.approve);
  const activateProvisioning = useMutation(api.tenantProvisioning.activate);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(name: string) {
    setBusiness((prev) => ({
      ...prev,
      name,
      slug: prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
    }));
  }

  function toggleFeature(key: string) {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const { provisioningId } = await createProvisioning({
        tenantName: business.name,
        tenantSlug: business.slug,
        contactEmail: business.contactEmail,
        checklistState: { features },
      });

      // Auto-approve and activate
      await approveProvisioning({ provisioningId });
      await activateProvisioning({ provisioningId });

      navigate({ to: "/tenants" });
    } catch (e: any) {
      setError(e?.data ?? e?.message ?? "Failed to provision tenant");
      setSubmitting(false);
    }
  }

  const canProceedStep1 =
    business.name.trim() && business.slug.trim() && business.contactEmail.trim();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provision New Tenant</h1>
        <p className="text-sm text-muted-foreground">
          Set up a new gym on the platform
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Step {step} of 3:{" "}
        {step === 1
          ? "Business Info"
          : step === 2
            ? "Feature Packages"
            : "Review & Confirm"}
      </p>

      {/* Step 1: Business Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Gym Name *</Label>
              <Input
                value={business.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. CrossFit Downtown"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={business.slug}
                onChange={(e) =>
                  setBusiness({ ...business, slug: e.target.value })
                }
                placeholder="crossfit-downtown"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Auto-generated from name.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Contact Email *</Label>
              <Input
                type="email"
                value={business.contactEmail}
                onChange={(e) =>
                  setBusiness({ ...business, contactEmail: e.target.value })
                }
                placeholder="owner@gym.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={business.city}
                  onChange={(e) =>
                    setBusiness({ ...business, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={business.country}
                  onChange={(e) =>
                    setBusiness({ ...business, country: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Feature Packages */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Packages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Toggle which platform modules are enabled for this tenant.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURE_MODULES.map((mod) => (
                <button
                  key={mod.key}
                  onClick={() => toggleFeature(mod.key)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                    features[mod.key]
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <span>{mod.label}</span>
                  <Badge variant={features[mod.key] ? "default" : "secondary"}>
                    {features[mod.key] ? "On" : "Off"}
                  </Badge>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Confirm */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{business.name}</span>
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono">{business.slug}</span>
              <span className="text-muted-foreground">Contact</span>
              <span>{business.contactEmail}</span>
              {business.city && (
                <>
                  <span className="text-muted-foreground">Location</span>
                  <span>
                    {business.city}
                    {business.country ? `, ${business.country}` : ""}
                  </span>
                </>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Enabled Features</p>
              <div className="flex flex-wrap gap-2">
                {FEATURE_MODULES.filter((m) => features[m.key]).map((m) => (
                  <Badge key={m.key} variant="outline">
                    {m.label}
                  </Badge>
                ))}
              </div>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded p-3">
                {error}
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Provisioning..." : "Provision Tenant"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
