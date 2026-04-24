"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import { useSubscription, useCheckout, usePortal } from "@/lib/hooks/use-subscription";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useConfirm } from "@/components/confirm-dialog";
import { IconFolderFilled, IconClockFilled, IconPlayerPlayFilled } from "@tabler/icons-react";

export default function AccountPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { confirm, ConfirmDialog } = useConfirm();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [initialized, setInitialized] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const { data: usage } = useSubscription();
  const checkout = useCheckout();
  const portal = usePortal();

  const checkoutTriggered = useRef(false);
  useEffect(() => {
    const checkoutPlan = searchParams.get("checkout");
    if (
      (checkoutPlan === "pro" || checkoutPlan === "team") &&
      !checkoutTriggered.current &&
      usage &&
      usage.plan === "free"
    ) {
      checkoutTriggered.current = true;
      checkout.mutate(checkoutPlan);
    }
  }, [searchParams, checkout, usage]);

  if (profile && !initialized) {
    setName(profile.name || "");
    setEmail(profile.email || "");
    setInitialized(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile.mutateAsync({ name, email });
      toast.success("Profile updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    confirm({
      title: "Change password?",
      description: "Are you sure you want to change your password?",
      confirmLabel: "Change password",
      onConfirm: async () => {
        setSavingPassword(true);
        try {
          await updateProfile.mutateAsync({ currentPassword, newPassword });
          setCurrentPassword("");
          setNewPassword("");
          toast.success("Password changed");
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setSavingPassword(false);
        }
      },
    });
  }

  if (isLoading || !profile) return null;

  return (
    <div>
      <PageHeader title="Account" />
      {ConfirmDialog}
      <div className="p-6 max-w-3xl mx-auto">

        {/* Profile */}
        <div className="rounded-md border mb-6">
          <div className="px-4 py-3 border-b">
            <span className="text-xs text-muted-foreground">Profile</span>
          </div>
          <div className="p-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingProfile}
                  style={{ backgroundColor: "#d4a574", color: "#000", borderColor: "#d4a574" }}
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-md border mb-6">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Subscription</span>
            <span className="text-xs font-medium capitalize">{usage?.plan || "free"} plan</span>
          </div>
          <div className="p-4 space-y-4">
            {usage && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UsageBar label="Projects" used={usage.projects.used} limit={usage.projects.limit} color="#c47ddb" icon={<IconFolderFilled className="h-3.5 w-3.5" />} />
                <UsageBar label="Jobs" used={usage.jobs.used} limit={usage.jobs.limit} color="#a8b545" icon={<IconClockFilled className="h-3.5 w-3.5" />} />
                <UsageBar label="Executions" used={usage.executions.used} limit={usage.executions.limit} color="#6b9ece" icon={<IconPlayerPlayFilled className="h-3.5 w-3.5" />} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {(!usage || usage.plan === "free") && (
                <>
                  <PlanCard
                    name="Pro"
                    price="$12/mo"

                    onSelect={() => checkout.mutate("pro")}
                    disabled={checkout.isPending}

                  />
                  <PlanCard
                    name="Team"
                    price="$39/mo"

                    onSelect={() => checkout.mutate("team")}
                    disabled={checkout.isPending}
                  />
                </>
              )}
              {usage && usage.plan === "pro" && (
                <>
                  <PlanCard
                    name="Team"
                    price="$39/mo"

                    onSelect={() => checkout.mutate("team")}
                    disabled={checkout.isPending}

                  />
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => portal.mutate()}
                      disabled={portal.isPending}
                    >
                      {portal.isPending ? "Redirecting..." : "Manage Billing"}
                    </Button>
                  </div>
                </>
              )}
              {usage && usage.plan === "team" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                >
                  {portal.isPending ? "Redirecting..." : "Manage Billing"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-md border mb-6">
          <div className="px-4 py-3 border-b">
            <span className="text-xs text-muted-foreground">Change password</span>
          </div>
          <div className="p-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPassword}
                  style={{ backgroundColor: "#d4a574", color: "#000", borderColor: "#d4a574" }}
                >
                  {savingPassword ? "Changing..." : "Change password"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-md border mb-6">
          <div className="px-4 py-3 border-b">
            <span className="text-xs text-muted-foreground">Account info</span>
          </div>
          <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: "var(--border)" }}>
            <div className="p-4" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-muted-foreground mb-1">User ID</p>
              <p className="text-xs font-mono break-all">{profile.id}</p>
            </div>
            <div className="p-4" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Email</p>
              <p className="text-xs">{profile.email}</p>
            </div>
            <div className="p-4 col-span-2" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Created</p>
              <p className="text-xs">{new Date(profile.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function PlanCard({ name, price, onSelect, disabled }: {
  name: string;
  price: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col justify-between gap-6"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
    >
      <div>
        <span className="text-xs text-muted-foreground">{name}</span>
      </div>
      <div>
        <span className="text-2xl font-semibold">{price}</span>
      </div>
      <Button
        size="sm"
        onClick={onSelect}
        disabled={disabled}
        className="w-fit px-6 rounded-lg"
        variant="outline"
      >
        {disabled ? "Redirecting..." : `Upgrade to ${name}`}
      </Button>
    </div>
  );
}

function UsageBar({ label, used, limit, color, icon }: { label: string; used: number; limit: number | null; color: string; icon?: React.ReactNode }) {
  const isUnlimited = limit === null || limit === Infinity;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const limitDisplay = isUnlimited ? "Unlimited" : limit.toLocaleString();

  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        <span>{used.toLocaleString()} / {limitDisplay}</span>
      </div>
      <div className="h-5 rounded-md overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
        <div
          className="h-full rounded-md transition-all"
          style={{ width: `${isUnlimited ? 0 : percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
