import { list, put } from "@vercel/blob";

/**
 * Dish-keyed cache on Vercel Blob. "Tiramisù della Casa" and "Tiramisu della casa"
 * resolve to the same slug, so a dish seen on any menu reuses its stored recipe
 * and photo instead of new AI calls. No-ops gracefully when the blob token is absent.
 */

export function dishSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const enabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function findBlobUrl(pathname: string): Promise<string | null> {
  if (!enabled()) return null;
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    return blobs.find((b) => b.pathname === pathname)?.url ?? null;
  } catch (error) {
    console.error("blob lookup failed", pathname, error);
    return null;
  }
}

export async function getCachedRecipe(name: string): Promise<string | null> {
  const url = await findBlobUrl(`recipes/${dishSlug(name)}.md`);
  if (!url) return null;
  const res = await fetch(url);
  return res.ok ? res.text() : null;
}

export async function saveRecipe(name: string, markdown: string): Promise<void> {
  if (!enabled()) return;
  try {
    await put(`recipes/${dishSlug(name)}.md`, markdown, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/markdown",
    });
  } catch (error) {
    console.error("recipe cache write failed", name, error);
  }
}

/** Returns the public URL of the cached dish photo, if one exists. */
export async function getCachedImageUrl(name: string): Promise<string | null> {
  return findBlobUrl(`images/${dishSlug(name)}.png`);
}

export async function saveImage(name: string, png: Buffer): Promise<string | null> {
  if (!enabled()) return null;
  try {
    const blob = await put(`images/${dishSlug(name)}.png`, png, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/png",
    });
    return blob.url;
  } catch (error) {
    console.error("image cache write failed", name, error);
    return null;
  }
}
