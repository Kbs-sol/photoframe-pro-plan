import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PolicyShell } from "@/components/site/policy-shell";

export const Route = createFileRoute("/policies/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping Policy — ChitraFrame" },
      { name: "description", content: "Dispatch timelines, delivery estimates and shipping charges across India." },
      { property: "og:title", content: "Shipping Policy — ChitraFrame" },
      { property: "og:description", content: "Dispatch timelines, delivery estimates and shipping charges across India." },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <PolicyShell title="Shipping Policy" updated="8 July 2026">
        <p>
          Every ChitraFrame piece is made to order. Here's what to expect between placing an order and
          it arriving at your door.
        </p>

        <h2>1. Production time</h2>
        <p>
          Orders are produced within <strong>72 hours</strong> of payment confirmation. Custom or
          personalised orders may take up to 5 business days.
        </p>

        <h2>2. Dispatch &amp; delivery estimates</h2>
        <ul>
          <li>Metro cities (Mumbai, Delhi NCR, Bengaluru, Chennai, Hyderabad, Pune, Kolkata): <strong>3–5 business days</strong> after dispatch.</li>
          <li>Tier 2 and other cities: <strong>5–7 business days</strong> after dispatch.</li>
          <li>Remote pin codes and the North-East: <strong>7–10 business days</strong> after dispatch.</li>
        </ul>

        <h2>3. Shipping charges</h2>
        <ul>
          <li>Orders <strong>above ₹999</strong>: free shipping across India.</li>
          <li>Orders <strong>below ₹999</strong>: flat ₹99 shipping fee.</li>
          <li>Cash on Delivery (COD): additional ₹49 handling fee per order, where available.</li>
        </ul>

        <h2>4. Order tracking</h2>
        <p>
          Once dispatched, you'll receive a tracking link via email and SMS. You can also track any
          order at any time on our <a href="/track">Track Order</a> page.
        </p>

        <h2>5. Undelivered &amp; returned shipments</h2>
        <p>
          If a shipment is returned to us because the address was wrong or nobody was available to
          receive it, we will contact you to arrange re-dispatch. Re-dispatch charges may apply.
        </p>

        <h2>6. International shipping</h2>
        <p>
          We currently ship only within India. For international enquiries, please email
          <a href="mailto:hello@chitraframe.in"> hello@chitraframe.in</a>.
        </p>
      </PolicyShell>
      <SiteFooter />
    </div>
  );
}