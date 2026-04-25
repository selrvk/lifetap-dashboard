import IdleGuard from "./IdleGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IdleGuard />
      {children}
    </>
  );
}
