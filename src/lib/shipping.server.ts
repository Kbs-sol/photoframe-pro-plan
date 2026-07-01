// Server-only shipping helpers. Import from server functions only.
// Ports the tested logic from PhotoFramePFS: India Post pincode validation +
// Shiprocket serviceability with a cached JWT + a custom tier-rounded floor.

export type SizeCode = "XS" | "S" | "M" | "L";

// Dimensions in cm, weight in kg. Volumetric weight = L*B*H / 5000.
export const SIZE_DIMENSIONS: Record<
  SizeCode,
  { length: number; breadth: number; height: number; weight: number }
> = {
  XS: { length: 35, breadth: 25, height: 3, weight: 0.6 }, // 8x12
  S: { length: 48, breadth: 35, height: 4, weight: 1.2 }, // 12x18
  M: { length: 55, breadth: 45, height: 5, weight: 2.0 }, // 16x20
  L: { length: 80, breadth: 55, height: 6, weight: 3.5 }, // 20x30
};

export function isValidPincode(p: string): boolean {
  return /^[1-9][0-9]{5}$/.test(p);
}

export function isHyderabad(p: string): boolean {
  return p.startsWith("500") || p.startsWith("501") || p.startsWith("502");
}

// India Post — free, no key.
export async function validatePincode(
  pincode: string,
): Promise<{ valid: boolean; district?: string; state?: string }> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return { valid: false };
    const data = (await res.json()) as Array<{
      Status: string;
      PostOffice?: Array<{ District: string; State: string }>;
    }>;
    const first = data?.[0];
    if (first?.Status === "Success" && first.PostOffice?.length) {
      const po = first.PostOffice[0];
      return { valid: true, district: po.District, state: po.State };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

// ── Shiprocket JWT cache (module-scoped, ~23h TTL) ─────────────────────────
let _srToken: string | null = null;
let _srTokenExpiry = 0;

async function getShiprocketToken(): Promise<string | null> {
  const now = Date.now();
  if (_srToken && now < _srTokenExpiry) return _srToken;

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;

  try {
    const res = await fetch(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    if (!data.token) return null;
    _srToken = data.token;
    _srTokenExpiry = now + 23 * 60 * 60 * 1000;
    return _srToken;
  } catch {
    return null;
  }
}

export async function checkServiceability(params: {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  cod: boolean;
  declaredValue: number;
  length: number;
  breadth: number;
  height: number;
}): Promise<{
  available: boolean;
  codAvailable: boolean;
  shippingCharge: number;
  estimatedDays: string;
  courier: string;
} | null> {
  const token = await getShiprocketToken();
  if (!token) return null;

  try {
    const url = new URL(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
    );
    url.searchParams.set("pickup_postcode", params.pickupPincode);
    url.searchParams.set("delivery_postcode", params.deliveryPincode);
    url.searchParams.set("weight", String(params.weight));
    url.searchParams.set("cod", params.cod ? "1" : "0");
    url.searchParams.set("declared_value", String(params.declaredValue));
    url.searchParams.set("length", String(params.length));
    url.searchParams.set("breadth", String(params.breadth));
    url.searchParams.set("height", String(params.height));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: {
        available_courier_companies?: Array<{
          freight_charge?: number;
          rate?: number;
          cod?: number;
          etd?: string;
          courier_name?: string;
        }>;
      };
    };
    const list = data.data?.available_courier_companies ?? [];
    if (!list.length) {
      return {
        available: false,
        codAvailable: false,
        shippingCharge: 0,
        estimatedDays: "3-5",
        courier: "",
      };
    }
    const best = list[0];
    return {
      available: true,
      codAvailable: best.cod === 1,
      shippingCharge: Math.ceil(best.freight_charge ?? best.rate ?? 0),
      estimatedDays: best.etd ?? "3-5",
      courier: best.courier_name ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Round shipping charge UP to the next tier ending in 49/99, minimum ₹99.
 * 0..99 → 99, 100..149 → 149, 150..199 → 199, 200..249 → 249, …
 */
export function roundToTier(raw: number): number {
  const floor = 99;
  if (raw <= floor) return floor;
  // Tiers: 99, 149, 199, 249, 299, … => 99 + 50*k
  const k = Math.ceil((raw - 99) / 50);
  return 99 + 50 * k;
}

export function calculateShipping(
  shiprocketCharge: number | null,
  paymentMethod: "cod" | "prepaid",
  cartTotal: number,
  freeThreshold: number,
): number {
  if (paymentMethod !== "cod" && cartTotal >= freeThreshold) return 0;
  const raw = shiprocketCharge ?? 99;
  return roundToTier(raw);
}
