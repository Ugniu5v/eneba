import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to access checkout, digital keys and order history.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="site-container py-12">
          <div className="skeleton mx-auto h-[560px] w-full max-w-[900px]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
