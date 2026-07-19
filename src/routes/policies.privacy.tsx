import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PolicyShell } from "@/components/site/policy-shell";

export const Route = createFileRoute("/policies/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ChitraFrame" },
      { name: "description", content: "How ChitraFrame collects, uses and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — ChitraFrame" },
      { property: "og:description", content: "How ChitraFrame collects, uses and protects your personal information." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <PolicyShell title="Privacy Policy" updated="8 July 2026">
        <p>
          This policy explains what personal information ChitraFrame collects, why we collect it, and
          how we protect it. It is written in plain language.
        </p>

        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Contact details</strong> — name, email, phone number, shipping address.</li>
          <li><strong>Order details</strong> — items purchased, amount, payment method, delivery status.</li>
          <li><strong>Payment</strong> — handled by Razorpay. We never see or store your card, UPI or bank details.</li>
          <li><strong>Website usage</strong> — pages visited, device type, referring source, via analytics cookies.</li>
        </ul>

        <h2>2. How we use it</h2>
        <ul>
          <li>To process and deliver your orders.</li>
          <li>To send order confirmations, dispatch notifications and support replies via email.</li>
          <li>To improve our site, products and marketing.</li>
          <li>To comply with tax and legal obligations.</li>
        </ul>

        <h2>3. Who we share it with</h2>
        <p>
          We share the minimum necessary data with trusted service providers: Razorpay (payments),
          our shipping partners (delivery), MailerSend (transactional email), Cloudinary (image
          hosting) and our cloud infrastructure providers. We never sell your data.
        </p>

        <h2>4. Cookies</h2>
        <p>
          We use essential cookies to keep your cart and session working, and analytics cookies to
          understand traffic. You can disable cookies in your browser settings; some features may not
          work as a result.
        </p>

        <h2>5. Your rights</h2>
        <p>
          You can request access to, correction of, or deletion of your personal data by emailing
          <a href="mailto:hello@chitraframe.in"> hello@chitraframe.in</a>. We respond within 30 days.
        </p>

        <h2>6. Data retention</h2>
        <p>
          Order records are retained for at least 7 years to comply with Indian tax law. Marketing
          preferences are retained until you unsubscribe.
        </p>

        <h2>7. Security</h2>
        <p>
          Data is transmitted over HTTPS and stored on encrypted infrastructure. Access is limited to
          staff who need it to fulfil orders.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions? Email <a href="mailto:hello@chitraframe.in">hello@chitraframe.in</a> or write to
          <strong> [Legal entity name], [address], India</strong>.
        </p>
      </PolicyShell>
      <SiteFooter />
    </div>
  );
}