import type { Metadata } from "next";
import { OrdersClient } from "@/components/orders/OrdersClient";
import { ProtectedGate } from "@/components/ProtectedGate";

export const metadata: Metadata = {
  title: "My orders",
  description: "View your marketplace orders and digital keys.",
};

export default function OrdersPage() {
  return (
    <ProtectedGate
      title="Sign in to see your orders"
      description="Your receipts and digital keys are private to your account. Sign in to view your order history."
    >
      <OrdersClient />
    </ProtectedGate>
  );
}
