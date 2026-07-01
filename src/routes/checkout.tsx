import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { checkoutSchema, type CheckoutInput } from "@/lib/checkout-schema";
import {
  validatePincodeFn,
  estimateShippingFn,
} from "@/lib/shipping.functions";

type ShippingQuote = {
  shipping: number;
  total: number;
  cartTotal: number;
  freeShipping: boolean;
  estimatedDays: string;
  courier: string;
  codAvailable: boolean;
  shiprocketAvailable: boolean;
};

// Demo cart — replace with real cart state when wired up.
const DEMO_CART: Array<{ size: "XS" | "S" | "M" | "L"; price: number; quantity: number }> = [
  { size: "M", price: 1399, quantity: 1 },
];

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — ChitraFrame" },
      { name: "description", content: "Complete your order of made-in-India framed wall art." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type Errors = Partial<Record<keyof CheckoutInput, string>>;

const empty: CheckoutInput = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  notes: "",
};

function CheckoutPage() {
  const [values, setValues] = useState<CheckoutInput>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "prepaid">("prepaid");
  const [pinStatus, setPinStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "invalid"; message: string }
    | { state: "valid"; district: string; state_: string; express: boolean }
  >({ state: "idle" });
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const update = <K extends keyof CheckoutInput>(k: K, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
  };

  async function onPincodeBlur() {
    const pin = values.pincode.trim();
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinStatus({ state: "invalid", message: "Enter a valid 6-digit PIN" });
      setQuote(null);
      return;
    }
    setPinStatus({ state: "checking" });
    setQuoteLoading(true);
    try {
      const [pinRes, quoteRes] = await Promise.all([
        validatePincodeFn({ data: { pincode: pin } }),
        estimateShippingFn({
          data: { pincode: pin, paymentMethod, items: DEMO_CART },
        }),
      ]);
      if (!pinRes.valid) {
        setPinStatus({ state: "invalid", message: "PIN not serviceable" });
        setQuote(null);
        return;
      }
      setPinStatus({
        state: "valid",
        district: pinRes.district ?? "",
        state_: pinRes.state ?? "",
        express: pinRes.express,
      });
      // Auto-fill city/state if blank
      setValues((s) => ({
        ...s,
        city: s.city || pinRes.district || "",
        state: s.state || pinRes.state || "",
      }));
      if (quoteRes.ok) {
        setQuote({
          shipping: quoteRes.shipping,
          total: quoteRes.total,
          cartTotal: quoteRes.cartTotal,
          freeShipping: quoteRes.freeShipping,
          estimatedDays: quoteRes.estimatedDays,
          courier: quoteRes.courier,
          codAvailable: quoteRes.codAvailable,
          shiprocketAvailable: quoteRes.shiprocketAvailable,
        });
      }
    } catch {
      setPinStatus({ state: "invalid", message: "Could not verify PIN" });
    } finally {
      setQuoteLoading(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CheckoutInput | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    // Server-side validation MUST re-run checkoutSchema.parse() before creating
    // any Razorpay order — never trust client validation alone.
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Thanks — details received</h1>
        <p className="mt-3 text-muted-foreground">
          Payment integration is coming next. Your shipping details are validated and ready.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl font-semibold">
            Chitra<span className="text-primary">Frame</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-3xl font-semibold">Shipping details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Made-to-order, dispatched within 72 hours across India.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.fullName} className="sm:col-span-2">
            <input
              type="text"
              autoComplete="name"
              maxLength={80}
              value={values.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className={inputCls(!!errors.fullName)}
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputCls(!!errors.email)}
            />
          </Field>

          <Field label="Mobile (10 digits)" error={errors.phone}>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={values.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
              className={inputCls(!!errors.phone)}
            />
          </Field>

          <Field label="Address line 1" error={errors.addressLine1} className="sm:col-span-2">
            <input
              type="text"
              autoComplete="address-line1"
              maxLength={120}
              value={values.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              className={inputCls(!!errors.addressLine1)}
            />
          </Field>

          <Field label="Address line 2 (optional)" error={errors.addressLine2} className="sm:col-span-2">
            <input
              type="text"
              autoComplete="address-line2"
              maxLength={120}
              value={values.addressLine2 ?? ""}
              onChange={(e) => update("addressLine2", e.target.value)}
              className={inputCls(!!errors.addressLine2)}
            />
          </Field>

          <Field label="City" error={errors.city}>
            <input
              type="text"
              autoComplete="address-level2"
              maxLength={60}
              value={values.city}
              onChange={(e) => update("city", e.target.value)}
              className={inputCls(!!errors.city)}
            />
          </Field>

          <Field label="State" error={errors.state}>
            <input
              type="text"
              autoComplete="address-level1"
              maxLength={60}
              value={values.state}
              onChange={(e) => update("state", e.target.value)}
              className={inputCls(!!errors.state)}
            />
          </Field>

          <Field label="PIN code" error={errors.pincode}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={values.pincode}
              onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
              className={inputCls(!!errors.pincode)}
            />
          </Field>

          <Field label="Order notes (optional)" error={errors.notes} className="sm:col-span-2">
            <textarea
              maxLength={500}
              rows={3}
              value={values.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              className={inputCls(!!errors.notes)}
            />
          </Field>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
            >
              Continue to payment
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Your details are validated locally and re-verified on our server before payment.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-md border bg-card px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 ${
    hasError ? "border-destructive" : "border-border focus:border-primary/60"
  }`;
}
