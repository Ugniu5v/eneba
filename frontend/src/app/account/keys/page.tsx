import type { Metadata } from "next";
import { KeyLibraryClient } from "@/components/account/KeyLibraryClient";

export const metadata: Metadata = {
  title: "Key library",
};

export default function AccountKeysPage() {
  return <KeyLibraryClient />;
}
