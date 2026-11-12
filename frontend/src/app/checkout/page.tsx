import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { ProtectedGate } from "@/components/ProtectedGate";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your simulated payment and receive your digital keys.",
};

export default function CheckoutPage() {
  return (
    <ProtectedGate
      title="Sign in to check out"
      description="Checkout is protected. Sign in to pay with a test card and receive your digital keys."
    >
      <CheckoutClient />
    </ProtectedGate>
  );
}
