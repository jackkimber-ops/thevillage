import { LoginForm } from "@/components/forms/LoginForm";

// Staff log in with their own email and a 6-digit code, like customers.
export default async function StaffLogin({ searchParams }: PageProps<"/staff/login">) {
  const sp = await searchParams;
  return (
    <div className="page" style={{ justifyContent: "center", padding: 24 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wordmark-full-colour.png" alt="the village." width={140} height={65} style={{ marginBottom: 12 }} />
      <h1 className="heading" style={{ fontSize: 28, marginBottom: 8 }}>staff login</h1>
      {sp.not_staff && <p className="error-text" style={{ marginBottom: 12 }}>This email isn&apos;t a staff account. Ask a manager to add you.</p>}
      <p className="muted" style={{ marginTop: 0 }}>Enter your email and we&apos;ll send you a 6-digit code.</p>
      <LoginForm next="/staff" />
    </div>
  );
}
