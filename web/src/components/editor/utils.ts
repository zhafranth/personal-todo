export function isEditorEmpty(html: string | undefined): boolean {
  if (!html) return true
  if (/<(hr|img)[^>]*\/?>/i.test(html)) return false
  const stripped = html.replace(/<[^>]*>/g, '').trim()
  return stripped.length === 0
}
