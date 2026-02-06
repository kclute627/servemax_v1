/**
 * HTML Sanitization Utility
 * Uses DOMPurify to prevent XSS attacks when rendering HTML content
 */
import DOMPurify from 'dompurify';

/**
 * Configure DOMPurify with safe defaults for affidavit/document rendering
 * Allows common formatting tags but removes potentially dangerous content
 */
const SAFE_HTML_CONFIG = {
  // Allow common formatting and layout tags
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
    'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
    'img', 'a',
    'blockquote', 'pre', 'code',
    'style', // Allow style tags for CSS-based templates
  ],
  // Allow safe attributes
  ALLOWED_ATTR: [
    'style', 'class', 'id',
    'src', 'alt', 'width', 'height', // for images
    'href', 'target', 'rel', // for links
    'colspan', 'rowspan', 'align', 'valign', // for tables
    'data-*', // allow data attributes
  ],
  // Allow data URIs for embedded images (signatures)
  ALLOW_DATA_ATTR: true,
  // Keep safe URI schemes
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Don't strip style contents
  FORCE_BODY: true,
};

/**
 * Sanitize HTML content for safe rendering
 * @param {string} html - The HTML content to sanitize
 * @param {Object} options - Optional DOMPurify configuration overrides
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const config = { ...SAFE_HTML_CONFIG, ...options };
  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize HTML but preserve all styles (for template rendering)
 * More permissive for document templates that need full CSS support
 * @param {string} html - The HTML content to sanitize
 * @returns {string} - Sanitized HTML with styles preserved
 */
export function sanitizeTemplateHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // For templates, we want to preserve more formatting but still remove scripts
  return DOMPurify.sanitize(html, {
    ...SAFE_HTML_CONFIG,
    // Add additional tags that might be in templates
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style'],
    // Preserve whole document if needed
    WHOLE_DOCUMENT: false,
  });
}

/**
 * Create sanitized HTML object for React's dangerouslySetInnerHTML
 * @param {string} html - The HTML content to sanitize
 * @param {boolean} isTemplate - Whether this is template content (more permissive)
 * @returns {Object} - Object with __html property for dangerouslySetInnerHTML
 */
export function createSanitizedMarkup(html, isTemplate = false) {
  const sanitizedHTML = isTemplate ? sanitizeTemplateHTML(html) : sanitizeHTML(html);
  return { __html: sanitizedHTML };
}

/**
 * Hook DOMPurify to add additional security measures
 * Call this once during app initialization
 */
export function initializeSanitizer() {
  // Remove any event handlers that slip through
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Remove event handlers
    const eventAttrs = Array.from(node.attributes || [])
      .filter(attr => attr.name.startsWith('on'));
    eventAttrs.forEach(attr => node.removeAttribute(attr.name));

    // Ensure links open safely
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export default {
  sanitizeHTML,
  sanitizeTemplateHTML,
  createSanitizedMarkup,
  initializeSanitizer,
};
