/**
 * Template Constants
 *
 * Pre-defined constants that can be used in affidavit templates
 * These ensure consistency across all templates
 */

export const TEMPLATE_CONSTANTS = {
  // Page dimensions (US Letter size at 72 DPI)
  PAPER_WIDTH: '612pt',
  PAPER_HEIGHT: '792pt',

  // Standard margins (1 inch = 72pt)
  PAGE_MARGIN: '72pt',
  PAGE_MARGIN_TOP: '72pt',
  PAGE_MARGIN_RIGHT: '72pt',
  PAGE_MARGIN_BOTTOM: '72pt',
  PAGE_MARGIN_LEFT: '72pt',

  // Typography
  FONT_FAMILY: 'Times New Roman, Times, serif',
  FONT_FAMILY_ALT: 'Arial, Helvetica, sans-serif',
  FONT_SIZE: '12pt',
  FONT_SIZE_TITLE: '16pt',
  FONT_SIZE_HEADER: '14pt',
  FONT_SIZE_SMALL: '10pt',
  LINE_HEIGHT: '1.5',

  // Colors
  TEXT_COLOR: '#000000',
  BG_COLOR: '#FFFFFF',
  BORDER_COLOR: '#000000',
  TABLE_BORDER_COLOR: '#CBCBCB',
  TABLE_HEADER_BG: '#F8FAFC',

  // Spacing
  SECTION_SPACING: '20pt',
  PARAGRAPH_SPACING: '15pt',
  TABLE_CELL_PADDING: '8pt',

  // Borders
  BORDER_WIDTH: '1pt',
  TABLE_BORDER: '1pt solid #CBCBCB',

  // Checkbox symbols (Unicode)
  CHECKBOX_UNCHECKED: '☐',
  CHECKBOX_CHECKED: '☑',
  CHECKBOX_SIZE: '14pt',

  // Page Break Controls (for multi-page PDFs)
  PAGE_BREAK_BEFORE: 'page-break-before: always;',
  PAGE_BREAK_AFTER: 'page-break-after: always;',
  PAGE_BREAK_AVOID: 'page-break-inside: avoid;',

  // Web Fonts (Google Fonts CDN)
  FONT_ROBOTO: 'Roboto, sans-serif',
  FONT_OPEN_SANS: 'Open Sans, sans-serif',
  FONT_LATO: 'Lato, sans-serif',
  FONT_MONTSERRAT: 'Montserrat, sans-serif',

  // Header/Footer Template Variables (for Puppeteer PDF generation)
  // Note: These are used in template header_html and footer_html fields
  PAGE_NUMBER: '<span class="pageNumber"></span>',
  TOTAL_PAGES: '<span class="totalPages"></span>',
  CURRENT_DATE_GENERATED: '<span class="date"></span>',
  DOCUMENT_TITLE_VAR: '<span class="title"></span>',
  DOCUMENT_URL: '<span class="url"></span>',
};

/**
 * Replace constant references in template HTML
 * Converts {{CONST.PAPER_WIDTH}} to actual value
 */
export const replaceConstants = (html) => {
  if (!html) return html;

  let result = html;

  // Replace all constant references
  Object.keys(TEMPLATE_CONSTANTS).forEach(key => {
    const regex = new RegExp(`\\{\\{CONST\\.${key}\\}\\}`, 'g');
    result = result.replace(regex, TEMPLATE_CONSTANTS[key]);
  });

  return result;
};

/**
 * Get formatted constants for display/documentation
 */
export const getConstantsDocumentation = () => {
  return [
    {
      category: 'Page Dimensions',
      constants: [
        { name: 'CONST.PAPER_WIDTH', value: TEMPLATE_CONSTANTS.PAPER_WIDTH, description: 'Paper width (8.5 inches)' },
        { name: 'CONST.PAPER_HEIGHT', value: TEMPLATE_CONSTANTS.PAPER_HEIGHT, description: 'Paper height (11 inches)' },
        { name: 'CONST.PAGE_MARGIN', value: TEMPLATE_CONSTANTS.PAGE_MARGIN, description: 'Standard page margin (1 inch)' },
      ]
    },
    {
      category: 'Typography',
      constants: [
        { name: 'CONST.FONT_FAMILY', value: TEMPLATE_CONSTANTS.FONT_FAMILY, description: 'Primary font family' },
        { name: 'CONST.FONT_SIZE', value: TEMPLATE_CONSTANTS.FONT_SIZE, description: 'Base font size' },
        { name: 'CONST.FONT_SIZE_TITLE', value: TEMPLATE_CONSTANTS.FONT_SIZE_TITLE, description: 'Title font size' },
        { name: 'CONST.LINE_HEIGHT', value: TEMPLATE_CONSTANTS.LINE_HEIGHT, description: 'Line height multiplier' },
      ]
    },
    {
      category: 'Colors',
      constants: [
        { name: 'CONST.TEXT_COLOR', value: TEMPLATE_CONSTANTS.TEXT_COLOR, description: 'Text color (black)' },
        { name: 'CONST.BG_COLOR', value: TEMPLATE_CONSTANTS.BG_COLOR, description: 'Background color (white)' },
        { name: 'CONST.BORDER_COLOR', value: TEMPLATE_CONSTANTS.BORDER_COLOR, description: 'Border color' },
        { name: 'CONST.TABLE_HEADER_BG', value: TEMPLATE_CONSTANTS.TABLE_HEADER_BG, description: 'Table header background' },
      ]
    },
    {
      category: 'Spacing',
      constants: [
        { name: 'CONST.SECTION_SPACING', value: TEMPLATE_CONSTANTS.SECTION_SPACING, description: 'Space between sections' },
        { name: 'CONST.PARAGRAPH_SPACING', value: TEMPLATE_CONSTANTS.PARAGRAPH_SPACING, description: 'Space between paragraphs' },
        { name: 'CONST.TABLE_CELL_PADDING', value: TEMPLATE_CONSTANTS.TABLE_CELL_PADDING, description: 'Table cell padding' },
      ]
    },
    {
      category: 'Borders',
      constants: [
        { name: 'CONST.BORDER_WIDTH', value: TEMPLATE_CONSTANTS.BORDER_WIDTH, description: 'Standard border width' },
        { name: 'CONST.TABLE_BORDER', value: TEMPLATE_CONSTANTS.TABLE_BORDER, description: 'Table border style' },
      ]
    },
    {
      category: 'Checkboxes',
      constants: [
        { name: 'CONST.CHECKBOX_UNCHECKED', value: TEMPLATE_CONSTANTS.CHECKBOX_UNCHECKED, description: 'Unchecked checkbox symbol (☐)' },
        { name: 'CONST.CHECKBOX_CHECKED', value: TEMPLATE_CONSTANTS.CHECKBOX_CHECKED, description: 'Checked checkbox symbol (☑)' },
        { name: 'CONST.CHECKBOX_SIZE', value: TEMPLATE_CONSTANTS.CHECKBOX_SIZE, description: 'Checkbox font size' },
      ]
    },
    {
      category: 'Page Breaks (Multi-Page PDFs)',
      constants: [
        { name: 'CONST.PAGE_BREAK_BEFORE', value: TEMPLATE_CONSTANTS.PAGE_BREAK_BEFORE, description: 'Force new page before element' },
        { name: 'CONST.PAGE_BREAK_AFTER', value: TEMPLATE_CONSTANTS.PAGE_BREAK_AFTER, description: 'Force new page after element' },
        { name: 'CONST.PAGE_BREAK_AVOID', value: TEMPLATE_CONSTANTS.PAGE_BREAK_AVOID, description: 'Keep element on same page' },
      ]
    },
    {
      category: 'Web Fonts (Professional Typography)',
      constants: [
        { name: 'CONST.FONT_ROBOTO', value: TEMPLATE_CONSTANTS.FONT_ROBOTO, description: 'Google Roboto font' },
        { name: 'CONST.FONT_OPEN_SANS', value: TEMPLATE_CONSTANTS.FONT_OPEN_SANS, description: 'Google Open Sans font' },
        { name: 'CONST.FONT_LATO', value: TEMPLATE_CONSTANTS.FONT_LATO, description: 'Google Lato font' },
        { name: 'CONST.FONT_MONTSERRAT', value: TEMPLATE_CONSTANTS.FONT_MONTSERRAT, description: 'Google Montserrat font' },
      ]
    },
    {
      category: 'Header/Footer Variables (PDF Generation)',
      constants: [
        { name: 'CONST.PAGE_NUMBER', value: TEMPLATE_CONSTANTS.PAGE_NUMBER, description: 'Current page number' },
        { name: 'CONST.TOTAL_PAGES', value: TEMPLATE_CONSTANTS.TOTAL_PAGES, description: 'Total page count' },
        { name: 'CONST.CURRENT_DATE_GENERATED', value: TEMPLATE_CONSTANTS.CURRENT_DATE_GENERATED, description: 'PDF generation date' },
        { name: 'CONST.DOCUMENT_TITLE_VAR', value: TEMPLATE_CONSTANTS.DOCUMENT_TITLE_VAR, description: 'Document title' },
      ]
    }
  ];
};

export default TEMPLATE_CONSTANTS;
