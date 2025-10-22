import { format } from 'date-fns';
import { replaceConstants } from './templateConstants';
import Handlebars from 'handlebars';

/**
 * Template Engine Utility
 *
 * Handles placeholder replacement and template rendering for affidavits
 * Supports both text-based templates and HTML templates
 * Includes Handlebars support for advanced looping and conditionals
 */

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(dateString, formatString = 'MM/dd/yyyy h:mm a') {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), formatString);
  } catch {
    return dateString;
  }
});

Handlebars.registerHelper('formatGPS', function(lat, lon, accuracy) {
  if (!lat || !lon) return '';
  const latFixed = parseFloat(lat).toFixed(6);
  const lonFixed = parseFloat(lon).toFixed(6);
  const acc = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
  return `${latFixed}, ${lonFixed}${acc}`;
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('ne', function(a, b) {
  return a !== b;
});

Handlebars.registerHelper('or', function(a, b) {
  return a || b;
});

Handlebars.registerHelper('and', function(a, b) {
  return a && b;
});

Handlebars.registerHelper('capitalize', function(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
});

Handlebars.registerHelper('uppercase', function(str) {
  if (!str) return '';
  return str.toUpperCase();
});

Handlebars.registerHelper('lowercase', function(str) {
  if (!str) return '';
  return str.toLowerCase();
});

// Advanced Formatting Helpers

/**
 * Format currency (USD)
 * Usage: {{formatCurrency amount}}
 * Example: {{formatCurrency 1234.56}} → "$1,234.56"
 */
Handlebars.registerHelper('formatCurrency', function(value) {
  if (!value && value !== 0) return '$0.00';
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
});

/**
 * Format phone number (US format)
 * Usage: {{formatPhone phone}}
 * Example: {{formatPhone "1234567890"}} → "(123) 456-7890"
 */
Handlebars.registerHelper('formatPhone', function(phone) {
  if (!phone) return '';
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  }
  return phone; // Return as-is if format not recognized
});

/**
 * Format address (multi-line with proper structure)
 * Usage: {{formatAddress address1 address2 city state zip}}
 * Example: {{formatAddress "123 Main St" "" "Boston" "MA" "02101"}}
 */
Handlebars.registerHelper('formatAddress', function(address1, address2, city, state, zip) {
  const parts = [];
  if (address1) parts.push(address1);
  if (address2) parts.push(address2);

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');
  if (cityStateZip) parts.push(cityStateZip);

  return parts.join('<br/>');
});

/**
 * Pluralize word based on count
 * Usage: {{pluralize count "attempt" "attempts"}}
 * Example: {{pluralize 1 "attempt" "attempts"}} → "1 attempt"
 * Example: {{pluralize 5 "attempt" "attempts"}} → "5 attempts"
 */
Handlebars.registerHelper('pluralize', function(count, singular, plural) {
  if (!count && count !== 0) return '';
  const num = parseInt(count);
  return `${num} ${num === 1 ? singular : plural}`;
});

/**
 * Check if array/string contains value
 * Usage: {{#if (ifContains array value)}}...{{/if}}
 * Example: {{#if (ifContains documents_served "Summons")}}...{{/if}}
 */
Handlebars.registerHelper('ifContains', function(haystack, needle) {
  if (!haystack) return false;
  if (Array.isArray(haystack)) {
    return haystack.some(item => {
      if (typeof item === 'object') {
        return Object.values(item).some(val =>
          String(val).toLowerCase().includes(String(needle).toLowerCase())
        );
      }
      return String(item).toLowerCase().includes(String(needle).toLowerCase());
    });
  }
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
});

/**
 * Get length of array or string
 * Usage: {{length array}}
 * Example: {{length attempts}} → "5"
 */
Handlebars.registerHelper('length', function(value) {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') return value.length;
  if (typeof value === 'object') return Object.keys(value).length;
  return 0;
});

/**
 * Math operations
 * Usage: {{add a b}}, {{subtract a b}}, {{multiply a b}}, {{divide a b}}
 */
Handlebars.registerHelper('add', function(a, b) {
  return parseFloat(a || 0) + parseFloat(b || 0);
});

Handlebars.registerHelper('subtract', function(a, b) {
  return parseFloat(a || 0) - parseFloat(b || 0);
});

Handlebars.registerHelper('multiply', function(a, b) {
  return parseFloat(a || 0) * parseFloat(b || 0);
});

Handlebars.registerHelper('divide', function(a, b) {
  const divisor = parseFloat(b || 1);
  if (divisor === 0) return 0;
  return parseFloat(a || 0) / divisor;
});

/**
 * Greater than / Less than comparisons
 * Usage: {{#if (gt a b)}}...{{/if}}
 */
Handlebars.registerHelper('gt', function(a, b) {
  return parseFloat(a || 0) > parseFloat(b || 0);
});

Handlebars.registerHelper('gte', function(a, b) {
  return parseFloat(a || 0) >= parseFloat(b || 0);
});

Handlebars.registerHelper('lt', function(a, b) {
  return parseFloat(a || 0) < parseFloat(b || 0);
});

Handlebars.registerHelper('lte', function(a, b) {
  return parseFloat(a || 0) <= parseFloat(b || 0);
});

/**
 * Default value helper
 * Usage: {{default value "fallback"}}
 * Example: {{default person_age "Unknown"}} → "Unknown" if age not set
 */
Handlebars.registerHelper('default', function(value, defaultValue) {
  return value || defaultValue || '';
});

/**
 * JSON stringify (for debugging or embedding data)
 * Usage: {{json object}}
 */
Handlebars.registerHelper('json', function(value) {
  return JSON.stringify(value, null, 2);
});

/**
 * Replace placeholders in a template string with actual data
 * @param {string} template - Template string with {{placeholder}} syntax
 * @param {object} data - Data object containing values for placeholders
 * @returns {string} - Template with placeholders replaced
 */
export const replacePlaceholders = (template, data) => {
  if (!template || typeof template !== 'string') return '';
  if (!data) return template;

  let result = template;

  // Define placeholder mappings
  const placeholders = {
    // Basic info
    '{{document_title}}': data.document_title || 'AFFIDAVIT OF SERVICE',
    '{{server_name}}': data.server_name || '',
    '{{server_license_number}}': data.server_license_number || '',

    // Court/Case info
    '{{case_number}}': data.case_number || '',
    '{{court_name}}': data.court_name || '',
    '{{court_county}}': data.court_county || '',
    '{{court_state}}': data.court_state || '',
    '{{case_caption}}': data.case_caption || '',
    '{{plaintiff}}': data.case_caption ? data.case_caption.split('v.')[0]?.trim() : '',
    '{{defendant}}': data.case_caption ? data.case_caption.split('v.')[1]?.trim() : '',

    // Service details
    '{{service_date}}': data.service_date ? formatServiceDate(data.service_date) : '',
    '{{service_date_short}}': data.service_date ? format(new Date(data.service_date + 'T00:00:00'), 'MM/dd/yyyy') : '',
    '{{service_time}}': data.service_time || '',
    '{{service_address}}': data.service_address || '',
    '{{service_manner}}': formatServiceManner(data.service_manner),
    '{{service_manner_raw}}': data.service_manner || '',

    // Recipient info
    '{{recipient_name}}': data.recipient_name || '',
    '{{person_served_name}}': data.person_served_name || '',
    '{{person_relationship}}': data.person_relationship || '',
    '{{person_sex}}': data.person_sex || '',
    '{{person_age}}': data.person_age || '',
    '{{person_height}}': data.person_height || '',
    '{{person_weight}}': data.person_weight || '',
    '{{person_hair}}': data.person_hair || '',
    '{{person_description}}': data.person_description_other || '',

    // Documents
    '{{documents_served}}': formatDocumentsList(data.documents_served),
    '{{documents_served_list}}': formatDocumentsList(data.documents_served, 'list'),
    '{{documents_served_count}}': data.documents_served?.length || 0,

    // Company info
    '{{company_name}}': data.company_info?.company_name || '',
    '{{company_address}}': formatCompanyAddress(data.company_info),
    '{{company_phone}}': data.company_info?.phone || '',

    // Current date/time for affidavit generation
    '{{current_date}}': format(new Date(), 'MMMM d, yyyy'),
    '{{current_date_short}}': format(new Date(), 'MM/dd/yyyy'),
    '{{current_year}}': new Date().getFullYear().toString(),

    // Attempts data
    '{{attempts}}': JSON.stringify(data.attempts || []), // Full array for custom processing
    '{{attempts_list}}': formatAttemptsList(data.attempts),
    '{{attempts_count}}': (data.attempts?.length || 0).toString(),
    '{{successful_attempts_count}}': (data.successful_attempts?.length || 0).toString(),

    // Successful attempt details (isolated from latest served attempt)
    '{{successful_attempt_date}}': data.successful_attempt?.attempt_date ? formatServiceDate(data.successful_attempt.attempt_date.split('T')[0]) : '',
    '{{successful_attempt_date_short}}': data.successful_attempt?.attempt_date ? format(new Date(data.successful_attempt.attempt_date), 'MM/dd/yyyy') : '',
    '{{successful_attempt_time}}': data.successful_attempt?.attempt_date ? format(new Date(data.successful_attempt.attempt_date), 'h:mm a') : '',
    '{{successful_attempt_address}}': data.successful_attempt?.address_of_attempt || '',
    '{{successful_attempt_notes}}': data.successful_attempt?.notes || '',
    '{{successful_attempt_service_type}}': data.successful_attempt?.service_type_detail || '',

    // Attempt GPS data
    '{{attempt_gps_lat}}': data.successful_attempt?.gps_lat?.toString() || '',
    '{{attempt_gps_lon}}': data.successful_attempt?.gps_lon?.toString() || '',
    '{{attempt_gps_accuracy}}': data.successful_attempt?.gps_accuracy?.toString() || '',
    '{{attempt_gps_coordinates}}': formatGPSCoordinates(data.successful_attempt),

    // Attempt metadata
    '{{attempt_notes}}': data.successful_attempt?.notes || data.attempts?.[0]?.notes || '',
  };

  // Replace all placeholders
  Object.keys(placeholders).forEach(placeholder => {
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, placeholders[placeholder]);
  });

  return result;
};

/**
 * Format service date in long format
 */
const formatServiceDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString + 'T00:00:00'), 'MMMM d, yyyy');
  } catch {
    return dateString;
  }
};

/**
 * Format service manner for display
 */
const formatServiceManner = (manner) => {
  if (!manner) return '';
  if (manner === 'other') return '';

  // Convert snake_case to Title Case
  return manner
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Format documents list
 */
const formatDocumentsList = (documents, format = 'default') => {
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return '';
  }

  if (format === 'list') {
    // Numbered list format
    return documents.map((doc, index) => `${index + 1}. ${doc.title || doc.affidavit_text || 'Untitled Document'}`).join('\n');
  }

  // Default: simple list separated by newlines
  return documents.map(doc => doc.title || doc.affidavit_text || 'Untitled Document').join('\n');
};

/**
 * Format company address
 */
const formatCompanyAddress = (companyInfo) => {
  if (!companyInfo) return '';

  const parts = [];
  if (companyInfo.address1) parts.push(companyInfo.address1);
  if (companyInfo.address2) parts.push(companyInfo.address2);

  const cityStateZip = [
    companyInfo.city,
    companyInfo.state,
    companyInfo.zip
  ].filter(Boolean).join(', ');

  if (cityStateZip) parts.push(cityStateZip);

  return parts.join('\n');
};

/**
 * Format attempts list for display
 */
const formatAttemptsList = (attempts) => {
  if (!attempts || !Array.isArray(attempts) || attempts.length === 0) {
    return 'No attempts recorded';
  }

  return attempts.map((attempt, index) => {
    const attemptDate = attempt.attempt_date ? format(new Date(attempt.attempt_date), 'MM/dd/yyyy h:mm a') : 'Unknown date';
    const status = attempt.status === 'served' ? 'Successfully Served' :
                   attempt.status === 'not_served' ? 'Not Served' :
                   attempt.status || 'Unknown';
    const address = attempt.address_of_attempt || 'No address';

    return `${index + 1}. ${attemptDate} - ${status} at ${address}`;
  }).join('\n');
};

/**
 * Format GPS coordinates for display
 */
const formatGPSCoordinates = (attempt) => {
  if (!attempt || !attempt.gps_lat || !attempt.gps_lon) return '';

  const lat = parseFloat(attempt.gps_lat).toFixed(6);
  const lon = parseFloat(attempt.gps_lon).toFixed(6);
  const accuracy = attempt.gps_accuracy ? ` (±${Math.round(attempt.gps_accuracy)}m)` : '';

  return `${lat}, ${lon}${accuracy}`;
};

/**
 * Parse template sections (for JSON-based templates)
 * @param {array} sections - Array of section objects
 * @param {object} data - Data for placeholder replacement
 * @returns {array} - Processed sections with placeholders replaced
 */
export const parseTemplateSections = (sections, data) => {
  if (!sections || !Array.isArray(sections)) return [];

  return sections.map(section => {
    // Deep clone the section to avoid mutations
    const processedSection = JSON.parse(JSON.stringify(section));

    // Process different section types
    switch (section.type) {
      case 'header':
      case 'paragraph':
        if (processedSection.content?.value) {
          processedSection.content.value = replacePlaceholders(processedSection.content.value, data);
        } else if (typeof processedSection.content === 'string') {
          processedSection.content = replacePlaceholders(processedSection.content, data);
        }
        break;

      case 'table':
        if (processedSection.rows) {
          processedSection.rows = processedSection.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell => ({
              ...cell,
              value: cell.value ? replacePlaceholders(cell.value, data) : '',
              placeholder: cell.placeholder ? replacePlaceholders(cell.placeholder, data) : ''
            }))
          }));
        }
        break;

      default:
        // For other section types, recursively process any string values
        return processStringValues(processedSection, data);
    }

    return processedSection;
  });
};

/**
 * Recursively process string values in an object
 */
const processStringValues = (obj, data) => {
  if (typeof obj === 'string') {
    return replacePlaceholders(obj, data);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processStringValues(item, data));
  }

  if (obj !== null && typeof obj === 'object') {
    const processed = {};
    Object.keys(obj).forEach(key => {
      processed[key] = processStringValues(obj[key], data);
    });
    return processed;
  }

  return obj;
};

/**
 * Get available placeholders list (for documentation/UI)
 */
export const getAvailablePlaceholders = () => {
  return [
    { placeholder: '{{document_title}}', description: 'Document title (e.g., AFFIDAVIT OF SERVICE)' },
    { placeholder: '{{server_name}}', description: 'Process server\'s name' },
    { placeholder: '{{server_license_number}}', description: 'Server\'s license number' },
    { placeholder: '{{case_number}}', description: 'Court case number' },
    { placeholder: '{{court_name}}', description: 'Name of the court' },
    { placeholder: '{{court_county}}', description: 'County of the court' },
    { placeholder: '{{court_state}}', description: 'State of the court' },
    { placeholder: '{{case_caption}}', description: 'Full case caption (Plaintiff v. Defendant)' },
    { placeholder: '{{plaintiff}}', description: 'Plaintiff name' },
    { placeholder: '{{defendant}}', description: 'Defendant name' },
    { placeholder: '{{service_date}}', description: 'Service date (long format: January 1, 2025)' },
    { placeholder: '{{service_date_short}}', description: 'Service date (short format: 01/01/2025)' },
    { placeholder: '{{service_time}}', description: 'Time of service' },
    { placeholder: '{{service_address}}', description: 'Address where service occurred' },
    { placeholder: '{{service_manner}}', description: 'Manner of service (formatted)' },
    { placeholder: '{{recipient_name}}', description: 'Name of intended recipient' },
    { placeholder: '{{person_served_name}}', description: 'Name of person actually served' },
    { placeholder: '{{person_relationship}}', description: 'Relationship to recipient' },
    { placeholder: '{{person_sex}}', description: 'Sex of person served' },
    { placeholder: '{{person_age}}', description: 'Age of person served' },
    { placeholder: '{{person_height}}', description: 'Height of person served' },
    { placeholder: '{{person_weight}}', description: 'Weight of person served' },
    { placeholder: '{{person_hair}}', description: 'Hair color of person served' },
    { placeholder: '{{person_description}}', description: 'Additional description of person served' },
    { placeholder: '{{documents_served}}', description: 'List of documents served' },
    { placeholder: '{{documents_served_list}}', description: 'Numbered list of documents served' },
    { placeholder: '{{documents_served_count}}', description: 'Count of documents served' },
    { placeholder: '{{company_name}}', description: 'Company name' },
    { placeholder: '{{company_address}}', description: 'Company address (formatted)' },
    { placeholder: '{{company_phone}}', description: 'Company phone number' },
    { placeholder: '{{current_date}}', description: 'Current date (long format)' },
    { placeholder: '{{current_date_short}}', description: 'Current date (short format)' },
    { placeholder: '{{current_year}}', description: 'Current year' },

    // Attempts data
    { placeholder: '{{attempts}}', description: 'JSON array of all attempts (for custom processing)' },
    { placeholder: '{{attempts_list}}', description: 'Formatted list of all attempts' },
    { placeholder: '{{attempts_count}}', description: 'Total number of attempts' },
    { placeholder: '{{successful_attempts_count}}', description: 'Number of successful attempts' },
    { placeholder: '{{successful_attempt_date}}', description: 'Successful attempt date (long format)' },
    { placeholder: '{{successful_attempt_date_short}}', description: 'Successful attempt date (short format)' },
    { placeholder: '{{successful_attempt_time}}', description: 'Successful attempt time' },
    { placeholder: '{{successful_attempt_address}}', description: 'Successful attempt address' },
    { placeholder: '{{successful_attempt_notes}}', description: 'Notes from successful attempt' },
    { placeholder: '{{successful_attempt_service_type}}', description: 'Service type from successful attempt' },
    { placeholder: '{{attempt_gps_lat}}', description: 'GPS latitude of attempt' },
    { placeholder: '{{attempt_gps_lon}}', description: 'GPS longitude of attempt' },
    { placeholder: '{{attempt_gps_accuracy}}', description: 'GPS accuracy in meters' },
    { placeholder: '{{attempt_gps_coordinates}}', description: 'Formatted GPS coordinates' },
    { placeholder: '{{attempt_notes}}', description: 'Notes from latest attempt' },

    // Handlebars Loop Examples (special documentation entries)
    { placeholder: '{{#each attempts}}...{{/each}}', description: 'Loop through all attempts (use {{this.field_name}})' },
    { placeholder: '{{#if condition}}...{{/if}}', description: 'Conditional rendering' },

    // Handlebars Helpers - Formatting
    { placeholder: '{{formatDate date "format"}}', description: 'Format date (helper function)' },
    { placeholder: '{{formatGPS lat lon accuracy}}', description: 'Format GPS coordinates (helper)' },
    { placeholder: '{{formatCurrency amount}}', description: 'Format currency: $1,234.56' },
    { placeholder: '{{formatPhone phone}}', description: 'Format phone: (123) 456-7890' },
    { placeholder: '{{formatAddress addr1 addr2 city state zip}}', description: 'Format address (multi-line)' },

    // Handlebars Helpers - Logic
    { placeholder: '{{eq a b}}', description: 'Compare equality (use in {{#if}})' },
    { placeholder: '{{ne a b}}', description: 'Compare not equal (use in {{#if}})' },
    { placeholder: '{{gt a b}}', description: 'Greater than comparison (use in {{#if}})' },
    { placeholder: '{{lt a b}}', description: 'Less than comparison (use in {{#if}})' },
    { placeholder: '{{and a b}}', description: 'Logical AND (use in {{#if}})' },
    { placeholder: '{{or a b}}', description: 'Logical OR (use in {{#if}})' },
    { placeholder: '{{ifContains array value}}', description: 'Check if array/string contains value' },

    // Handlebars Helpers - Utility
    { placeholder: '{{pluralize count "singular" "plural"}}', description: 'Pluralize: "1 attempt" or "5 attempts"' },
    { placeholder: '{{length array}}', description: 'Get length of array/string' },
    { placeholder: '{{default value "fallback"}}', description: 'Use fallback if value is empty' },
    { placeholder: '{{capitalize str}}', description: 'Capitalize first letter' },
    { placeholder: '{{uppercase str}}', description: 'Convert to UPPERCASE' },
    { placeholder: '{{lowercase str}}', description: 'Convert to lowercase' },

    // Handlebars Helpers - Math
    { placeholder: '{{add a b}}', description: 'Add two numbers' },
    { placeholder: '{{subtract a b}}', description: 'Subtract two numbers' },
    { placeholder: '{{multiply a b}}', description: 'Multiply two numbers' },
    { placeholder: '{{divide a b}}', description: 'Divide two numbers' },
  ];
};

/**
 * Check if template uses Handlebars syntax
 * @param {string} template - Template string
 * @returns {boolean} - True if Handlebars syntax detected
 */
const usesHandlebars = (template) => {
  if (!template) return false;
  // Check for Handlebars-specific syntax: {{#each}}, {{#if}}, {{#unless}}, etc.
  return /\{\{#(each|if|unless|with)/.test(template);
};

/**
 * Render HTML template with placeholders and constants replaced
 * @param {string} htmlTemplate - HTML template string
 * @param {object} data - Data for placeholder replacement
 * @returns {string} - Rendered HTML
 */
export const renderHTMLTemplate = (htmlTemplate, data) => {
  if (!htmlTemplate) return '';

  // Check if template uses Handlebars syntax for loops/conditionals
  if (usesHandlebars(htmlTemplate)) {
    return renderHTMLTemplateWithHandlebars(htmlTemplate, data);
  }

  // First replace constants
  let rendered = replaceConstants(htmlTemplate);

  // Then replace data placeholders
  rendered = replacePlaceholders(rendered, data);

  return rendered;
};

/**
 * Render HTML template using Handlebars (supports loops, conditionals)
 * @param {string} htmlTemplate - Handlebars template string
 * @param {object} data - Data for template
 * @returns {string} - Rendered HTML
 */
export const renderHTMLTemplateWithHandlebars = (htmlTemplate, data) => {
  if (!htmlTemplate) return '';

  try {
    // First replace constants (these are static values, not Handlebars syntax)
    let templateWithConstants = replaceConstants(htmlTemplate);

    // Compile Handlebars template
    const compiledTemplate = Handlebars.compile(templateWithConstants, {
      noEscape: true, // Don't escape HTML - we want raw HTML output
      strict: false   // Allow missing properties without errors
    });

    // Render with data
    const rendered = compiledTemplate(data);

    return rendered;
  } catch (error) {
    console.error('Handlebars rendering error:', error);
    return `<div style="color: red; padding: 20px; font-family: monospace;">
      <strong>Template Rendering Error:</strong><br/>
      ${error.message}<br/><br/>
      Please check your template syntax.
    </div>`;
  }
};

export default {
  replacePlaceholders,
  parseTemplateSections,
  getAvailablePlaceholders,
  renderHTMLTemplate,
  renderHTMLTemplateWithHandlebars,
  usesHandlebars
};
