import { useState } from "react";
import { useApp } from "../useApp";
import { Btn, Card, Icon, Modal, TopBar } from "../components/ui";
import { APP_RELEASE_DETAIL } from "../appVersion";

// ============================================================================
// Splash Screen
// ============================================================================
export function SplashScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-ocean-800 via-ocean-900 to-ocean-950 text-white">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm pulse-ring">
        <span className="text-5xl">⛴️</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">AtollCargo</h1>
      <p className="mt-2 text-sm text-ocean-100">Maldives Cargo Logistics</p>
      <div className="absolute bottom-12 flex items-center gap-2 text-xs text-ocean-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Connected • {APP_RELEASE_DETAIL}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Welcome Screen
// ============================================================================
export function WelcomeScreen() {
  const { navigate } = useApp();
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-ocean-500 to-ocean-800 text-4xl shadow-lg shadow-ocean-200">
          ⛴️
        </div>
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">AtollCargo</h1>
        <p className="mt-2 text-center text-sm text-slate-600 max-w-xs mx-auto">
          The complete cargo logistics platform for Maldives island-to-island shipping.
        </p>

        <div className="mt-10 space-y-3">
          {[
            { icon: "ship", t: "Manage active trips", d: "Open, load, sail, offload, and close trips" },
            { icon: "receipt", t: "Tax-inclusive billing", d: "Cash, credit, and destination-grouped invoices" },
            { icon: "printer", t: "A4 PDF print & share", d: "Bluetooth, Wi-Fi, wired, or share as PDF" },
            { icon: "sync", t: "Multi-device sync", d: "Realtime updates across the whole crew" },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ocean-100 text-ocean-700">
                <Icon name={f.icon} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{f.t}</p>
                <p className="text-xs text-slate-500">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white p-6">
        <Btn fullWidth size="lg" onClick={() => navigate("login")}>
          Sign in
        </Btn>
        <Btn fullWidth size="lg" variant="ghost" onClick={() => navigate("register")} className="mt-2">
          Create new account
        </Btn>
        <p className="mt-4 text-center text-xs text-slate-400">
          Live sync • {APP_RELEASE_DETAIL}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Login Screen
// ============================================================================
export function LoginScreen() {
  const { signIn, signInDemoUser, navigate, toast, sendPasswordReset } = useApp();
  const [email, setEmail] = useState("demo@atollcargo.mv");
  const [password, setPassword] = useState("AtollCargoDemo#2026");
  const [loading, setLoading] = useState(false);
  const [demoUserLoading, setDemoUserLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
      toast({ title: "Signed in", variant: "success" });
    } catch (error) {
      toast({ title: "Sign in failed", body: "Check details.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoUserSignIn = async () => {
    setDemoUserLoading(true);
    try {
      await signInDemoUser(email);
      toast({ title: "Signed in to demo account", body: email.trim(), variant: "success" });
    } catch (error) {
      toast({
        title: "Demo user not found",
        body: error instanceof Error ? error.message : "Invite this email inside the demo account first.",
        variant: "error",
      });
    } finally {
      setDemoUserLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <TopBar title="" leading={<div className="h-9 w-9" />} onBack={() => navigate("welcome")} />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">Use your business profile email.</p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" /> Remember device
            </label>
            <button onClick={() => setShowForgot(true)} className="text-ocean-700 font-medium hover:underline">Forgot password?</button>
          </div>
        </div>

        <div className="mt-8">
          <Btn fullWidth size="lg" loading={loading} onClick={handleSignIn}>Sign in</Btn>
        </div>

        <Card className="mt-6 border-dashed bg-ocean-50/40 p-4">
          <p className="text-xs font-semibold text-ocean-900">Demo account</p>
          <p className="mt-1 text-xs text-slate-600">
            Use the prefilled owner login, or enter an invited demo crew email like ali@atollmarine.mv.
          </p>
          <Btn
            fullWidth
            size="sm"
            variant="outline"
            loading={demoUserLoading}
            disabled={!email.trim() || loading || demoUserLoading}
            onClick={handleDemoUserSignIn}
            className="mt-3"
          >
            Sign in as demo crew
          </Btn>
          <p className="mt-2 text-xs font-medium text-ocean-800">{APP_RELEASE_DETAIL}</p>
        </Card>
      </div>

      <Modal open={showForgot} onClose={() => setShowForgot(false)} title="Reset Password">
        <div className="space-y-4 p-4 md:p-6 lg:p-8">
          <p className="text-sm text-slate-600">Enter your email to receive a reset link.</p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</label>
            <input
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              type="email"
              placeholder="operator@atollmarine.mv"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ocean-500"
            />
          </div>
          <Btn
            fullWidth
            size="lg"
            icon="check"
            disabled={!resetEmail.trim()}
            onClick={async () => {
              try {
                await sendPasswordReset(resetEmail);
                toast({ title: "Reset sent", variant: "success" });
                setShowForgot(false);
              } catch (error) {
                toast({ title: "Reset failed", body: "Try again.", variant: "error" });
              }
            }}
          >
            Send recovery link
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// Multi-Profile Interceptor
// ============================================================================
export function SelectProfileScreen() {
  const { selectBusinessProfile, toast, navigate } = useApp();
  
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <TopBar title="Select Account" onBack={() => navigate("welcome")} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center pb-2 pt-6">
          <h2 className="text-xl font-bold text-slate-900">Welcome back, Ibrahim</h2>
          <p className="text-sm text-slate-500 mt-1">Select an account to continue.</p>
        </div>
        
        <div className="space-y-3">
          <Card className="p-4 cursor-pointer hover:border-ocean-400 hover:shadow-md transition-all active:scale-[0.98]" onClick={() => {
            selectBusinessProfile("bp_001");
            toast({ title: "Account selected", variant: "success" });
          }}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ocean-700 text-2xl text-white shadow-inner">
                ⛴️
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-base font-bold text-slate-900">Atoll Marine Services</p>
                <p className="text-xs text-slate-500 mt-0.5">MV Ocean Star • GST-MV-1004521</p>
              </div>
              <Icon name="chevron_right" className="h-5 w-5 text-slate-300" />
            </div>
            <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between">
              <span className="rounded bg-ocean-100 px-2 py-0.5 text-xs font-bold text-ocean-700 uppercase tracking-widest">Owner</span>
              <span className="text-xs text-slate-400">Default profile</span>
            </div>
          </Card>

          <Card className="p-4 cursor-pointer hover:border-ocean-400 hover:shadow-md transition-all active:scale-[0.98]" onClick={() => {
            selectBusinessProfile("bp_002");
            toast({ title: "Account selected", variant: "success" });
          }}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-2xl text-white shadow-inner">
                🏗️
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-base font-bold text-slate-900">Island Builders Logistics</p>
                <p className="text-xs text-slate-500 mt-0.5">MV Dhigali • GST-MV-400192</p>
              </div>
              <Icon name="chevron_right" className="h-5 w-5 text-slate-300" />
            </div>
            <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 uppercase tracking-widest">Manager</span>
            </div>
          </Card>
        </div>

        <div className="pt-6">
          <Btn variant="outline" fullWidth size="lg" icon="plus" onClick={() => {}}>
            Register New Business
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Register Screen — Choose to create Business Profile or join Crew by Invite
// ============================================================================
export function RegisterScreen() {
  const { navigate, toast, registerOwner } = useApp();
  const [mode, setMode] = useState<"owner" | "crew">("owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (mode === "crew") {
      toast({ title: "Invite unavailable", body: "Owner setup needed.", variant: "info" });
      return;
    }
    setLoading(true);
    try {
      await registerOwner(name, email, password);
      toast({ title: "Account created", variant: "success" });
    } catch (error) {
      toast({ title: "Signup failed", body: "Try again.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <TopBar title="" leading={<div className="h-9 w-9" />} onBack={() => navigate("welcome")} />
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create account</h2>
          <p className="mt-1 text-sm text-slate-500">Join the Maldives cargo logistics network.</p>
        </div>

        {/* Mode Selector */}
        <div className="rounded-2xl bg-slate-100 p-1.5 flex gap-1">
          <button
            onClick={() => setMode("owner")}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${mode === "owner" ? "bg-white text-ocean-950 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            🏢 New Company / Vessel
          </button>
          <button
            onClick={() => setMode("crew")}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${mode === "crew" ? "bg-white text-ocean-950 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            ⚓ Join Existing Crew
          </button>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Full name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Hassan Ibrahim"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email address *</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="hassan@atollcargo.mv"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password *</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="Minimum 8 characters"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
            />
          </div>

          {mode === "crew" && (
            <div className="pt-2">
              <label className="mb-1.5 block text-xs font-semibold text-ocean-900">Crew Member Invite Code *</label>
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase().slice(0, 12))}
                placeholder="e.g. INV-MLE-9921"
                className="h-12 w-full rounded-xl border border-ocean-300 bg-ocean-50/50 px-3 text-sm font-mono font-bold text-ocean-950 outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
              />
              <p className="mt-1.5 text-xs text-slate-500">Ask your vessel Admin or Manager for your secure profile invitation code.</p>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Btn
            fullWidth
            size="lg"
            loading={loading}
            disabled={!name || !email || !password || (mode === "crew" && !inviteCode)}
            onClick={handleContinue}
          >
            {mode === "owner" ? "Continue to Business Setup ➔" : "Authenticate Crew Access ➔"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Register / Business Setup
// ============================================================================
export function BusinessSetupScreen() {
  const { navigate, toast, createOwnerBusinessProfile } = useApp();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: "Atoll Marine Services",
    vesselName: "MV Ocean Star",
    vesselReg: "MV-DH-4521",
    companyReg: "C-2018/2341",
    gst: "GST-MV-1004521",
    taxRate: "8",
  });

  const steps = ["Profile", "Vessel", "Tax", "Invite"];

  return (
    <div className="flex h-full flex-col bg-white">
      <TopBar title="Set up business" subtitle={`Step ${step + 1} of ${steps.length}`} onBack={() => step === 0 ? navigate("welcome") : setStep(step - 1)} />

      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-3">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-1.5">
            <div className={`h-6 w-6 rounded-full text-xs font-semibold flex items-center justify-center ${i <= step ? "bg-ocean-700 text-white" : "bg-slate-200 text-slate-500"}`}>
              {i < step ? <Icon name="check" className="h-3 w-3" /> : i + 1}
            </div>
            <span className={`text-xs ${i <= step ? "text-slate-900 font-medium" : "text-slate-400"}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Business profile</h2>
            <p className="text-sm text-slate-500">All your data, trips, bills, and users will live inside this profile.</p>
            <Field label="Business name" value={form.businessName} onChange={v => setForm({ ...form, businessName: v })} />
            <Field label="Vessel name" value={form.vesselName} onChange={v => setForm({ ...form, vesselName: v })} />
            <Field label="Company registration #" value={form.companyReg} onChange={v => setForm({ ...form, companyReg: v })} />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Vessel details</h2>
            <p className="text-sm text-slate-500">Used on every invoice, bill, and trip document.</p>
            <Field label="Vessel registration #" value={form.vesselReg} onChange={v => setForm({ ...form, vesselReg: v })} />
            <Field label="Phone" value="+960 779 1234" onChange={() => {}} />
            <Field label="Address" value="Hulhumale Ferry Terminal, Male'" onChange={() => {}} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Tax setup</h2>
            <p className="text-sm text-slate-500">Default GST for Maldives is 8%. Pricing is tax-inclusive by default.</p>
            <Field label="GST number" value={form.gst} onChange={v => setForm({ ...form, gst: v })} />
            <Field label="Default tax rate %" value={form.taxRate} onChange={v => setForm({ ...form, taxRate: v })} />
            <div className="rounded-xl border border-ocean-200 bg-ocean-50 p-3 text-xs text-ocean-900">
              <strong>Tax-inclusive pricing</strong> means item prices already include GST. Tax will be split on the bill but collected as part of the price.
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Invite crew</h2>
            <p className="text-sm text-slate-500">Optional — you can invite team members after the profile is created.</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              You will become the <strong>Owner</strong> automatically. Invite Admins, Cashiers, and Staff from the Users screen later.
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <Btn fullWidth size="lg" loading={saving} onClick={async () => {
          if (step < steps.length - 1) setStep(step + 1);
          else {
            setSaving(true);
            try {
              await createOwnerBusinessProfile(form);
              toast({ title: "Profile created", variant: "success" });
            } catch (error) {
              toast({ title: "Setup failed", body: "Try again.", variant: "error" });
            } finally {
              setSaving(false);
            }
          }
        }}>
          {step < steps.length - 1 ? "Continue" : "Finish setup"}
        </Btn>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
      />
    </div>
  );
}
