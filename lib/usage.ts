import { list, put } from "@vercel/blob";

export type UsageEntry = {
  ts: number;
  route: "analyze-menu" | "recipe" | "dish-image";
  model: string;
  costUsd: number;
};

const enabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * One blob per event (not a shared append-only log) so concurrent requests —
 * the prefetch queue fires several recipe/image calls at once — never race
 * on a read-modify-write and silently drop a cost record.
 */
export async function logUsage(entry: UsageEntry): Promise<void> {
  if (!enabled()) return;
  try {
    const iso = new Date(entry.ts).toISOString().replace(/[:.]/g, "-");
    const rand = Math.random().toString(36).slice(2, 8);
    await put(`usage/${iso}-${entry.route}-${rand}.json`, JSON.stringify(entry), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("usage log write failed", error);
  }
}

export async function readAllUsage(): Promise<UsageEntry[]> {
  if (!enabled()) return [];
  const entries: UsageEntry[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "usage/", cursor, limit: 1000 });
    const fetched = await Promise.all(
      page.blobs.map(async (b) => {
        try {
          const res = await fetch(b.url);
          return (await res.json()) as UsageEntry;
        } catch {
          return null;
        }
      }),
    );
    for (const e of fetched) if (e) entries.push(e);
    cursor = page.cursor;
  } while (cursor);
  return entries;
}
