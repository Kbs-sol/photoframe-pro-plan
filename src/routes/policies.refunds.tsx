import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PolicyShell } from "@/components/site/policy-shell";

export const Route = createFileRoute("/policies/refunds")({
  head: () => ({
    meta: [
      { title: "Refund & Returns Policy — ChitraFrame" },
      { name: "description", content: "Our damage-free guarantee, refund process and return eligibility for made-to-order framed prints." },
      { property: "og:title", content: "Refund & Returns Policy — ChitraFrame" },
      { property: "og:description", content: "Our damage-free guarantee, refund process and return eligibility for made-to-order framed prints." },
    ],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <PolicyShell title="Refund & Returns Policy" updated="8 July 2026">
        <p>
          Because every ChitraFrame is made to order, we cannot accept returns for change of mind. But
          we stand behind our craft with a <strong>damage-free guarantee</strong>.
        </p>

        <h2>1. Damage-free guarantee</h2>
        <p>
          If your frame arrives damaged, defective, or significantly different from what you ordered,
          we will replace it free of cost or issue a full refund — your choice.
        </p>
        <p>
          <strong>You must report the issue within 48 hours of delivery.</strong> Email
          <a href="mailto:hello@chitraframe.in"> hello@chitraframe.in</a> with:
        </p>
        <ul>
          <li>Your order ID (format: PS-YYMMDD-XXXX)</li>
          <li>Clear photos of the damage or defect</li>
          <li>A photo of the outer packaging (if it was damaged in transit)</li>
        </ul>

        <h2>2. What is not covered</h2>
        <ul>
          <li>Change of mind, wrong size/design chosen at checkout.</li>
          <li>Minor colour variation from what appears on your monitor.</li>
          <li>Damage caused after delivery.</li>
          <li>Custom or personalised orders (unless there is a manufacturing defect).</li>
        </ul>

        <h2>3. Refund process &amp; timeline</h2>
        <ul>
          <li>Once a refund is approved, we initiate it within 2 business days.</li>
          <li>Refunds to UPI, wallets and cards typically credit in 5–7 business days.</li>
          <li>COD refunds are issued via UPI or bank transfer; please share your details when requested.</li>
        </ul>

        <h2>4. Order cancellation</h2>
        <p>
          You can cancel an order any time <strong>before it enters production</strong> (usually within
          2 hours of placing it) for a full refund. Once production has started, the order cannot be
          cancelled.
        </p>

        <h2>5. Need help?</h2>
        <p>
          Write to <a href="mailto:hello@chitraframe.in">hello@chitraframe.in</a> and we'll get back
          within one business day.
        </p>
      </PolicyShell>
      <SiteFooter />
    </div>
  );
}