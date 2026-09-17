import { requirePersonnel } from "@/lib/auth/personnel";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { logAudit } from "@/lib/audit";
import { CURRENT_NOTICE_VERSION } from "@/lib/constants/consent";
import type { ConsentChoices, ConsentEvent, ConsentEventType } from "@/lib/types";
import NavBar from "@/components/NavBar";
import { logout } from "@/app/actions/auth";

const WITHDRAWAL_EVENTS: ConsentEventType[] = ["withdrawn", "account_deleted"];

const EVENT_LABELS: Record<ConsentEventType, string> = {
  given: "Consent given",
  renewed: "Notice renewed",
  changed: "Preferences changed",
  cloud_backup_given: "Cloud backup enabled",
  withdrawn: "Consent withdrawn",
  account_deleted: "Account deleted",
};

type BadgeVariant = "blue" | "teal" | "amber" | "gray" | "purple" | "red";

const EVENT_VARIANT: Record<ConsentEventType, BadgeVariant> = {
  given: "gray",
  renewed: "blue",
  changed: "gray",
  cloud_backup_given: "teal",
  withdrawn: "red",
  account_deleted: "red",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtBool(v: boolean | undefined): string {
  return v === undefined ? "—" : v ? "on" : "off";
}

function diffChoices(prev: ConsentChoices | null, curr: ConsentChoices): string[] {
  const diffs: string[] = [];
  if (prev?.smsAlerts !== curr.smsAlerts) diffs.push(`SMS alerts: ${fmtBool(prev?.smsAlerts)} → ${fmtBool(curr.smsAlerts)}`);
  if (prev?.cloudBackup !== curr.cloudBackup) diffs.push(`Cloud backup: ${fmtBool(prev?.cloudBackup)} → ${fmtBool(curr.cloudBackup)}`);
  if (prev?.contactsConfirmed !== curr.contactsConfirmed) diffs.push(`Contacts confirmed: ${fmtBool(prev?.contactsConfirmed)} → ${fmtBool(curr.contactsConfirmed)}`);

  const prevGuardian = prev?.guardian ?? null;
  const currGuardian = curr.guardian ?? null;
  if (JSON.stringify(prevGuardian) !== JSON.stringify(currGuardian)) {
    if (!prevGuardian && currGuardian) diffs.push(`Guardian added: ${currGuardian.name} (${currGuardian.relationship})`);
    else if (prevGuardian && !currGuardian) diffs.push("Guardian removed");
    else if (prevGuardian && currGuardian) diffs.push(`Guardian changed: ${prevGuardian.name} (${prevGuardian.relationship}) → ${currGuardian.name} (${currGuardian.relationship})`);
  }
  return diffs;
}

function Badge({ children, variant = "gray" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span style={{
      background: `var(--badge-${variant}-bg)`, color: `var(--badge-${variant}-fg)`,
      border: `1px solid var(--badge-${variant}-bd)`,
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 600, lineHeight: 1.8, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: "var(--text-5)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
      {children ?? <p style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 500, marginTop: 2 }}>{value || "—"}</p>}
    </div>
  );
}

export default async function ConsentTimelinePage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const { supabase, me } = await requirePersonnel();
  if (me.role !== "admin") redirect("/dashboard");

  const { ownerId } = await params;

  const { data: ownerRow } = await supabase
    .from("users")
    .select("id, n, phn, cty, consent_version, consent_given_at, consent_withdrawn_at, consent_details")
    .eq("id", ownerId)
    .maybeSingle();

  const { data: eventRows, error: eventsError } = await supabase
    .from("consent_events")
    .select("id, owner_id, profile_id, event, notice_version, choices, occurred_at, recorded_at")
    .eq("owner_id", ownerId)
    .order("occurred_at", { ascending: true });

  if (eventsError) console.error("Failed to fetch consent timeline:", eventsError.message);

  const events = (eventRows ?? []) as unknown as ConsentEvent[];

  if (!ownerRow && events.length === 0) notFound();

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  let mismatchWarning: string | null = null;
  if (ownerRow && latestEvent) {
    const latestIsWithdrawn = WITHDRAWAL_EVENTS.includes(latestEvent.event);
    const userIsWithdrawn = ownerRow.consent_withdrawn_at !== null;
    if (latestIsWithdrawn !== userIsWithdrawn) {
      mismatchWarning = "This account's current consent status does not match its latest recorded event.";
    } else if (!latestIsWithdrawn && ownerRow.consent_version !== latestEvent.notice_version) {
      mismatchWarning = `The account's current consent version (${ownerRow.consent_version ?? "—"}) does not match the latest event's notice version (${latestEvent.notice_version}).`;
    }
  }

  await logAudit({
    actor: me,
    action: "view_consent_history",
    resourceType: "consent_events",
    resourceId: ownerId,
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar name={me.full_name} role={me.role} onLogout={logout} />

      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", color: "var(--text)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <main style={{ padding: "32px 32px 48px", maxWidth: 900, margin: "0 auto" }}>
          <Link href="/dashboard/consent" style={{ fontSize: 12, color: "var(--text-4)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back to Consent History
          </Link>

          {/* Header */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, boxShadow: "var(--shadow-sm)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
              Consent Timeline
            </p>
            {ownerRow ? (
              <>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{ownerRow.n}</h1>
                <p className="mono" style={{ fontSize: 12, color: "var(--text-5)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{ownerId}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px 16px", marginTop: 16 }}>
                  <Field label="Phone" value={ownerRow.phn} />
                  <Field label="City" value={ownerRow.cty ?? "—"} />
                  <Field label="Current Notice Version" value={ownerRow.consent_version ?? "—"} />
                  <Field label="Consent Given">
                    {ownerRow.consent_given_at ? <Badge variant="teal">{formatDateTime(ownerRow.consent_given_at)}</Badge> : <Badge variant="gray">Not recorded</Badge>}
                  </Field>
                  {ownerRow.consent_withdrawn_at && (
                    <Field label="Consent Withdrawn">
                      <Badge variant="red">{formatDateTime(ownerRow.consent_withdrawn_at)}</Badge>
                    </Field>
                  )}
                </div>
                {ownerRow.consent_details && Object.keys(ownerRow.consent_details).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px 14px", marginTop: 14, fontSize: 12, color: "var(--text-3)" }}>
                    {typeof ownerRow.consent_details.smsAlerts === "boolean" && <span>SMS alerts: <strong>{ownerRow.consent_details.smsAlerts ? "On" : "Off"}</strong></span>}
                    {typeof ownerRow.consent_details.cloudBackup === "boolean" && <span>Cloud backup: <strong>{ownerRow.consent_details.cloudBackup ? "On" : "Off"}</strong></span>}
                    {typeof ownerRow.consent_details.contactsConfirmed === "boolean" && <span>Contacts confirmed: <strong>{ownerRow.consent_details.contactsConfirmed ? "Yes" : "No"}</strong></span>}
                    {ownerRow.consent_details.guardian && <span>Guardian: <strong>{ownerRow.consent_details.guardian.name} ({ownerRow.consent_details.guardian.relationship})</strong></span>}
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-4)" }}>Account deleted</h1>
                <p className="mono" style={{ fontSize: 12, color: "var(--text-5)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{ownerId}</p>
                <p style={{ fontSize: 13, color: "var(--text-4)", marginTop: 12, lineHeight: 1.6 }}>
                  This person&apos;s profile no longer exists. The consent history below is kept as proof any withdrawal or deletion request was carried out.
                </p>
              </>
            )}

            {mismatchWarning && (
              <div style={{ marginTop: 16, background: "var(--badge-amber-bg)", border: "1px solid var(--badge-amber-bd)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "var(--badge-amber-fg)", fontWeight: 600 }}>{mismatchWarning}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
              History ({events.length} event{events.length !== 1 ? "s" : ""})
            </p>

            {events.length === 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "40px 24px", textAlign: "center", color: "var(--text-5)", fontSize: 13 }}>
                No consent events recorded.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {events.map((e, i) => {
                  const prevChoices = i > 0 ? events[i - 1].choices : null;
                  const changes = e.event === "changed" ? diffChoices(prevChoices, e.choices) : [];
                  const isOld = e.notice_version !== CURRENT_NOTICE_VERSION && !WITHDRAWAL_EVENTS.includes(e.event);

                  return (
                    <div key={e.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Badge variant={EVENT_VARIANT[e.event]}>{EVENT_LABELS[e.event] ?? e.event}</Badge>
                          <span className="mono" style={{ fontSize: 12, color: "var(--text-4)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDateTime(e.occurred_at)}</span>
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: isOld ? "var(--badge-amber-fg)" : "var(--text-6)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {e.notice_version}{isOld && " (older)"}
                        </span>
                      </div>

                      {new Date(e.recorded_at).getTime() - new Date(e.occurred_at).getTime() > 60 * 60 * 1000 && (
                        <p style={{ fontSize: 11, color: "var(--text-6)", marginBottom: 8 }}>
                          Recorded {formatDateTime(e.recorded_at)} — phone offline when this happened.
                        </p>
                      )}

                      {changes.length > 0 && (
                        <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                          {changes.map((c, ci) => <li key={ci}>{c}</li>)}
                        </ul>
                      )}

                      {Object.keys(e.choices ?? {}).length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px 14px", fontSize: 12, color: "var(--text-3)" }}>
                          {typeof e.choices.smsAlerts === "boolean" && <span>SMS alerts: <strong>{e.choices.smsAlerts ? "On" : "Off"}</strong></span>}
                          {typeof e.choices.cloudBackup === "boolean" && <span>Cloud backup: <strong>{e.choices.cloudBackup ? "On" : "Off"}</strong></span>}
                          {typeof e.choices.contactsConfirmed === "boolean" && <span>Contacts confirmed: <strong>{e.choices.contactsConfirmed ? "Yes" : "No"}</strong></span>}
                          {e.choices.guardian && <span>Guardian: <strong>{e.choices.guardian.name} ({e.choices.guardian.relationship})</strong></span>}
                        </div>
                      )}

                      <p className="mono" style={{ fontSize: 10, color: "var(--text-6)", marginTop: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                        {e.id.startsWith("srv-") ? "Server" : "App"} · {e.id}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
