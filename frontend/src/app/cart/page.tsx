import type { Metadata } from "next";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Shopping cart",
  description: "Review the digital products in your marketplace cart.",
};

export default function CartPage() {
  return <CartClient />;
}
