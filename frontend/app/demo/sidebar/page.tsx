import SidebarDemo from "@/components/sidebar-demo";

export const metadata = {
  title: "Sidebar Demo - Veritas",
  description: "Aceternity UI Sidebar demonstration with smooth expandable navigation.",
};

export default function SidebarDemoPage() {
  return (
    <main className="min-h-screen w-full bg-neutral-950 text-white flex flex-col items-center justify-center p-4 md:p-10">
      <SidebarDemo />
    </main>
  );
}

