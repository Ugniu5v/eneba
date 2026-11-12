import type { Metadata } from "next";
import { WishlistClient } from "@/components/WishlistClient";

export const metadata: Metadata = {
  title: "Wish list",
  description: "Games and gift cards saved for later.",
};

export default function WishlistPage() {
  return <WishlistClient />;
}
