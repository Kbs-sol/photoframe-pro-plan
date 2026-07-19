import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  getProductFn,
  upsertProductFn,
  deleteProductFn,
  upsertVariantFn,
  deleteVariantFn,
  getUploadSignatureFn,
  saveProductImageFn,
  deleteProductImageFn,
  type VariantRow,
  type ImageRow,
  type CategoryRow,
  type ProductRow,
} from "@/lib/admin-products.functions";
import { ArrowLeft, Trash2, Upload, X, Plus } from "lucide-react";

export const Route = createFileRoute("/_admin/admin_/products/$id")({
  head: () => ({
    meta: [{ title: "Edit product — ChitraFrame Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: ProductEditor,
});

// ─────────────────────────────────────────────────────────────────────────────
// Editor shell — new vs existing
// ─────────────────────────────────────────────────────────────────────────────
function ProductEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  const getFn = useServerFn(getProductFn);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !isNew,
    retry: false,
  });

  const catFn = useServerFn(getProductFn);
  // For "new", we still need categories → do a lightweight fetch via list.
  // Simpler: fetch categories from an existing product OR use empty list and
  // let the user pick after creating. We'll do the latter — categories are
  // shown once the product exists.
  void catFn;

  if (!isNew && isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-lg border border-border bg-muted/30" />
      </div>
    );
  }
  if (!isNew && error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load product"}
      </div>
    );
  }

  const product = isNew ? null : (data?.product ?? null);
  const categories = data?.categories ?? [];
  const images = data?.images ?? [];
  const variants = data?.variants ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {isNew ? "New product" : product?.name}
      </h1>

      <ProductForm
        product={product}
        categories={categories}
        onCreated={(newId) => navigate({ to: "/admin/products/$id", params: { id: newId } })}
        onUpdated={() => refetch()}
        onDeleted={() => navigate({ to: "/admin/products" })}
      />

      {product && (
        <>
          <ImagesSection productId={product.id} images={images} onChange={() => refetch()} />
          <VariantsSection productId={product.id} variants={variants} onChange={() => refetch()} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product form
// ─────────────────────────────────────────────────────────────────────────────
function ProductForm({
  product,
  categories,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  product: ProductRow | null;
  categories: CategoryRow[];
  onCreated: (id: string) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const upsert = useServerFn(upsertProductFn);
  const del = useServerFn(deleteProductFn);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? "");
  const [basePriceRupees, setBasePriceRupees] = useState<string>(
    product ? String(Math.round(product.base_price / 100)) : "",
  );
  const [isActive, setIsActive] = useState<boolean>(product?.is_active ?? true);
  const [isHidden, setIsHidden] = useState<boolean>(product?.is_hidden ?? false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await upsert({
        data: {
          id: product?.id,
          slug: slug.trim() || undefined,
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId || null,
          base_price: Math.round(Number(basePriceRupees || 0) * 100),
          is_active: isActive,
          is_hidden: isHidden,
        },
      });
      setMsg({ type: "ok", text: "Saved" });
      if (!product) onCreated(res.id);
      else onUpdated();
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await del({ data: { id: product.id } });
      onDeleted();
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Delete failed" });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-6 rounded-lg border border-border bg-card p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug (optional)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto from name"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</span>
          <textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Base price (₹)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={basePriceRupees}
            onChange={(e) => setBasePriceRupees(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 md:col-span-1">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className="text-sm">Active (buyable)</span>
        </label>
        <label className="flex items-center gap-2 md:col-span-1">
          <input type="checkbox" checked={isHidden} onChange={(e) => setIsHidden(e.target.checked)} />
          <span className="text-sm">Hidden from storefront</span>
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        {product && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md border border-destructive px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Delete product
          </button>
        )}
        {msg && (
          <span className={msg.type === "ok" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Images
// ─────────────────────────────────────────────────────────────────────────────
function ImagesSection({
  productId,
  images,
  onChange,
}: {
  productId: string;
  images: ImageRow[];
  onChange: () => void;
}) {
  const getSig = useServerFn(getUploadSignatureFn);
  const saveImg = useServerFn(saveProductImageFn);
  const delImg = useServerFn(deleteProductImageFn);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      const sig = await getSig({ data: undefined as never });
      let order = images.length;
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("api_key", sig.apiKey);
        form.set("timestamp", String(sig.timestamp));
        form.set("folder", sig.folder);
        form.set("upload_preset", sig.uploadPreset);
        form.set("signature", sig.signature);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Cloudinary rejected upload: ${txt.slice(0, 200)}`);
        }
        const json = (await res.json()) as { secure_url: string; public_id: string };
        await saveImg({
          data: {
            product_id: productId,
            image_url: json.secure_url,
            cloudinary_id: json.public_id,
            alt_text: null,
            display_order: order++,
          },
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    await delImg({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    onChange();
  }

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Images</h2>
          <p className="text-xs text-muted-foreground">First image is used as the product thumbnail.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload images"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files)}
          />
        </label>
      </div>
      {err && <p className="mb-3 text-sm text-destructive">{err}</p>}
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-md border border-border">
              <img src={img.image_url} alt={img.alt_text ?? ""} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive opacity-0 shadow transition-opacity group-hover:opacity-100"
                aria-label="Delete image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants
// ─────────────────────────────────────────────────────────────────────────────
function VariantsSection({
  productId,
  variants,
  onChange,
}: {
  productId: string;
  variants: VariantRow[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertVariantFn);
  const del = useServerFn(deleteVariantFn);
  const [rows, setRows] = useState<VariantRow[]>(variants);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setRows(variants);
  }, [variants]);

  function addBlank() {
    setRows((r) => [
      ...r,
      {
        id: `new-${Date.now()}`,
        product_id: productId,
        size: "",
        frame_type: "",
        price: 0,
        compare_at_price: null,
        sku: null,
        stock_count: 0,
        is_active: true,
      },
    ]);
  }

  async function saveRow(row: VariantRow) {
    setSavingId(row.id);
    try {
      const isNew = row.id.startsWith("new-");
      await upsert({
        data: {
          id: isNew ? undefined : row.id,
          product_id: productId,
          size: row.size,
          frame_type: row.frame_type,
          price: Number(row.price),
          compare_at_price: row.compare_at_price ?? null,
          sku: row.sku ?? null,
          stock_count: Number(row.stock_count),
          is_active: row.is_active,
        },
      });
      onChange();
    } finally {
      setSavingId(null);
    }
  }

  async function removeRow(row: VariantRow) {
    if (row.id.startsWith("new-")) {
      setRows((r) => r.filter((x) => x.id !== row.id));
      return;
    }
    if (!confirm("Delete this variant?")) return;
    await del({ data: { id: row.id } });
    onChange();
  }

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Variants</h2>
          <p className="text-xs text-muted-foreground">Prices are in paise (₹1 = 100). SKU is optional but unique.</p>
        </div>
        <button
          type="button"
          onClick={addBlank}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Add variant
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No variants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Size</th>
                <th className="px-2 py-2">Frame</th>
                <th className="px-2 py-2">Price (paise)</th>
                <th className="px-2 py-2">Compare-at</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Stock</th>
                <th className="px-2 py-2">Active</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-1">
                    <input
                      className="w-24 rounded border border-input bg-background px-2 py-1 text-sm"
                      value={row.size}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((r) => r.map((x, idx) => (idx === i ? { ...x, size: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="w-28 rounded border border-input bg-background px-2 py-1 text-sm"
                      value={row.frame_type}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((r) => r.map((x, idx) => (idx === i ? { ...x, frame_type: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-28 rounded border border-input bg-background px-2 py-1 text-sm"
                      value={row.price}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRows((r) => r.map((x, idx) => (idx === i ? { ...x, price: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-28 rounded border border-input bg-background px-2 py-1 text-sm"
                      value={row.compare_at_price ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setRows((r) => r.map((x, idx) => (idx === i ? { ...x, compare_at_price: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="w-32 rounded border border-input bg-background px-2 py-1 text-sm"
                      value={row.sku ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setRows((r) => r.map((x, idx) => (idx === i ? { ...x, sku: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
                      value={row.stock_count}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRows((r) => r.map((x, idx) => (idx === i ? { ...x, stock_count: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setRows((r) => r.map((x, idx) => (idx === i ? { ...x, is_active: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        disabled={savingId === row.id}
                        className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {savingId === row.id ? "…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row)}
                        className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        aria-label="Remove variant"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}