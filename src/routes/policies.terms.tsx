import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PolicyShell } from "@/components/site/policy-shell";

export const Route = createFileRoute("/policies/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ChitraFrame" },
      { name: "description", content: "The terms governing your use of ChitraFrame and purchases made on our website." },
      { property: "og:title", content: "Terms of Service — ChitraFrame" },
      { property: "og:description", content: "The terms governing your use of ChitraFrame and purchases made on our website." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <PolicyShell title="Terms of Service" updated="8 July 2026">
        <p>
          Welcome to ChitraFrame ("we", "us", "our"). By accessing our website or placing an order, you
          agree to these Terms of Service. Please read them carefully.
        </p>

        <h2>1. About us</h2>
        <p>
          ChitraFrame is operated by <strong>[Legal entity name]</strong>, [address], India. You can
          reach us at <a href="mailto:hello@chitraframe.in">hello@chitraframe.in</a>.
        </p>

        <h2>2. Products &amp; orders</h2>
        <p>
          All frames are made to order. Once payment is confirmed, production begins and the order
          cannot be modified. Colors on screen may differ slightly from the final print due to monitor
          calibration and paper stock.
        </p>

        <h2>3. Pricing &amp; payment</h2>
        <p>
          Prices are shown in Indian Rupees (INR) and include GST where applicable. We accept payments
          via Razorpay (UPI, cards, netbanking, wallets) and Cash on Delivery for eligible pin codes.
          COD orders may require phone confirmation before dispatch.
        </p>

        <h2>4. Intellectual property</h2>
        <p>
          All artwork, photography and designs on this site are owned by ChitraFrame or licensed to us.
          You may not reproduce, resell or redistribute any content without written permission.
        </p>

        <h2>5. User conduct</h2>
        <p>
          You agree not to misuse the website, attempt unauthorized access, or upload content that is
          unlawful, infringing or offensive when using our custom-order features.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, our liability for any order is limited to the amount
          paid for that order. We are not liable for indirect or consequential loss.
        </p>

        <h2>7. Governing law</h2>
        <p>
          These terms are governed by the laws of India. Any dispute is subject to the exclusive
          jurisdiction of the courts at <strong>[City]</strong>.
        </p>

        <h2>8. Changes</h2>
        <p>
          We may update these terms from time to time. The latest version will always be available on
          this page with the "Last updated" date at the top.
        </p>
      </PolicyShell>
      <SiteFooter />
    </div>
  );
}