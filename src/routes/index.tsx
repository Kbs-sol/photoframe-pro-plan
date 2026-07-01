import { createFileRoute } from "@tanstack/react-router";
import krishna from "@/assets/designs/krishna-flute-melody.jpg";
import ganesh from "@/assets/designs/shree-ganesh-golden-aura.jpg";
import shiva from "@/assets/designs/om-namah-shivaya-cosmic.jpg";
import football from "@/assets/designs/football-glory-moment.jpg";
import cricket from "@/assets/designs/cricket-stadium-lights.jpg";
import porsche from "@/assets/designs/porsche-911-sunset-drive.jpg";
import lambo from "@/assets/designs/midnight-lambo-neon.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChitraFrame — Museum-grade framed prints, made in India" },
      { name: "description", content: "Devotional, sports and automotive framed wall art. Made-to-order, ships in 72 hours across India. From ₹449." },
    ],
  }),
  component: Home,
});

type Product = {
  slug: string;
  title: string;
  category: "Devotional" | "Sports" | "Automotive";
  price: number;
  image: string;
};

const products: Product[] = [
  { slug: "krishna-flute-melody", title: "Krishna's Flute Melody", category: "Devotional", price: 749, image: krishna },
  { slug: "shree-ganesh-golden-aura", title: "Shree Ganesh — Golden Aura", category: "Devotional", price: 749, image: ganesh },
  { slug: "om-namah-shivaya-cosmic", title: "Om Namah Shivaya — Cosmic", category: "Devotional", price: 749, image: shiva },
  { slug: "cricket-stadium-lights", title: "Cricket — Stadium Lights", category: "Sports", price: 749, image: cricket },
  { slug: "football-glory-moment", title: "Football — Glory Moment", category: "Sports", price: 749, image: football },
  { slug: "porsche-911-sunset-drive", title: "Porsche 911 — Coastal Drive", category: "Automotive", price: 749, image: porsche },
  { slug: "midnight-lambo-neon", title: "Midnight Lambo — Neon Tokyo", category: "Automotive", price: 749, image: lambo },
];

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight">Chitra<span className="text-primary">Frame</span></span>
            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">Made in India</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/80 md:flex">
            <a href="#devotional" className="hover:text-primary">Devotional</a>
            <a href="#sports" className="hover:text-primary">Sports</a>
            <a href="#automotive" className="hover:text-primary">Automotive</a>
            <a href="#how" className="hover:text-primary">How it works</a>
          </nav>
          <a href="#shop" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
            Shop now
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 20% 10%, var(--color-gold) 0, transparent 40%), radial-gradient(circle at 90% 80%, var(--color-primary) 0, transparent 45%)",
        }} />
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Made-to-order · Ships in 72 hours
            </div>
            <h1 className="text-5xl leading-[1.05] font-semibold md:text-6xl">
              Wall art that <span className="italic text-primary">feels like home.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Museum-grade framed prints — devotional, sports, automotive.
              Hand-finished in India, delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#shop" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90">
                Browse the collection
              </a>
              <a href="#how" className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:border-primary/40">
                How it's made
              </a>
            </div>
            <div className="mt-10 flex items-center gap-8 text-xs uppercase tracking-widest text-muted-foreground">
              <div><div className="font-display text-2xl text-foreground">7</div>Signature designs</div>
              <div><div className="font-display text-2xl text-foreground">4</div>Sizes</div>
              <div><div className="font-display text-2xl text-foreground">₹449</div>Starting</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-accent/30 via-transparent to-primary/20 blur-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <img src={krishna} alt="Krishna's Flute Melody framed print" className="aspect-[4/5] w-full rounded-lg object-cover shadow-2xl" />
              <img src={porsche} alt="Porsche 911 Coastal Drive framed print" className="mt-10 aspect-[4/5] w-full rounded-lg object-cover shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories strip */}
      <section className="border-y border-border bg-cream/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-6 text-sm">
          {[
            ["Devotional", "Krishna · Ganesh · Shiva"],
            ["Sports", "Cricket · Football"],
            ["Automotive", "Porsche · Lambo"],
            ["Custom", "Send your photo"],
          ].map(([t, s]) => (
            <div key={t}>
              <div className="font-display text-base font-semibold">{t}</div>
              <div className="text-xs text-muted-foreground">{s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop */}
      <section id="shop" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-accent">The Collection</div>
            <h2 className="mt-2 text-4xl font-semibold md:text-5xl">Featured prints</h2>
          </div>
          <a href="#" className="hidden text-sm font-medium text-primary hover:underline md:inline">View all →</a>
        </div>

        {(["Devotional", "Sports", "Automotive"] as const).map((cat) => (
          <div key={cat} id={cat.toLowerCase()} className="mb-16 scroll-mt-24">
            <h3 className="mb-6 font-display text-2xl font-semibold">{cat}</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.filter(p => p.category === cat).map((p) => (
                <article key={p.slug} className="group">
                  <div className="relative overflow-hidden rounded-lg bg-cream">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] uppercase tracking-wider text-foreground shadow">
                      {p.category}
                    </div>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-display text-lg font-semibold leading-tight">{p.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">12×18" · Standard frame</p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-semibold">₹{p.price}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">from</div>
                    </div>
                  </div>
                  <button className="mt-4 w-full rounded-full border border-border bg-card py-2.5 text-sm font-medium transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    Add to cart
                  </button>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border bg-cream/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">The process</div>
          <h2 className="mt-2 text-4xl font-semibold md:text-5xl">From order to wall in 5 days.</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              ["01", "Choose", "Pick a design, size, and frame finish."],
              ["02", "Print", "Giclée print on 240gsm archival paper."],
              ["03", "Frame", "Hand-mounted in solid wood, glass-fronted."],
              ["04", "Deliver", "Free shipping across India above ₹899."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="font-display text-3xl text-accent">{n}</div>
                <div className="mt-2 font-display text-xl font-semibold">{t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl text-4xl font-semibold md:text-5xl">
          Fill your walls with <span className="italic text-primary">meaning.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Every ChitraFrame is made to order — no warehouses, no waste, just craft.
        </p>
        <a href="#shop" className="mt-8 inline-block rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90">
          Shop the collection
        </a>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} ChitraFrame. Made with care in India.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary">Shipping</a>
            <a href="#" className="hover:text-primary">Returns</a>
            <a href="#" className="hover:text-primary">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
