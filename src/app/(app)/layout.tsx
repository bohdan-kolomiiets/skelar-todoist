import { TaskStoreProvider } from "@/lib/tasks/TaskStoreProvider";
import { TabBar } from "@/components/nav/TabBar";

/** App shell: one shared task store + the bottom tab bar, mobile-first column. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TaskStoreProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-2 text-text-primary">
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
        <TabBar />
      </div>
    </TaskStoreProvider>
  );
}
