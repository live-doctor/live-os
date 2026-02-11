"use client";

import { hasUsers, registerUser } from "@/app/actions/auth";
import { importAppStore } from "@/app/actions/appstore";
import { updateSettings } from "@/app/actions/auth/settings";
import { AuthShell } from "@/components/auth/auth-shell";
import { OrbitLoader } from "@/components/auth/orbit-loader";
import { PostSetup } from "@/components/auth/post-setup";
import { RegisterStep } from "@/components/auth/register-step";
import { PIN_LENGTH, VERSION } from "@/lib/config";
import type { Step } from "@/types/setup";
import { CheckCircle2, Rocket, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function SetupPage() {
  const LINUXSERVER_STORE_URL = "https://api.linuxserver.io/api/v1/images?include_config=true&include_deprecated=true";
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [step, setStep] = useState<Step>("register");
  const [locationStatus, setLocationStatus] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [includeLinuxServerStore, setIncludeLinuxServerStore] = useState(false);
  const [linuxServerStatus, setLinuxServerStatus] = useState("");
  const [linuxServerError, setLinuxServerError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    hasUsers().then((exists) => {
      if (exists) {
        router.push("/login");
      } else {
        setCheckingUsers(false);
      }
    });
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    if (pin.length !== PIN_LENGTH) {
      setError(`PIN must be exactly ${PIN_LENGTH} digits`);
      return;
    }

    if (!(pin.length === PIN_LENGTH && pin === confirmPin)) {
      setError("PINs do not match");
      return;
    }

    setLoading(true);
    const res = await registerUser(username, pin, { skipRedirect: true });
    if (res?.success === false) {
      setError(res.error || "An unknown error occurred");
      setLoading(false);
    } else {
      setStep("next");
      handleUseLocation();
      setLoading(false);
    }
  };

  const handleUseLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation not supported in this browser");
      setLocating(false);
      return;
    }
    setLocating(true);
    setLocationStatus("Requesting location…");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus("Saving location…");

        // Best-effort reverse geocode to include city/country in settings
        let city: string | null = null;
        let country: string | null = null;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "Homeio Dashboard Setup" } },
          );
          if (res.ok) {
            const data = await res.json();
            city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              null;
            country = data.address?.country_code
              ? String(data.address.country_code).toUpperCase()
              : null;
          }
        } catch {
          // Reverse geocoding is optional; continue without it
        }

        try {
          await updateSettings({
            userLatitude: latitude,
            userLongitude: longitude,
            userCity: city,
            userCountry: country,
          });
          setLocationStatus("Location saved for widgets and weather.");
        } catch (err) {
          setLocationError(
            (err as Error)?.message || "Failed to save location",
          );
          setLocationStatus("");
        }
        setLocating(false);
      },
      (err) => {
        let message = err.message || "Failed to get location";

        if (err.code === err.PERMISSION_DENIED) {
          message =
            "Location permission denied. Click the lock icon in the address bar and allow location.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "Location unavailable. Check that device location services are on.";
        } else if (err.code === err.TIMEOUT) {
          message = "Timed out waiting for location. Try again.";
        }

        if (message.toLowerCase().includes("secure origin")) {
          message =
            "Chrome blocks geolocation on non-HTTPS origins. Use https:// or http://localhost.";
        }

        setLocationError(message);
        setLocationStatus("");
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  const handleFinish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    setLinuxServerError(null);
    setLinuxServerStatus("");

    if (includeLinuxServerStore) {
      setLinuxServerStatus("Importing LinuxServer.io catalog…");
      try {
        const result = await importAppStore(LINUXSERVER_STORE_URL, {
          name: "LinuxServer.io Catalog",
          description: "LinuxServer.io app catalog imported during setup",
        });
        if (!result.success) {
          setLinuxServerError(
            result.error || "Failed to import LinuxServer.io catalog.",
          );
          setFinishing(false);
          return;
        }
        setLinuxServerStatus("LinuxServer.io catalog imported.");
      } catch (error) {
        setLinuxServerError(
          (error as Error)?.message ||
            "Failed to import LinuxServer.io catalog.",
        );
        setFinishing(false);
        return;
      }
    }

    router.push("/login");
  }, [finishing, includeLinuxServerStore, router, LINUXSERVER_STORE_URL]);

  if (checkingUsers) {
    return (
      <AuthShell
        badge="Setup"
        title="Homeio"
        subtitle="Preparing first-time setup…"
        icon={<Rocket className="h-5 w-5 text-muted-foreground" />}
      >
        <div className="flex justify-center py-12">
          <OrbitLoader />
        </div>
      </AuthShell>
    );
  }

  if (step === "next") {
    return (
      <AuthShell
        badge="Setup"
        title="Account created"
        subtitle="Optional preferences before you sign in"
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
        widthClass="max-w-4xl"
      >
        <PostSetup
          locationStatus={locationStatus}
          locationError={locationError}
          isLocating={locating}
          onUseLocation={handleUseLocation}
          includeLinuxServerStore={includeLinuxServerStore}
          onIncludeLinuxServerStoreChange={setIncludeLinuxServerStore}
          linuxServerStatus={linuxServerStatus}
          linuxServerError={linuxServerError}
          isFinishing={finishing}
          version={VERSION}
          onFinish={handleFinish}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Setup"
      title="Create your admin"
      subtitle="Set a username and a secure PIN"
      icon={<ShieldCheck className="h-5 w-5 text-muted-foreground" />}
      widthClass="max-w-2xl"
    >
      <RegisterStep
        username={username}
        pin={pin}
        confirmPin={confirmPin}
        loading={loading}
        error={error}
        onUsernameChange={setUsername}
        onPinChange={setPin}
        onConfirmPinChange={setConfirmPin}
        onSubmit={handleSubmit}
      />
    </AuthShell>
  );
}
