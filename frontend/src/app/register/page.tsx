import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an account to buy digital keys and track your orders.",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="site-container py-12">
          <div className="skeleton mx-auto h-[620px] w-full max-w-[900px]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
