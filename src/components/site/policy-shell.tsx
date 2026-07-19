import type { ReactNode } from "react";

export function PolicyShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-20">
      <div className="mb-10 border-b border-border pb-6">
        <h1 className="font-display text-4xl font-semibold text-foreground md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
      </div>
      <article
        className="space-y-5 text-[15px] leading-relaxed text-foreground/90
          [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground
          [&_p]:text-muted-foreground [&_li]:text-muted-foreground
          [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/40 hover:[&_a]:decoration-primary
          [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
          [&_strong]:text-foreground"
      >
        {children}
      </article>
    </main>
  );
}