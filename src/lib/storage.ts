import type { supabaseServer } from "./supabase/server";

export const MEDIA_BUCKET = "product-media";
type Client = Awaited<ReturnType<typeof supabaseServer>>;

/* Public URLs are <project>/storage/v1/object/public/<bucket>/<path>. Recovering the object
   path lets a delete reach the file a row points at, so nothing orphans in the free tier. */
export function storageObjectPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length));
}

/* Storage removal is best-effort: the database row is the source of truth, and failing the
   request after it is gone would leave the admin unable to retry. Orphans are logged. */
export async function removeStoredMedia(client: Client, urls: string[]) {
  const paths = urls.map(storageObjectPath).filter((path): path is string => Boolean(path));
  if (!paths.length) return;
  const { data, error } = await client.storage.from(MEDIA_BUCKET).remove(paths);
  /* remove() reports success with an empty list when a policy filters the object out, so the
     returned rows — not the absent error — are what prove the file is gone. */
  if (error) { console.error("[storage] could not remove objects", { paths, error: error.message }); return; }
  if ((data?.length ?? 0) < paths.length) console.error("[storage] some objects were not removed", { requested: paths, removed: data?.map((item) => item.name) ?? [] });
}
