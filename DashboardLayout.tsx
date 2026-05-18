import { AppSidebar } from '@/components/AppSidebar';
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <DevRoleSwitcher />
    </div>
  );
}