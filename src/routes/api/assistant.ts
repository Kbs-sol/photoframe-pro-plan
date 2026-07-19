// On-site AI assistant. Server-only. Rotates through 3 free-tier providers.
// Never expose keys to the browser.
import { createFileRoute } from "@tanstack/react-router";

// Simple in-memory rate limit (per Worker instance). 20 msgs / IP / hour.
const RATE: Map<string, number[]> = new Map();
const WINDOW_MS = 60 * 60_000;
const MAX_PER_WINDOW = 20;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Provider = {
  name: string;
  envKey: string;
  call: (key: string, messages: ChatMessage[]) => Promise<string>;
};

const providers: Provider[] = [
  {
    name: "google",
    envKey: "GOOGLE_AI_STUDIO_KEY",
    call: async (key, messages) => {
      // Google AI Studio (Generative Language API) — Gemini 2.5 Flash Lite, free tier.
      const sys = messages.find((m) => m.role === "system")?.content ?? "";
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
            contents,
            generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
          }),
        },
      );
      if (!res.ok) throw new Error(`google ${res.status}`);
      const j = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) throw new Error("google empty");
      return text;
    },
  },
  {
    name: "openrouter",
    envKey: "OPENROUTER_KEY",
    call: async (key, messages) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://chitraframe.in",
          "X-Title": "ChitraFrame Assistant",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages,
          max_tokens: 512,
          temperature: 0.6,
        }),
      });
      if (!res.ok) throw new Error(`openrouter ${res.status}`);
      const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = j.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("openrouter empty");
      return text;
    },
  },
  {
    name: "grok-or-nvidia",
    envKey: "GROK_OR_NVIDIA_KEY",
    call: async (key, messages) => {
      // NVIDIA NIM OpenAI-compatible endpoint. Works with an xAI key if you swap the URL.
      const url = process.env.GROK_OR_NVIDIA_URL ?? "https://integrate.api.nvidia.com/v1/chat/completions";
      const model = process.env.GROK_OR_NVIDIA_MODEL ?? "meta/llama-3.1-8b-instruct";
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: 512, temperature: 0.6 }),
      });
      if (!res.ok) throw new Error(`grok/nvidia ${res.status}`);
      const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = j.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("grok/nvidia empty");
      return text;
    },
  },
];

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = (RATE.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (bucket.length >= MAX_PER_WINDOW) {
    RATE.set(ip, bucket);
    return false;
  }
  bucket.push(now);
  RATE.set(ip, bucket);
  return true;
}

// Fallback system prompt if the file cannot be read at runtime.
const FALLBACK_SYSTEM = `You are the ChitraFrame Assistant — a warm concierge for a Made-in-India framed wall art brand. Prices in ₹. Free shipping over ₹999. Ships in 72h. Do not invent policies. Do not offer discounts.`;

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const enabled = process.env.ASSISTANT_ENABLED === "true";
        if (!enabled) return new Response(JSON.stringify({ error: "assistant_disabled" }), { status: 503 });

        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
        if (!rateLimit(ip)) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 });

        let body: { messages?: ChatMessage[]; context?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
        }
        const userMessages = Array.isArray(body.messages) ? body.messages : [];
        if (!userMessages.length) return new Response(JSON.stringify({ error: "no_messages" }), { status: 400 });

        // Cap conversation length to avoid abuse.
        const trimmed = userMessages.slice(-12).map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(m.content ?? "").slice(0, 2000),
        }));

        const system = FALLBACK_SYSTEM + (body.context ? `\n\nPage context: ${String(body.context).slice(0, 500)}` : "");
        const full: ChatMessage[] = [{ role: "system", content: system }, ...trimmed];

        const tried: string[] = [];
        for (const p of providers) {
          const key = process.env[p.envKey];
          if (!key) {
            tried.push(`${p.name}:no-key`);
            continue;
          }
          try {
            const reply = await p.call(key, full);
            return Response.json({ reply, provider: p.name });
          } catch (e) {
            tried.push(`${p.name}:${e instanceof Error ? e.message : "err"}`);
          }
        }

        return new Response(
          JSON.stringify({
            error: "all_providers_failed",
            tried,
            fallback:
              "I'm having trouble right now — please WhatsApp us and we'll help you personally.",
          }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        );
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
        }),
    },
  },
});