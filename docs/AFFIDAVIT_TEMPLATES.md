# Affidavit Template Development Guide

This guide explains how to create and modify affidavit templates in ServeMax.

## Table of Contents
1. [Template Location & Structure](#template-location--structure)
2. [Template Object Schema](#template-object-schema)
3. [Available Data Variables](#available-data-variables)
4. [Handlebars Helpers Reference](#handlebars-helpers-reference)
5. [Styling Guidelines](#styling-guidelines)
6. [Signature Integration](#signature-integration)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Template Location & Structure

### File Location
Templates are defined in: `src/utils/starterTemplates.js`

### How Templates Are Rendered
Templates use **Handlebars.js** for rendering, which provides:
- Variable substitution: `{{variable_name}}`
- Conditionals: `{{#if condition}}...{{/if}}`
- Loops: `{{#each array}}...{{/each}}`
- Nested properties: `{{object.property}}`

The template engine is in: `src/utils/templateEngine.js`

---

## Template Object Schema

```javascript
{
  standard: {
    name: 'Standard Affidavit',           // Display name in dropdown
    description: 'Description text...',   // Shown in template picker
    service_status: 'both',               // 'served', 'not_served', or 'both'
    is_active: true,                      // Whether template is available
    html: `<div>...</div>`                // The HTML template content
  }
}
```

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name shown to users |
| `description` | string | Brief description of template purpose |
| `service_status` | string | `'served'`, `'not_served'`, or `'both'` |
| `is_active` | boolean | Enable/disable the template |
| `html` | string | The full HTML template (use backticks for multi-line) |

---

## Available Data Variables

### Basic Info
| Variable | Description |
|----------|-------------|
| `{{document_title}}` | "AFFIDAVIT OF SERVICE" or "AFFIDAVIT OF NON-SERVICE" |
| `{{status}}` | `'served'` or `'not_served'` |
| `{{server_name}}` | Process server's full name |
| `{{server_license_number}}` | Server's license number |

### Court & Case Info
| Variable | Description |
|----------|-------------|
| `{{case_number}}` | Court case number |
| `{{court_name}}` | Short court name |
| `{{full_court_name}}` | Full formal court name |
| `{{court_county}}` | County of the court |
| `{{court_state}}` | State (default: 'CA') |
| `{{case_caption}}` | Full caption (Plaintiff v. Defendant) |
| `{{plaintiff}}` | Plaintiff name(s) |
| `{{defendant}}` | Defendant name(s) |

### Service Details
| Variable | Description |
|----------|-------------|
| `{{service_date}}` | ISO date of service |
| `{{service_time}}` | Time of service (h:mm a format) |
| `{{service_address}}` | Address where service occurred |
| `{{service_manner}}` | Type: `personal`, `substitute`, `sub_service`, etc. |
| `{{recipient_name}}` | Name of intended recipient |
| `{{recipient_address}}` | Primary address for service |

### Person Served Details
| Variable | Description |
|----------|-------------|
| `{{person_served_name}}` | Name of person actually served |
| `{{person_relationship}}` | Relationship to recipient |
| `{{person_sex}}` | Sex of person served |
| `{{person_age}}` | Approximate age |
| `{{person_height}}` | Height |
| `{{person_weight}}` | Weight |
| `{{person_hair}}` | Hair color |
| `{{person_description_other}}` | Additional description |

### Documents
| Variable | Description |
|----------|-------------|
| `{{documents_served}}` | Array of document objects with `.title` |
| `{{documents_served.length}}` | Number of documents |

### Company Info (Nested Object)
| Variable | Description |
|----------|-------------|
| `{{company_info.company_name}}` | Company name |
| `{{company_info.address1}}` | Street address |
| `{{company_info.address2}}` | Suite/Unit |
| `{{company_info.city}}` | City |
| `{{company_info.state}}` | State |
| `{{company_info.postal_code}}` | ZIP code |
| `{{company_info.phone}}` | Phone number |

### Signature Data (Nested Object)
| Variable | Description |
|----------|-------------|
| `{{placed_signature.signature_data}}` | Base64 PNG image data |
| `{{placed_signature.signed_date}}` | ISO date when signed |
| `{{placed_signature.signer_name}}` | Name of signer |

### Attempts Data
| Variable | Description |
|----------|-------------|
| `{{attempts}}` | Array of all service attempts |
| `{{successful_attempts}}` | Array of successful attempts |
| `{{successful_attempt}}` | The successful attempt object |

### Flags
| Variable | Description |
|----------|-------------|
| `{{include_notary}}` | Boolean - show notary block |
| `{{include_company_info}}` | Boolean - show company info |

---

## Handlebars Helpers Reference

### Date Formatting
```handlebars
{{formatDate service_date "MMMM d, yyyy"}}     → January 15, 2025
{{formatDate service_date "MM/dd/yyyy"}}       → 01/15/2025
{{formatDate service_date "M/d/yyyy h:mm a"}}  → 1/15/2025 2:30 PM
```

Common format tokens:
- `yyyy` - 4-digit year
- `MM` - 2-digit month
- `M` - 1-digit month
- `dd` - 2-digit day
- `d` - 1-digit day
- `h` - hour (12-hour)
- `mm` - minutes
- `a` - AM/PM

### Text Formatting
```handlebars
{{titleCase server_name}}      → "John Smith"
{{uppercase text}}             → "JOHN SMITH"
{{lowercase text}}             → "john smith"
{{capitalize text}}            → "John smith"
```

### Service Manner Formatting
```handlebars
{{formatServiceManner service_manner}}
// personal → "Personal"
// substitute → "Substitute"
// sub_service → "Sub-Service"
```

### Conditionals
```handlebars
{{#if condition}}
  Content when true
{{else}}
  Content when false
{{/if}}

{{#unless condition}}
  Content when false
{{/unless}}
```

### Comparisons (use inside {{#if}})
```handlebars
{{#if (eq status "served")}}...{{/if}}      <!-- equals -->
{{#if (ne status "served")}}...{{/if}}      <!-- not equals -->
{{#if (gt count 5)}}...{{/if}}              <!-- greater than -->
{{#if (lt count 5)}}...{{/if}}              <!-- less than -->
{{#if (gte count 5)}}...{{/if}}             <!-- greater or equal -->
{{#if (lte count 5)}}...{{/if}}             <!-- less or equal -->
{{#if (and a b)}}...{{/if}}                 <!-- logical AND -->
{{#if (or a b)}}...{{/if}}                  <!-- logical OR -->
```

### Loops
```handlebars
{{#each documents_served}}
  <div>{{this.title}}</div>
{{/each}}

<!-- With index -->
{{#each documents_served}}
  <div>{{@index}}. {{this.title}}</div>
  {{#unless @last}}, {{/unless}}    <!-- skip comma on last item -->
{{/each}}
```

### Default Values
```handlebars
{{default person_age "Unknown"}}
<!-- Shows "Unknown" if person_age is empty -->
```

### Party Name Truncation
```handlebars
{{truncateParties plaintiff 120}}
<!-- Truncates long party names and adds "et al." -->
```

### Person Description Builder
```handlebars
{{buildPersonDescription person_sex person_age person_height person_weight person_hair person_relationship person_description_other}}
<!-- Builds: "Male, 35 years old, 5'10", 180 lbs, Brown hair, Spouse" -->
```

### Math Operations
```handlebars
{{add a b}}        <!-- a + b -->
{{subtract a b}}   <!-- a - b -->
{{multiply a b}}   <!-- a * b -->
{{divide a b}}     <!-- a / b -->
```

### Currency & Phone Formatting
```handlebars
{{formatCurrency 1234.56}}    → $1,234.56
{{formatPhone "1234567890"}}  → (123) 456-7890
```

---

## Styling Guidelines

### Use Inline CSS Only
Templates must use inline styles because:
- PDF generation doesn't load external stylesheets
- Print rendering needs explicit styles
- Cross-browser compatibility

```html
<!-- ✅ CORRECT -->
<div style="font-size: 12pt; margin-bottom: 10pt;">Content</div>

<!-- ❌ WRONG -->
<div class="header">Content</div>
```

### Standard Document Dimensions
```css
width: 612pt;           /* US Letter width (8.5 inches) */
min-height: 792pt;      /* US Letter height (11 inches) */
padding: 72pt;          /* 1 inch margins */
font-family: Times New Roman, Times, serif;
font-size: 12pt;
line-height: 1.5;
```

### Container Template
```html
<div style="width: 612pt; padding: 24pt 36pt; font-family: Times New Roman, Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; background-color: #FFFFFF; box-sizing: border-box;">
  <!-- Your content here -->
</div>
```

### Page Break Control
```css
/* Keep element on same page */
page-break-inside: avoid;
break-inside: avoid;

/* Force page break before element */
page-break-before: always;

/* Force page break after element */
page-break-after: always;
```

Example:
```html
<div style="margin-top: 20pt; page-break-inside: avoid; break-inside: avoid;">
  <!-- Signature block - keeps together -->
</div>
```

---

## Signature Integration

### How It Works
1. User clicks "Sign Affidavit" button on the document
2. Signature is stored in `affidavitData.placed_signature`
3. Template conditionally renders the signature image

### Template Pattern for Signature
```html
<!-- Signature Line -->
<div style="border-bottom: 1pt solid #000000; width: 100%; margin-bottom: 4pt; height: 40pt; position: relative;">
  {{#if placed_signature.signature_data}}
    <img src="{{placed_signature.signature_data}}"
         alt="Signature"
         style="position: absolute; bottom: 2pt; left: 0; height: 36pt; max-width: 180pt; object-fit: contain;" />
  {{/if}}
</div>

<!-- Date with Label -->
<div style="display: flex; justify-content: space-between; margin-bottom: 8pt;">
  <div>{{titleCase server_name}}</div>
  <div>Date: {{#if placed_signature.signed_date}}{{formatDate placed_signature.signed_date "M/d/yyyy"}}{{else}}_____________{{/if}}</div>
</div>
```

### Key Points
- Always keep "Date:" label visible
- Show underline when not signed: `_____________`
- Use `position: relative` on container, `position: absolute` on signature image
- Set reasonable max-width to prevent overflow

---

## Common Patterns

### Conditional Service Status
```html
{{#if (eq status "served")}}
  <!-- Content for successful service -->
  <p>On {{formatDate service_date "MMMM d, yyyy"}}, I served...</p>
{{else}}
  <!-- Content for non-service -->
  <p>I was unable to complete service because...</p>
{{/if}}
```

### Conditional Service Manner
```html
{{#if (eq service_manner "substitute")}}
  <p>I left the documents with {{person_served_name}}, {{person_relationship}}</p>
{{/if}}

{{#if (eq service_manner "personal")}}
  <p>I personally served {{recipient_name}}</p>
{{/if}}

{{#if (or (eq service_manner "registered_agent") (eq service_manner "corporate_officer"))}}
  <p>I served {{company_being_served}} through {{person_served_name}}</p>
{{/if}}
```

### Document List
```html
<p><strong>Documents served:</strong>
  {{#if documents_served.length}}
    {{#each documents_served}}
      {{this.title}}{{#unless @last}}, {{/unless}}
    {{/each}}
  {{else}}
    [No documents listed]
  {{/if}}
</p>
```

### Notary Block (Optional)
```html
{{#if include_notary}}
  <div style="margin-top: 20pt;">
    <div style="border-bottom: 1pt solid #000; width: 200pt; height: 30pt;"></div>
    <div style="font-weight: bold;">Notary Public</div>
    <div style="display: flex; gap: 20pt;">
      <div>
        <div style="border-bottom: 1pt solid #000; width: 100pt; height: 15pt;"></div>
        <div style="font-size: 10pt;">Date</div>
      </div>
      <div>
        <div style="border-bottom: 1pt solid #000; width: 100pt; height: 15pt;"></div>
        <div style="font-size: 10pt;">Commission Expires</div>
      </div>
    </div>
  </div>
{{/if}}
```

### Company Info Block (Optional)
```html
{{#if company_info}}
  <div style="margin-top: 8pt; font-size: 11pt;">
    <div>{{company_info.company_name}}</div>
    <div>{{company_info.address1}}</div>
    {{#if company_info.address2}}<div>{{company_info.address2}}</div>{{/if}}
    <div>{{company_info.city}}, {{company_info.state}} {{company_info.postal_code}}</div>
  </div>
{{/if}}
```

### Attempts List (for Non-Service)
```html
{{#if (ne status "served")}}
  <p><strong>Service Attempts:</strong></p>
  {{#each attempts}}
    <p>Attempt {{add @index 1}}: {{formatDate this.attempt_date "M/d/yyyy h:mm a"}} at {{this.address_of_attempt}}
    {{#if this.notes}} - {{this.notes}}{{/if}}</p>
  {{/each}}
{{/if}}
```

---

## Troubleshooting

### Common Errors

**"Template Rendering Error" message**
- Check for unclosed `{{#if}}` or `{{#each}}` blocks
- Verify all curly braces are doubled: `{{` not `{`
- Check helper names are spelled correctly

**Variables showing as empty**
- Use `{{default variable "fallback"}}` to show placeholder
- Check if variable exists in affidavitData
- Use `{{json affidavitData}}` to debug available data

**Signature not appearing**
- Ensure `{{#if placed_signature.signature_data}}` check is present
- Verify image src uses `{{placed_signature.signature_data}}`
- Check container has `position: relative`

**Page breaks in wrong places**
- Add `page-break-inside: avoid` to keep blocks together
- Use `page-break-before: always` to force new page

**Styles not applying in PDF**
- Only inline styles work in PDF generation
- Avoid CSS classes - they won't render
- Check for typos in style property names

### Testing Templates

1. Create a test job with sample data
2. Navigate to Generate Affidavit page
3. Check browser console for rendering errors
4. Use `{{json affidavitData}}` temporarily to see available data
5. Test both "served" and "not_served" scenarios
6. Test with and without signature placed
7. Test Print/Save to verify PDF output

---

## Quick Reference Card

### Essential Helpers
```handlebars
{{formatDate date "format"}}           - Format dates
{{titleCase text}}                     - Title Case Text
{{default value "fallback"}}           - Fallback value
{{#if (eq a b)}}...{{/if}}            - Equality check
{{#if (or a b)}}...{{/if}}            - OR check
{{#each array}}{{this.prop}}{{/each}} - Loop array
{{truncateParties text 120}}          - Truncate names
```

### Essential Variables
```handlebars
{{status}}                  - 'served' or 'not_served'
{{server_name}}             - Server's name
{{recipient_name}}          - Recipient's name
{{service_date}}            - Date of service
{{service_manner}}          - Type of service
{{documents_served}}        - Array of documents
{{placed_signature}}        - Signature object
{{company_info}}            - Company info object
```

### Essential Styles
```css
width: 612pt;                      /* Page width */
font-family: Times New Roman;      /* Legal font */
font-size: 12pt;                   /* Standard size */
line-height: 1.5;                  /* Readable spacing */
page-break-inside: avoid;          /* Keep together */
```
