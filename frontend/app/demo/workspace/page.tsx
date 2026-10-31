import AppFlow from "@/components/AppFlow";

export const metadata = {
  title: "Workspace Sidebar Demo - Veritas",
  description: "Veritas Workspace with Aceternity UI Sidebar.",
};

export default function WorkspaceDemoPage() {
  const mockUser = {
    id: "user_mock",
    name: "Alex Vance",
    email: "alex.vance@investigative-desk.org",
    image: null,
  };

  return <AppFlow user={mockUser} providers={[]} startInWorkspace={true} />;
}
