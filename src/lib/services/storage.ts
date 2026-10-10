/**
 * Image storage service.
 *
 * The ONLY place components may upload files: Supabase Storage access lives here
 * so `.svelte` islands never call Supabase directly (constitution §2.3, Data
 * Access). In demo mode (no backend configured) the image is inlined as a data
 * URL so the preview and catalog work offline with the local adapter.
 */
import { getSupabaseClient, isSupabaseConfigured } from "../data/supabase-client";
import { DataError } from "../types/domain";

/** Public Supabase Storage bucket shared by product and team images. */
const PRODUCT_BUCKET = "products";

export interface UploadImageOptions {
  /** Path namespace so the shared bucket stays tidy (e.g. "product-", "team-"). */
  prefix: string;
}

function fileExtension(file: File): string {
  if (file.name.includes(".")) {
    return file.name.split(".").pop()?.toLowerCase() || "png";
  }
  const fromType = file.type.split("/").pop();
  return fromType ? fromType.toLowerCase() : "png";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new DataError("No se pudo leer la imagen"));
    };
    reader.onerror = () => reject(new DataError("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image and returns its public URL.
 *
 * - Production: uploads to the public `products` bucket with a unique
 *   `<prefix><timestamp>-<uuid>.<ext>` name and returns `getPublicUrl()`.
 * - Demo: returns a data URL so the image persists in `localStorage`.
 */
export async function uploadImage(file: File, options: UploadImageOptions): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new DataError("El archivo debe ser una imagen");
  }

  if (!isSupabaseConfigured()) {
    return readFileAsDataUrl(file);
  }

  const client = getSupabaseClient();
  const path = `${options.prefix}${Date.now()}-${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error } = await client.storage.from(PRODUCT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new DataError(`No se pudo subir la imagen: ${error.message}`);

  const { data } = client.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new DataError("No se pudo obtener la URL de la imagen");
  return data.publicUrl;
}

/**
 * Uploads a product image and returns its public URL.
 * Thin wrapper over `uploadImage` so the product flow is unchanged.
 */
export async function uploadProductImage(file: File): Promise<string> {
  return uploadImage(file, { prefix: "product-" });
}
