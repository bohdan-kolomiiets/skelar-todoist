import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProfileTaskStore } from "@/lib/tasks/ProfileTaskStore";
import { TabBar } from "@/components/nav/TabBar";

// NOTE: SaveNudgeProvider (Task 8) is not wired yet — it doesn't exist on this
// branch until Task 8 lands. Task 8 will add it as a wrapper inside
// ProfileTaskStore, around the div below.
/** App shell: identity → profile-scoped task store, then the bottom tab bar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileTaskStore>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-2 text-text-primary">
          <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
          <TabBar />
        </div>
      </ProfileTaskStore>
    </AuthProvider>
  );
}
