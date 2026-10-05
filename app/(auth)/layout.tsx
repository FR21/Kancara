import type { ReactNode } from "react";
import AuthSlideshow from "@/components/auth/AuthSlideshow";
import AuthTopBar from "@/components/auth/AuthTopBar";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 grid-rows-[auto_auto_1fr] lg:grid-cols-2 lg:grid-rows-[auto_1fr]">
      <AuthTopBar />
      <AuthSlideshow />
      <main className="flex items-start justify-center px-4 pt-8 pb-12 sm:px-8 lg:col-start-2 lg:row-start-2 lg:items-center lg:px-12 lg:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
