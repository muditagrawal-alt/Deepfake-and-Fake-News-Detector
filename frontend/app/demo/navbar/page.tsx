import NavbarDemo from "@/components/navbar-menu-demo";

export const metadata = {
  title: "Navbar Menu Demo - Veritas",
  description: "Aceternity UI Navbar Menu demonstration with animated dropdown panels.",
};

export default function NavbarDemoPage() {
  return (
    <main className="min-h-screen w-full bg-neutral-950 text-white flex flex-col items-center justify-center pt-20">
      <NavbarDemo />
    </main>
  );
}
