import type { Metadata } from "next";
import { CashbackClient } from "@/components/account/CashbackClient";

export const metadata: Metadata = {
  title: "Cashback",
};

export default function AccountCashbackPage() {
  return <CashbackClient />;
}
