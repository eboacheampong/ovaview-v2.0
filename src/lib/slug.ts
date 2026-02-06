/**
 * Generate a URL-friendly slug from a title
 * @param title - The title to convert to a slug
 * @returns A lowercase, hyphenated slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a random suffix if needed
 * @param title - The title to convert to a slug
 * @param existingCheck - Optional async function to check if slug exists
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  title: string,
  existingCheck?: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = generateSlug(title)
  
  if (!existingCheck) {
    // If no check function provided, append timestamp for uniqueness
    return `${baseSlug}-${Date.now().toString(36)}`
  }
  
  // Check if base slug exists
  const exists = await existingCheck(baseSlug)
  if (!exists) {
    return baseSlug
  }
  
  // If exists, append a random suffix
  const suffix = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${suffix}`
}
