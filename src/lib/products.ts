import krishna from "@/assets/designs/krishna-flute-melody.jpg";
import ganesh from "@/assets/designs/shree-ganesh-golden-aura.jpg";
import shiva from "@/assets/designs/om-namah-shivaya-cosmic.jpg";
import football from "@/assets/designs/football-glory-moment.jpg";
import cricket from "@/assets/designs/cricket-stadium-lights.jpg";
import porsche from "@/assets/designs/porsche-911-sunset-drive.jpg";
import lambo from "@/assets/designs/midnight-lambo-neon.jpg";

export type Category = "Devotional" | "Sports" | "Automotive";

export type Product = {
  slug: string;
  title: string;
  category: Category;
  price: number;
  image: string;
  description: string;
};

export const products: Product[] = [
  {
    slug: "krishna-flute-melody",
    title: "Krishna's Flute Melody",
    category: "Devotional",
    price: 749,
    image: krishna,
    description:
      "A serene rendering of Lord Krishna playing the bansuri under a moonlit sky — hand-finished with subtle gold accents.",
  },
  {
    slug: "shree-ganesh-golden-aura",
    title: "Shree Ganesh — Golden Aura",
    category: "Devotional",
    price: 749,
    image: ganesh,
    description:
      "Lord Ganesha bathed in a warm golden aura — a blessing of prosperity for your home or workspace.",
  },
  {
    slug: "om-namah-shivaya-cosmic",
    title: "Om Namah Shivaya — Cosmic",
    category: "Devotional",
    price: 749,
    image: shiva,
    description:
      "Lord Shiva in cosmic meditation — inky blues and celestial highlights for a deeply contemplative wall piece.",
  },
  {
    slug: "cricket-stadium-lights",
    title: "Cricket — Stadium Lights",
    category: "Sports",
    price: 749,
    image: cricket,
    description:
      "Floodlights, roaring crowds and the electric hum of a night match — nostalgia for every cricket fan.",
  },
  {
    slug: "football-glory-moment",
    title: "Football — Glory Moment",
    category: "Sports",
    price: 749,
    image: football,
    description:
      "The freeze-frame of a match-winning strike — dynamic composition perfect for a den or games room.",
  },
  {
    slug: "porsche-911-sunset-drive",
    title: "Porsche 911 — Coastal Drive",
    category: "Automotive",
    price: 749,
    image: porsche,
    description:
      "The 911 silhouette carving a coastal road at golden hour — timeless design meets timeless machine.",
  },
  {
    slug: "midnight-lambo-neon",
    title: "Midnight Lambo — Neon Tokyo",
    category: "Automotive",
    price: 749,
    image: lambo,
    description:
      "A neon-drenched Lamborghini prowling Tokyo backstreets — high-contrast art for the bold collector.",
  },
];

export const sizes = [
  { id: "a4", label: 'A4 · 8×12"', delta: 0 },
  { id: "a3", label: 'A3 · 12×18"', delta: 400 },
  { id: "a2", label: 'A2 · 18×24"', delta: 900 },
  { id: "a1", label: 'A1 · 24×36"', delta: 1600 },
];

export const frames = [
  { id: "black", label: "Matte Black", swatch: "#111111" },
  { id: "walnut", label: "Walnut Wood", swatch: "#6b4226" },
  { id: "oak", label: "Natural Oak", swatch: "#c9a97a" },
  { id: "gold", label: "Antique Gold", swatch: "#b8892b" },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}
