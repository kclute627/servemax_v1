/**
 * Starter Template Library
 *
 * Pre-built HTML templates that users can start from
 */

export const STARTER_TEMPLATES = {
  blank: {
    name: 'Blank Canvas',
    description: 'Start from scratch with minimal structure',
    service_status: 'both',
    html: `<div style="width: {{CONST.PAPER_WIDTH}}; padding: {{CONST.PAGE_MARGIN}}; font-family: {{CONST.FONT_FAMILY}}; font-size: {{CONST.FONT_SIZE}}; line-height: {{CONST.LINE_HEIGHT}}; color: {{CONST.TEXT_COLOR}}; background-color: {{CONST.BG_COLOR}}; box-sizing: border-box;">
  <!-- Your template content here -->
  <h1 style="text-align: center; font-size: {{CONST.FONT_SIZE_TITLE}}; margin-bottom: {{CONST.SECTION_SPACING}};">
    {{document_title}}
  </h1>

  <p>Start building your affidavit template here...</p>
</div>`
  },

  standard: {
    name: 'Standard Affidavit',
    description: 'Basic affidavit with checkbox examples. Multi-page support: content flows automatically.',
    service_status: 'both',
    html: `<div style="width: {{CONST.PAPER_WIDTH}}; padding: {{CONST.PAGE_MARGIN}}; font-family: {{CONST.FONT_FAMILY}}; font-size: {{CONST.FONT_SIZE}}; line-height: {{CONST.LINE_HEIGHT}}; color: {{CONST.TEXT_COLOR}}; background-color: {{CONST.BG_COLOR}}; box-sizing: border-box;">

  <!-- Title -->
  <h1 style="text-align: center; font-size: {{CONST.FONT_SIZE_TITLE}}; font-weight: bold; margin-bottom: {{CONST.SECTION_SPACING}};">
    {{document_title}}
  </h1>

  <!-- Case Information Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: {{CONST.SECTION_SPACING}}; border: {{CONST.TABLE_BORDER}};">
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}}; font-size: {{CONST.FONT_SIZE_SMALL}};">
        CASE NUMBER
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}}; font-size: {{CONST.FONT_SIZE_SMALL}};">
        COURT
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        {{case_number}}
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        {{court_name}}<br/>{{court_county}}
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}}; font-size: {{CONST.FONT_SIZE_SMALL}};">
        PLAINTIFF / PETITIONER
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}}; font-size: {{CONST.FONT_SIZE_SMALL}};">
        DEFENDANT / RESPONDENT
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        {{plaintiff}}
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        {{defendant}}
      </td>
    </tr>
  </table>

  <!-- Declaration -->
  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}};">
    I, {{server_name}}, being duly sworn, depose and say that I am over the age of 18 years and not a party to this action. On {{service_date}} at approximately {{service_time}}, I served the following documents upon {{person_served_name}} at {{service_address}}.
  </p>

  <!-- Documents Served -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: {{CONST.SECTION_SPACING}}; border: {{CONST.TABLE_BORDER}};">
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}}; font-size: {{CONST.FONT_SIZE_SMALL}};">
        DOCUMENTS SERVED
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; white-space: pre-wrap;">{{documents_served}}</td>
    </tr>
  </table>

  <!-- Service Status (Checkbox with Conditional Content) -->
  <div style="margin-bottom: {{CONST.SECTION_SPACING}}; avoid-break;">
    <p style="font-weight: bold; margin-bottom: 8pt; font-size: {{CONST.FONT_SIZE}};">SERVICE STATUS:</p>
    <div style="display: flex; flex-direction: column; gap: 6pt;">
      <div style="display: flex; align-items: center; gap: 8pt;">
        <span style="font-size: {{CONST.CHECKBOX_SIZE}}; font-family: Arial, sans-serif;">{{#if (eq status "served")}}{{CONST.CHECKBOX_CHECKED}}{{else}}{{CONST.CHECKBOX_UNCHECKED}}{{/if}}</span>
        <span style="font-weight: {{#if (eq status "served")}}bold{{else}}normal{{/if}};">✓ Service Successfully Completed</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8pt;">
        <span style="font-size: {{CONST.CHECKBOX_SIZE}}; font-family: Arial, sans-serif;">{{#if (eq status "not_served")}}{{CONST.CHECKBOX_CHECKED}}{{else}}{{CONST.CHECKBOX_UNCHECKED}}{{/if}}</span>
        <span style="font-weight: {{#if (eq status "not_served")}}bold{{else}}normal{{/if}};">✓ Service Not Completed / Due Diligence</span>
      </div>
    </div>
  </div>

  <!-- Conditional Content Based on Service Status -->
  {{#if (eq status "served")}}
  <!-- SERVED SECTION -->
  <div style="margin-bottom: {{CONST.SECTION_SPACING}}; avoid-break;">
    <p style="font-weight: bold; margin-bottom: 8pt; font-size: {{CONST.FONT_SIZE}};">SERVICE METHOD:</p>
    <div style="display: flex; flex-direction: column; gap: 6pt;">
      <div style="display: flex; align-items: center; gap: 8pt;">
        <span style="font-size: {{CONST.CHECKBOX_SIZE}}; font-family: Arial, sans-serif;">{{CONST.CHECKBOX_UNCHECKED}}</span>
        <span>Personal Service - Served personally upon the individual named above</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8pt;">
        <span style="font-size: {{CONST.CHECKBOX_SIZE}}; font-family: Arial, sans-serif;">{{CONST.CHECKBOX_UNCHECKED}}</span>
        <span>Substitute Service - Left with a person of suitable age at the residence/business</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8pt;">
        <span style="font-size: {{CONST.CHECKBOX_SIZE}}; font-family: Arial, sans-serif;">{{CONST.CHECKBOX_UNCHECKED}}</span>
        <span>Corporate Agent - Served upon registered agent or authorized representative</span>
      </div>
    </div>
  </div>
  {{else}}
  <!-- NOT SERVED SECTION -->
  <div style="margin-bottom: {{CONST.SECTION_SPACING}}; avoid-break;">
    <p style="font-weight: bold; margin-bottom: 8pt; font-size: {{CONST.FONT_SIZE}};">ATTEMPTS SUMMARY:</p>
    <p style="margin-bottom: 8pt;">Total attempts made: {{attempts_count}}</p>
    <p style="margin-bottom: 8pt;">Addresses attempted: {{attempts_list}}</p>
  </div>
  {{/if}}

  <!-- Spacer -->
  <div style="margin-top: 100pt;"></div>

  <!-- Footer Declaration -->
  <p style="margin-bottom: 25pt;">
    I declare under penalty of perjury that the foregoing is true and correct.
  </p>

  <!-- Signature Line -->
  <div style="display: flex; justify-content: flex-end; gap: 60pt;">
    <div style="text-align: center;">
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; width: 180pt; height: 40pt;"></div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; margin-top: 4pt;">{{server_name}}</div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; color: #666;">Process Server</div>
    </div>
    <div style="text-align: center;">
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; width: 100pt; height: 40pt;"></div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; margin-top: 4pt;">Date</div>
    </div>
  </div>
</div>`
  },

  illinois: {
    name: 'Illinois Circuit Court',
    description: 'Illinois-specific affidavit format',
    service_status: 'both',
    html: `<div style="width: {{CONST.PAPER_WIDTH}}; padding: {{CONST.PAGE_MARGIN}}; font-family: {{CONST.FONT_FAMILY}}; font-size: {{CONST.FONT_SIZE}}; line-height: {{CONST.LINE_HEIGHT}}; color: {{CONST.TEXT_COLOR}}; background-color: {{CONST.BG_COLOR}}; box-sizing: border-box;">

  <!-- Title -->
  <h1 style="text-align: center; font-size: {{CONST.FONT_SIZE_TITLE}}; font-weight: bold; margin-bottom: {{CONST.SECTION_SPACING}}; text-transform: uppercase;">
    Affidavit of Service
  </h1>

  <p style="text-align: center; margin-bottom: {{CONST.SECTION_SPACING}}; font-size: {{CONST.FONT_SIZE_SMALL}};">
    State of Illinois, County of {{court_county}}
  </p>

  <!-- Case Info -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: {{CONST.SECTION_SPACING}}; border: {{CONST.TABLE_BORDER}};">
    <tr>
      <td colspan="2" style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; text-align: center; background-color: {{CONST.TABLE_HEADER_BG}};">
        IN THE CIRCUIT COURT OF {{court_county}}, ILLINOIS
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        <strong>Plaintiff:</strong> {{plaintiff}}
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        <strong>Case No:</strong> {{case_number}}
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        <strong>Defendant:</strong> {{defendant}}
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        <strong>Court:</strong> {{court_name}}
      </td>
    </tr>
  </table>

  <!-- Affidavit Body -->
  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}};">
    I, {{server_name}}, being first duly sworn on oath, depose and state as follows:
  </p>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    1. I am over the age of eighteen (18) years and am not a party to this action.
  </p>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    2. On {{service_date}} at approximately {{service_time}}, I personally served the following documents on {{person_served_name}} at {{service_address}} in {{court_county}} County, Illinois:
  </p>

  <div style="margin-left: 60pt; margin-bottom: {{CONST.PARAGRAPH_SPACING}}; white-space: pre-wrap;">{{documents_served}}</div>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    3. Service was made by delivering a true copy of said documents to the above-named individual.
  </p>

  <!-- Spacer -->
  <div style="margin-top: 100pt;"></div>

  <!-- Signature Section -->
  <p style="margin-bottom: 30pt;">
    <strong>FURTHER AFFIANT SAYETH NOT.</strong>
  </p>

  <div style="display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; margin-bottom: 8pt; height: 40pt;"></div>
      <div>{{server_name}}</div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; color: #666;">Process Server</div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; color: #666;">License No: {{server_license_number}}</div>
    </div>
  </div>

  <div style="margin-top: 30pt;">
    <p style="margin-bottom: 40pt;">
      Subscribed and sworn to before me this _____ day of ______________, {{current_year}}.
    </p>

    <div>
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; width: 250pt; margin-bottom: 8pt; height: 40pt;"></div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}};">Notary Public</div>
    </div>
  </div>
</div>`
  },

  california: {
    name: 'California Proof of Service',
    description: 'California-specific proof of service format',
    service_status: 'both',
    html: `<div style="width: {{CONST.PAPER_WIDTH}}; padding: {{CONST.PAGE_MARGIN}}; font-family: {{CONST.FONT_FAMILY}}; font-size: {{CONST.FONT_SIZE}}; line-height: {{CONST.LINE_HEIGHT}}; color: {{CONST.TEXT_COLOR}}; background-color: {{CONST.BG_COLOR}}; box-sizing: border-box;">

  <!-- Title -->
  <h1 style="text-align: center; font-size: {{CONST.FONT_SIZE_TITLE}}; font-weight: bold; margin-bottom: {{CONST.SECTION_SPACING}}; text-transform: uppercase;">
    Proof of Service
  </h1>

  <!-- Case Header -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: {{CONST.SECTION_SPACING}}; border: {{CONST.TABLE_BORDER}};">
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; width: 70%;">
        {{plaintiff}}<br/>
        <span style="margin-left: 60pt;">Plaintiff,</span><br/>
        vs.<br/>
        {{defendant}}<br/>
        <span style="margin-left: 60pt;">Defendant.</span>
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; vertical-align: top;">
        <strong>Case Number:</strong><br/>
        {{case_number}}<br/><br/>
        <strong>PROOF OF SERVICE</strong><br/>
        (Personal Service)
      </td>
    </tr>
  </table>

  <!-- Declaration -->
  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}};">
    I, {{server_name}}, declare:
  </p>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    1. At the time of service I was at least 18 years of age and not a party to this action.
  </p>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    2. On {{service_date}} at {{service_time}}, I served the following documents:
  </p>

  <div style="margin-left: 60pt; margin-bottom: {{CONST.PARAGRAPH_SPACING}}; white-space: pre-wrap;">{{documents_served}}</div>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    3. The person served was: {{person_served_name}}
  </p>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    4. Address where served: {{service_address}}
  </p>

  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}}; margin-left: 30pt;">
    5. Manner of service: By personally delivering copies to the person served.
  </p>

  <!-- Spacer -->
  <div style="margin-top: 100pt;"></div>

  <!-- Footer Declaration -->
  <p style="margin-bottom: 30pt;">
    I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.
  </p>

  <!-- Signature Section -->
  <div style="display: flex; justify-content: flex-end; gap: 60pt;">
    <div style="text-align: center;">
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; width: 180pt; height: 40pt;"></div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; margin-top: 4pt;">{{server_name}}</div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; color: #666;">Signature of Server</div>
    </div>
    <div style="text-align: center;">
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; width: 100pt; height: 40pt;"></div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; margin-top: 4pt;">{{current_date}}</div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; color: #666;">Date</div>
    </div>
  </div>
</div>`
  },

  due_diligence: {
    name: 'Due Diligence with Attempts Table',
    description: 'Shows all attempts in a table using Handlebars loops',
    service_status: 'not_served',
    html: `<div style="width: {{CONST.PAPER_WIDTH}}; padding: {{CONST.PAGE_MARGIN}}; font-family: {{CONST.FONT_FAMILY}}; font-size: {{CONST.FONT_SIZE}}; line-height: {{CONST.LINE_HEIGHT}}; color: {{CONST.TEXT_COLOR}}; background-color: {{CONST.BG_COLOR}}; box-sizing: border-box;">

  <!-- Title -->
  <h1 style="text-align: center; font-size: {{CONST.FONT_SIZE_TITLE}}; font-weight: bold; margin-bottom: {{CONST.SECTION_SPACING}}; text-transform: uppercase;">
    {{document_title}}
  </h1>

  <!-- Case Information -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: {{CONST.SECTION_SPACING}}; border: {{CONST.TABLE_BORDER}};">
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}};">
        CASE NUMBER
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        {{case_number}}
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}};">
        COURT
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        {{court_name}}, {{court_county}}
      </td>
    </tr>
    <tr>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; font-weight: bold; background-color: {{CONST.TABLE_HEADER_BG}};">
        CASE CAPTION
      </td>
      <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}};">
        {{case_caption}}
      </td>
    </tr>
  </table>

  <!-- Declaration -->
  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}};">
    I, {{server_name}}, being duly sworn, depose and state that I made the following attempts to serve {{recipient_name}}:
  </p>

  <!-- Attempts Table (Handlebars Loop) -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: {{CONST.SECTION_SPACING}}; border: {{CONST.TABLE_BORDER}};">
    <thead>
      <tr>
        <th style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; background-color: {{CONST.TABLE_HEADER_BG}}; font-weight: bold; text-align: left;">
          #
        </th>
        <th style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; background-color: {{CONST.TABLE_HEADER_BG}}; font-weight: bold; text-align: left;">
          Date & Time
        </th>
        <th style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; background-color: {{CONST.TABLE_HEADER_BG}}; font-weight: bold; text-align: left;">
          Address
        </th>
        <th style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; background-color: {{CONST.TABLE_HEADER_BG}}; font-weight: bold; text-align: left;">
          Result
        </th>
        <th style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; background-color: {{CONST.TABLE_HEADER_BG}}; font-weight: bold; text-align: left;">
          Notes
        </th>
      </tr>
    </thead>
    <tbody>
      {{#each attempts}}
      <tr>
        <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; vertical-align: top;">
          {{@index}}
        </td>
        <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; vertical-align: top;">
          {{formatDate this.attempt_date "MM/dd/yyyy"}}}<br/>
          <span style="font-size: {{CONST.FONT_SIZE_SMALL}}; color: #666;">{{formatDate this.attempt_date "h:mm a"}}</span>
        </td>
        <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; vertical-align: top; font-size: {{CONST.FONT_SIZE_SMALL}};">
          {{this.address_of_attempt}}
        </td>
        <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; vertical-align: top;">
          {{#if (eq this.status "served")}}
            <strong style="color: green;">✓ Served</strong>
          {{else}}
            <span style="color: #666;">Not Served</span>
          {{/if}}
        </td>
        <td style="padding: {{CONST.TABLE_CELL_PADDING}}; border: {{CONST.TABLE_BORDER}}; vertical-align: top; font-size: {{CONST.FONT_SIZE_SMALL}};">
          {{this.notes}}
        </td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <!-- Summary -->
  <p style="margin-bottom: {{CONST.PARAGRAPH_SPACING}};">
    <strong>Total Attempts:</strong> {{attempts_count}}<br/>
    <strong>Successful Serves:</strong> {{successful_attempts_count}}
  </p>

  <!-- Spacer -->
  <div style="margin-top: 100pt;"></div>

  <!-- Footer Declaration -->
  <p style="margin-bottom: 25pt;">
    I declare under penalty of perjury that the foregoing is true and correct.
  </p>

  <!-- Signature Line -->
  <div style="display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; margin-bottom: 8pt; height: 40pt;"></div>
      <div>{{server_name}}</div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}}; color: #666;">Process Server</div>
    </div>
    <div style="width: 30%;">
      <div style="border-bottom: 1pt solid {{CONST.BORDER_COLOR}}; margin-bottom: 8pt; height: 40pt;"></div>
      <div style="font-size: {{CONST.FONT_SIZE_SMALL}};">Date</div>
    </div>
  </div>
</div>`
  }
};

export const getStarterTemplatesList = () => {
  return Object.keys(STARTER_TEMPLATES).map(key => ({
    id: key,
    ...STARTER_TEMPLATES[key]
  }));
};

export const getStarterTemplate = (id) => {
  return STARTER_TEMPLATES[id] || STARTER_TEMPLATES.blank;
};
