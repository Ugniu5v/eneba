import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CreditCard, KeyRound, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Help & how it works",
  description:
    "How the demo marketplace handles checkout, test payments, digital keys and accounts.",
};

const faqs = [
  {
    question: "Is this a real marketplace?",
    answer:
      "No. This is an independent engineering demo inspired by Eneba's visual language. It is not affiliated with Eneba and no real money or retail game keys are involved.",
  },
  {
    question: "How does payment work?",
    answer:
      "Checkout runs through a simulated card processor. A valid-looking card such as 4242 4242 4242 4242 always succeeds. A test card ending in 0002 is declined so the error state can be exercised. Card data is never stored.",
  },
  {
    question: "When do I receive my digital key?",
    answer:
      "Immediately after a successful simulated payment. The backend reserves unique codes from the selected seller's inventory, creates an order and attaches the codes to it. Your key appears on the order page and in My orders.",
  },
  {
    question: "Why do I need an account?",
    answer:
      "Carts are public, but checkout and order history are protected. The Go API enforces this with HTTP-only session cookies. Sign in with the seeded demo account or create a new one.",
  },
  {
    question: "Where does the homepage content come from?",
    answer:
      "Each homepage block is fetched independently from its own API endpoint: banners, categories, recommended products, top games, deals, gift cards and new releases. The frontend contains no hardcoded product content.",
  },
];

export default function HelpPage() {
  return (
    <div className="site-container py-6 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Help & how it works" },
        ]}
      />
      <div className="mt-5 max-w-3xl">
        <p className="eyebrow text-eneba-yellow">The fine print, minus the fine print</p>
        <h1 className="mt-2 text-[34px] font-bold leading-[1.03] tracking-[-0.045em] sm:text-[46px]">
          How the demo marketplace works
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
          A clear look at checkout, test payments, digital key delivery and the
          account rules that protect order history.
        </p>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          {
            icon: CreditCard,
            title: "Simulated payment",
            copy: "A test card is validated and charged in a simulated processor. No real charge is made.",
          },
          {
            icon: KeyRound,
            title: "Unique digital keys",
            copy: "Each checkout reserves unsold inventory codes and attaches them to your private order.",
          },
          {
            icon: ShieldCheck,
            title: "Account protected",
            copy: "Checkout and order history require an HTTP-only session issued by the Go API.",
          },
        ].map(({ icon: Icon, title, copy }) => (
          <div key={title} className="border border-white/12 bg-eneba-surface p-5">
            <Icon size={21} className="text-eneba-yellow" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold">{title}</h2>
            <p className="mt-1.5 text-[12px] leading-5 text-white/52">{copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-14">
        <div>
          <h2 className="text-[24px] font-bold tracking-[-0.025em]">Common questions</h2>
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold marker:hidden">
                  {faq.question}
                  <span className="text-lg leading-none text-white/35 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-white/55">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        <aside className="border border-white/14 bg-black/10 p-5">
          <h2 className="text-base font-bold">Try the purchase flow</h2>
          <ol className="mt-4 space-y-3">
            {[
              "Sign in with the demo account.",
              "Add a product from the store.",
              "Use 4242 4242 4242 4242 at checkout.",
              "Copy the keys from your order.",
            ].map((step) => (
              <li key={step} className="flex gap-2.5 text-[12px] leading-5 text-white/58">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-eneba-mint" aria-hidden="true" />
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 border border-eneba-yellow/25 bg-eneba-yellow/[0.05] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eneba-yellow">
              Demo credentials
            </p>
            <p className="mt-1.5 break-all font-mono text-[11px] leading-5 text-white/62">
              demo@eneba.test
              <br />
              Demo1234!
            </p>
          </div>
          <div className="mt-5 grid gap-2">
            <Link href="/login" className="btn btn-primary w-full text-xs">
              Use demo account
            </Link>
            <Link href="/store" className="btn btn-secondary w-full text-xs">
              Browse products
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
