/**
 * src/utils/localizedName.js
 *
 * Resolves the display name for a user/worker or booking name snapshot.
 *
 * Since Tamil name storage was removed, this always returns the English name.
 * The `name` field from the API is always the English name (name_en || name).
 * The `nameEn` field is an explicit English name.
 *
 * Fallback chain: nameEn → name (which is already English from API) → ""
 *
 * The `lang` parameter is kept for API compatibility but no longer switches
 * between languages since Tamil names are no longer stored.
 */

/**
 * @param {{ name?: string, nameEn?: string }|null|undefined} entity
 * @param {string|null|undefined} lang - kept for compatibility, unused
 * @returns {string}
 */
export function getLocalizedName(entity, lang) {
  if (!entity || typeof entity !== "object") return "";
  const nameEn = typeof entity.nameEn === "string" ? entity.nameEn.trim() : "";
  const legacy = typeof entity.name   === "string" ? entity.name.trim()   : "";
  return nameEn || legacy || "";
}

export default getLocalizedName;
