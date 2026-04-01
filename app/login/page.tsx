"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const normalized = phone.startsWith("0")
      ? "+63" + phone.slice(1)
      : phone.startsWith("+")
      ? phone
      : "+63" + phone;

    const { data: personnel } = await supabase
      .from("personnel")
      .select("id")
      .eq("phone", normalized)
      .single();

    if (!personnel) {
      setError("This number is not registered as personnel.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setPhone(normalized);
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #f7fcfe inset !important;
          -webkit-text-fill-color: #0d2d35 !important;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.8s linear infinite; }

        .lt-input:focus {
          outline: none;
          border-color: #1BAEE8 !important;
          box-shadow: 0 0 0 3px rgba(27,174,232,0.15);
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(27,174,232,0.45) !important;
        }
        .submit-btn { transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s; }
        .back-btn:hover { color: #1BAEE8 !important; }
        .back-btn { transition: color 0.15s; }

        /* ── Layout ── */
        .login-root {
          min-height: 100vh;
          display: flex;
          background: linear-gradient(160deg, #e6f6fd 0%, #edfaf6 60%, #f0fafa 100%);
        }

        /* Left decorative panel */
        .login-panel {
          flex: 1;
          background: linear-gradient(145deg, #1BAEE8 0%, #3ECFB2 100%);
          padding: 48px 52px;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          display: flex;
        }

        /* Right form panel */
        .login-form-wrap {
          width: 100%;
          max-width: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          background: white;
          box-shadow: -8px 0 40px rgba(27,174,232,0.06);
        }

        /* Mobile: stack vertically, hide decorative panel */
        @media (max-width: 767px) {
          .login-root {
            flex-direction: column;
            background: white;
          }

          /* Compact top banner replaces the full left panel */
          .login-panel {
            flex: none;
            min-height: unset;
            padding: 24px 24px 28px;
            flex-direction: column;
            gap: 0;
            justify-content: flex-start;
          }

          /* Hide the tagline/description copy on mobile — keep it clean */
          .login-panel-tagline { display: none; }

          /* Blobs scaled down */
          .login-panel .blob-1 { width: 200px !important; height: 200px !important; top: -60px !important; right: -60px !important; }
          .login-panel .blob-2 { display: none; }
          .login-panel .blob-3 { display: none; }

          .login-form-wrap {
            max-width: 100%;
            padding: 28px 20px 40px;
            box-shadow: none;
          }

          /* Larger tap targets on mobile */
          .lt-input {
            font-size: 16px !important; /* prevents iOS zoom */
            padding: 14px 16px !important;
          }
        }

        /* Tablet: show panel but narrower */
        @media (min-width: 768px) and (max-width: 1023px) {
          .login-panel {
            padding: 36px 36px;
          }
          .login-form-wrap {
            max-width: 400px;
            padding: 32px 28px;
          }
        }
      `}</style>

      <main className="login-root">

        {/* ── Left decorative panel ── */}
        <div className="login-panel">
          <div className="blob-1" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "rgba(255,255,255,0.07)", top: -150, right: -150 }} />
          <div className="blob-2" style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: 60, left: -100 }} />
          <div className="blob-3" style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", bottom: 300, right: 40 }} />

          {/* Logo */}
          <div style={{ position: "relative" }}>
            <Image
              src="/lifetap-logo-w-label.png"
              alt="LifeTap"
              width={160}
              height={60}
              style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
            />
          </div>

          {/* Tagline — hidden on mobile via CSS */}
          <div className="login-panel-tagline" style={{ position: "relative", marginTop: "auto" }}>
            <div style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              padding: "4px 12px",
              marginBottom: 20,
            }}>
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Admin Dashboard
              </span>
            </div>
            <h2 style={{
              color: "white",
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.25,
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}>
              Emergency medical data,<br />when every second counts.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.7 }}>
              Manage registered users, personnel, and city-level access — all in one place.
            </p>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="login-form-wrap">
          <div className="fade-up" style={{ width: "100%" }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <Image
                src="/lifetap-app-icon.png"
                alt="LifeTap icon"
                width={52}
                height={52}
                style={{ borderRadius: 14, marginBottom: 18, boxShadow: "0 6px 24px rgba(27,174,232,0.2)" }}
              />
              <h1 style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#0d2d35",
                letterSpacing: "-0.02em",
                marginBottom: 6,
              }}>
                {step === "phone" ? "Sign in" : "Check your phone"}
              </h1>
              <p style={{ color: "#7aabb5", fontSize: 14, lineHeight: 1.5 }}>
                {step === "phone"
                  ? "Enter your registered mobile number to continue."
                  : `We sent a 6-digit code to ${phone}`}
              </p>
            </div>

            {step === "phone" ? (
              <form onSubmit={handleSendOtp}>
                <Label>Mobile Number</Label>
                <div style={{ position: "relative", marginTop: 8, marginBottom: 6 }}>
                  <span style={{
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9acdd8",
                    fontSize: 13,
                    fontFamily: "JetBrains Mono, monospace",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}>
                    +63
                  </span>
                  <input
                    className="lt-input"
                    type="tel"
                    placeholder="9XX XXX XXXX"
                    value={phone.startsWith("+63") ? phone.slice(3) : phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    required
                    maxLength={10}
                    style={{ ...inputStyle, paddingLeft: 52 }}
                  />
                </div>
                <p style={{ color: "#b8d8e0", fontSize: 12 }}>
                  Registered personnel only. You'll receive a 6-digit SMS code.
                </p>

                {error && <ErrorBox>{error}</ErrorBox>}
                <SubmitButton loading={loading}>Send Verification Code</SubmitButton>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px",
                  background: "#edfaf6",
                  border: "1.5px solid #b0ead8",
                  borderRadius: 12,
                  marginBottom: 24,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "linear-gradient(135deg, #1BAEE8, #3ECFB2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ color: "#2a8a74", fontSize: 12, fontWeight: 600 }}>Code sent to</p>
                    <p style={{ color: "#0d2d35", fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>{phone}</p>
                  </div>
                </div>

                <Label>6-Digit Code</Label>
                <input
                  className="lt-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="· · · · · ·"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  autoFocus
                  style={{
                    ...inputStyle,
                    marginTop: 8,
                    letterSpacing: "0.5em",
                    textAlign: "center",
                    fontSize: 24,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                />

                {error && <ErrorBox>{error}</ErrorBox>}
                <SubmitButton loading={loading}>Verify & Sign In</SubmitButton>

                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  className="back-btn"
                  style={{
                    display: "block", width: "100%", marginTop: 10,
                    background: "none", border: "none",
                    color: "#b8d8e0", fontSize: 13, cursor: "pointer",
                    padding: "10px 0", fontFamily: "Plus Jakarta Sans, sans-serif",
                  }}
                >
                  ← Use a different number
                </button>
              </form>
            )}

            <p style={{ textAlign: "center", color: "#d0e8ee", fontSize: 12, marginTop: 36 }}>
              LifeTap Admin Portal · Batangas, Philippines
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  background: "#f7fcfe",
  border: "1.5px solid #d4eef5",
  borderRadius: 12,
  color: "#0d2d35",
  fontSize: 15,
  fontFamily: "Plus Jakarta Sans, sans-serif",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block",
      color: "#4a8a97",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    }}>
      {children}
    </label>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 12, padding: "12px 14px",
      background: "#fff5f5", border: "1.5px solid #fcc",
      borderRadius: 10, color: "#c0392b", fontSize: 13,
    }}>
      {children}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="submit-btn"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", marginTop: 20, padding: "15px 0",
        background: loading
          ? "#a8dff0"
          : "linear-gradient(135deg, #1BAEE8 0%, #3ECFB2 100%)",
        border: "none", borderRadius: 12,
        color: "white", fontSize: 15, fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "Plus Jakarta Sans, sans-serif",
        boxShadow: loading ? "none" : "0 4px 16px rgba(27,174,232,0.3)",
      }}
    >
      {loading && (
        <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )}
      {children}
    </button>
  );
}