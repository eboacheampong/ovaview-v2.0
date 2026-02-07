/**
 * Utility functions for content formatting and display
 */

/**
 * Ensures proper HTML formatting for display
 * - Converts double line breaks to paragraph tags
 * - Preserves single line breaks as <br>
 * - Ensures empty paragraphs have proper spacing
 */
export function formatContentForDisplay(content: string | null | undefined): string {
  if (!content) return ''
  
  // If content already has HTML tags, just clean it up
  if (content.includes('<p>') || content.includes('<div>')) {
    return content
      // Ensure empty paragraphs have a non-breaking space for proper rendering
      .replace(/<p><\/p>/g, '<p>&nbsp;</p>')
      .replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>')
      // Ensure proper spacing between paragraphs
      .replace(/<\/p>\s*<p>/g, '</p><p>')
  }
  
  // For plain text content, convert to proper HTML
  return content
    // Convert double newlines to paragraph breaks
    .split(/\n\n+/)
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * Strips HTML tags for plain text display (e.g., for summaries)
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Truncates text to a specified length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...'
}