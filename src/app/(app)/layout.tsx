import { AuthProvider } from "@/lib/auth/AuthProvider";
import { RequireProfile } from "@/components/auth/RequireProfile";
import { ProfileTaskStore } from "@/lib/tasks/ProfileTaskStore";
import { SaveNudgeProvider } from "@/lib/nudge/SaveNudgeProvider";
import { TabBar } from "@/components/nav/TabBar";

/** App shell: identity → welcome guard (pre-guest redirect) → save nudge (auth-only, hoisted above the task store) → profile-scoped task store, then the bottom tab bar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireProfile>
        <SaveNudgeProvider>
          <ProfileTaskStore>
            <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-2 text-text-primary">
              <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
              <TabBar />
            </div>
          </ProfileTaskStore>
        </SaveNudgeProvider>
      </RequireProfile>
    </AuthProvider>
  );
}
