import type { Metadata } from "next";
import { ProductPageClient } from "@/components/product/ProductPageClient";

export const metadata: Metadata = {
  title: "Product",
  description: "Compare seller offers and buy your digital key instantly.",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductPageClient slug={slug} />;
}
