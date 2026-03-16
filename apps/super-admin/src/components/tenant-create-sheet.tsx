import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface TenantCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantCreateSheet({ open, onOpenChange }: TenantCreateSheetProps) {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const createTenant = useMutation(api.platformTenants.create);
  const [slugManual, setSlugManual] = useState(false);

  const form = useForm({
    defaultValues: { name: "", slug: "", ownerEmail: "", timezone: "UTC" },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        const result = await createTenant(value);
        onOpenChange(false);
        navigate({ to: "/tenants/$tenantId", params: { tenantId: result.tenantId } });
      } catch (err: any) {
        setError(err.message ?? "Failed to create tenant");
      }
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create New Tenant</SheetTitle>
          <SheetDescription>Set up a new gym on the platform</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
          className="space-y-4 mt-4"
        >
          <form.Field
            name="name"
            validators={{ onChange: ({ value }) => value.length < 2 ? "Min 2 chars" : undefined }}
            children={(field) => (
              <div className="space-y-2">
                <Label>Gym Name</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    if (!slugManual) form.setFieldValue("slug", slugify(e.target.value));
                  }}
                  onBlur={field.handleBlur}
                  placeholder="CrossFit Bergen"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          />
          <form.Field
            name="slug"
            validators={{ onChange: ({ value }) => !/^[a-z0-9-]+$/.test(value) ? "Lowercase, numbers, hyphens only" : undefined }}
            children={(field) => (
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => { field.handleChange(e.target.value); setSlugManual(true); }}
                  onBlur={field.handleBlur}
                  placeholder="crossfit-bergen"
                />
                <p className="text-xs text-muted-foreground">Auto-generated from name. Edit to customize.</p>
              </div>
            )}
          />
          <form.Field
            name="ownerEmail"
            children={(field) => (
              <div className="space-y-2">
                <Label>Owner Email</Label>
                <Input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="owner@gym.com"
                />
              </div>
            )}
          />
          <form.Field
            name="timezone"
            children={(field) => (
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Europe/Oslo"
                />
              </div>
            )}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-2">
            <form.Subscribe
              selector={(s) => s.isSubmitting}
              children={(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Tenant"}
                </Button>
              )}
            />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
