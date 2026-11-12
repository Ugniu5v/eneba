import type { Metadata } from "next";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";
import { ProtectedGate } from "@/components/ProtectedGate";

export const metadata: Metadata = {
  title: "Order details",
  description: "View your order and digital keys.",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  return (
    <ProtectedGate
      title="Sign in to view this order"
      description="Order details and digital keys are private to the account that bought them."
    >
      <OrderDetailClient number={number} />
    </ProtectedGate>
  );
}
