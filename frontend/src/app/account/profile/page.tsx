import type { Metadata } from "next";
import { ProfileClient } from "@/components/account/ProfileClient";

export const metadata: Metadata = {
  title: "My profile",
};

export default function AccountProfilePage() {
  return <ProfileClient />;
}
