import type { Metadata } from "next";
import { OrdersClient } from "@/components/orders/OrdersClient";

export const metadata: Metadata = {
  title: "My orders",
};

export default function AccountOrdersPage() {
  return <OrdersClient variant="account" />;
}
