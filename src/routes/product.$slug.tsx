import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getProduct, products, sizes, frameTypes, frameFinishes } from "@/lib/products";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.title} — ChitraFrame` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: `${loaderData.product.title} — ChitraFrame` },
          { property: "og:description", content: loaderData.product.description },
        ]
      : [],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">Product not found</h1>
      <Link to="/" className="mt-6 inline-block text-primary hover:underline">
        Back to shop
      </Link>
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
    </div>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [size, setSize] = useState<(typeof sizes)[number]["id"]>(sizes[1].id);
  const [frameType, setFrameType] = useState<(typeof frameTypes)[number]["id"]>(frameTypes[0].id);
  const [finish, setFinish] = useState(frameFinishes[0].id);
  const [qty, setQty] = useState(1);

  const sizeObj = sizes.find((s) => s.id === size)!;
  const frameObj = frameTypes.find((f) => f.id === frameType)!;
  const unitPrice = product.price + sizeObj.delta + frameObj.priceDelta;
  const price = unitPrice * qty;

  const related = products.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight">
              Chitra<span className="text-primary">Frame</span>
            </span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to shop
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <nav className="mb-8 text-xs uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Shop
          </Link>{" "}
          / <span className="text-foreground">{product.category}</span> /{" "}
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-lg bg-cream shadow-xl">
              <img src={product.image} alt={product.title} className="aspect-[4/5] w-full object-cover" />
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-accent">{product.category}</div>
            <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">{product.title}</h1>
            <div className="mt-4 font-display text-3xl">₹{price.toLocaleString("en-IN")}</div>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              Inclusive of taxes · Free shipping above ₹899
            </p>

            <p className="mt-6 text-muted-foreground">{product.description}</p>

            <div className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Size</div>
                <div className="text-[11px] text-muted-foreground">Tap a size to see where it fits best</div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSize(s.id)}
                    className={`rounded-md border px-3 py-3 text-left text-sm transition ${
                      size === s.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="font-display text-base font-semibold">{s.code}</div>
                    <div className="text-[11px] text-muted-foreground">{s.dims}</div>
                    {s.delta > 0 && <div className="mt-1 text-[10px] text-accent">+₹{s.delta}</div>}
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-md border border-border/70 bg-cream/50 p-3">
                <div className="text-sm font-medium text-foreground">{sizeObj.useCase}</div>
                <div className="mt-1 text-xs text-muted-foreground">{sizeObj.scale}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Frame type</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {frameTypes.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrameType(f.id)}
                    className={`rounded-md border p-3 text-left text-sm transition ${
                      frameType === f.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-display text-base font-semibold">{f.label}</div>
                      {f.priceDelta > 0 && (
                        <div className="text-[10px] text-accent">+₹{f.priceDelta}</div>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {f.tagline}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{f.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Frame finish</div>
              <div className="flex flex-wrap gap-2">
                {frameFinishes.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFinish(f.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                      finish === f.id ? "border-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full border border-border" style={{ background: f.swatch }} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>


            <div className="mt-6 flex items-center gap-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Qty</div>
              <div className="flex items-center rounded-full border border-border">
                <button
                  className="px-3 py-1.5 text-lg"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease"
                >
                  −
                </button>
                <div className="w-8 text-center text-sm font-medium">{qty}</div>
                <button className="px-3 py-1.5 text-lg" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                  +
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90">
                Add to cart · ₹{price.toLocaleString("en-IN")}
              </button>
              <button className="flex-1 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:border-primary/40">
                Buy now
              </button>
            </div>

            <ul className="mt-8 space-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
              <li>· Giclée print on 240gsm archival matte paper</li>
              <li>· Solid wood frame, museum-grade acrylic front</li>
              <li>· Made-to-order in India · dispatched within 72 hours</li>
              <li>· 7-day easy replacement on damage</li>
            </ul>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24">
            <h2 className="mb-6 font-display text-2xl font-semibold">More in {product.category}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="group"
                >
                  <div className="overflow-hidden rounded-lg bg-cream">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-3 flex items-start justify-between">
                    <div className="font-display text-base font-semibold">{p.title}</div>
                    <div className="font-display text-sm">₹{p.price}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="mt-12 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ChitraFrame. Made with care in India.
        </div>
      </footer>
    </div>
  );
}
