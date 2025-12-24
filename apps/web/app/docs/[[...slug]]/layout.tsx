import "~/styles/prose.css";

import { NavbarMobileProvider } from "~/components/nav-mobile";

import { Navbar } from "~/components/nav-bar";
import { Sidebar } from "~/components/side-bar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="font-calling-code bg-background relative min-h-screen pt-16">
      <NavbarMobileProvider>
        <Navbar />
        <main className="relative mx-auto flex max-w-[1440px] grow flex-row">
          <div className="hidden md:block md:w-[268px] lg:w-[286px] shrink-0">
            <div className="fixed top-16 h-[calc(100vh-4rem)] w-[268px] overflow-y-auto lg:w-[286px]">
              <Sidebar />
            </div>
          </div>

          <div className="relative min-w-0 flex-1">
            <div className="px-6 py-10 lg:px-10 lg:py-12">{children}</div>
          </div>
        </main>
      </NavbarMobileProvider>
    </div>
  );
}
