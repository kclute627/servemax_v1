/**
 * Starter Template Library
 *
 * Pre-built HTML templates that users can start from
 */

export const STARTER_TEMPLATES = {
  css_test: {
    name: 'CSS Test - Table Layout',
    description: 'Test template using table-based layout for consistent PDF rendering. Uses CSS classes like the competitor.',
    service_status: 'both',
    is_active: true,
    html: `<style>
  .sm_doc {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.4;
    color: #000;
  }
  .page {
    width: 612pt;
    min-height: 792pt;
    padding: 36pt;
    background: #fff;
    box-sizing: border-box;
  }
  .table_border {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
  }
  .table_border td, .table_border th {
    border: 1pt solid #000;
    padding: 6pt 8pt;
    vertical-align: top;
  }
  .table_padding {
    width: 100%;
    border-collapse: collapse;
  }
  .table_padding td {
    padding: 2pt 4pt;
    vertical-align: top;
  }
  .cell_collapse {
    width: 1%;
    white-space: nowrap;
  }
  .cell_underline {
    border-bottom: 1pt solid #000 !important;
  }
  .break_small {
    margin-bottom: 12pt;
  }
  .break_medium {
    margin-bottom: 18pt;
  }
  .text_center {
    text-align: center;
  }
  .text_justify {
    text-align: justify;
  }
  .font_small {
    font-size: 10pt;
  }
  .font_large {
    font-size: 14pt;
  }
  .align_bottom {
    vertical-align: bottom !important;
  }
  .bold {
    font-weight: bold;
  }
  .signature_cell {
    height: 50pt;
    vertical-align: bottom;
    position: relative;
  }
  .signature_img {
    height: 45pt;
    max-width: 250pt;
    object-fit: contain;
    display: block;
    position: absolute;
    bottom: -10pt;
    left: 0;
  }
</style>

<div class="sm_doc">
  <div class="page">

    <!-- Title -->
    <div class="text_center break_medium">
      <h3 class="bold">
        {{#if (eq status "served")}}
          AFFIDAVIT OF SERVICE
        {{else}}
          AFFIDAVIT OF DUE DILIGENCE
        {{/if}}
      </h3>
    </div>

    <!-- Court Info Table -->
    <table class="table_border break_small">
      <tr>
        <td colspan="3" class="text_center bold">{{full_court_name}}</td>
      </tr>
      <tr>
        <td><strong>Case No:</strong><br>{{case_number}}</td>
        <td><strong>Plaintiff:</strong><br>{{truncateParties plaintiff 80}}</td>
        <td><strong>Defendant:</strong><br>{{truncateParties defendant 80}}</td>
      </tr>
    </table>

    <!-- Declaration Opening -->
    <p class="text_justify break_small">
      I, <strong>{{titleCase server_name}}</strong>, being duly sworn, depose and say: I am over the age of 18 years and not a party to this action{{#if (eq status "served")}}, and that within the boundaries of the state where service was effected, I was authorized by applicable law to make service of the documents and informed said person of the contents herein{{else}}, and that I was authorized by applicable law to attempt service of the documents{{/if}}.
    </p>

    <!-- Service Details Table -->
    <table class="table_padding break_small">
      <tr>
        <td class="cell_collapse bold">Documents Received:</td>
        <td>{{default (formatDate job_created_date "MMMM d, yyyy 'at' h:mm a") "[Date documents received]"}}</td>
      </tr>
      <tr>
        <td class="cell_collapse bold">Directed To:</td>
        <td>{{#if (or (eq service_manner "registered_agent") (eq service_manner "authorized_representative") (eq service_manner "corporate_officer") (eq service_manner "business"))}}{{default company_being_served "[Company name]"}}{{else}}{{default recipient_name "[Recipient name]"}}{{/if}}</td>
      </tr>
      <tr>
        <td class="cell_collapse bold">At Address:</td>
        <td>{{default recipient_address "[Service address]"}}</td>
      </tr>
      <tr>
        <td class="cell_collapse bold">Documents Served:</td>
        <td>{{#if documents_served.length}}{{#each documents_served}}{{this.title}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}[No documents marked for service]{{/if}}</td>
      </tr>
      <tr>
        <td class="cell_collapse bold">Type of Service:</td>
        <td>{{#if (eq status "served")}}{{#if (eq service_manner "substitute")}}Served - Sub-service{{else}}Served - {{formatServiceManner service_manner}}{{/if}}{{else}}Non Service{{/if}}</td>
      </tr>
    </table>

    {{#if (eq status "served")}}
    <!-- Service Completion Details -->
    <table class="table_padding break_small">
      <tr>
        <td class="cell_collapse bold">Date/Time of Service:</td>
        <td>{{formatDate service_date "MMMM d, yyyy"}} at {{service_time}}</td>
      </tr>
      <tr>
        <td class="cell_collapse bold">Person Served / Address:</td>
        <td>
          {{#if (eq service_manner "personal")}}
            {{titleCase person_served_name}} at {{service_address}}
          {{else if (or (eq service_manner "registered_agent") (eq service_manner "authorized_representative") (eq service_manner "corporate_officer") (eq service_manner "business"))}}
            {{titleCase person_served_name}}, {{person_title}}, who is authorized to accept legal documents on behalf of {{company_being_served}} at {{service_address}}
          {{else if (eq service_manner "substitute")}}
            {{titleCase person_served_name}} ({{person_relationship}}) who lives at the address and confirmed residency of {{titleCase recipient_name}} - to comply with sub-service statute(s) I also mailed the documents via USPS on {{formatDate mailing_date "MMMM d, yyyy"}} to {{titleCase recipient_name}} at {{service_address}}.
          {{else}}
            {{titleCase person_served_name}} ({{person_relationship}}) at {{service_address}}
          {{/if}}
        </td>
      </tr>
      {{#if (buildPersonDescription person_sex person_age person_height person_weight person_hair person_relationship person_description_other)}}
      <tr>
        <td class="cell_collapse bold">Description:</td>
        <td>{{buildPersonDescription person_sex person_age person_height person_weight person_hair person_relationship person_description_other}}</td>
      </tr>
      {{/if}}
      {{#if attempt_gps_lat}}
      <tr>
        <td class="cell_collapse bold">GPS Coordinates:</td>
        <td>{{formatGPS attempt_gps_lat attempt_gps_lon attempt_gps_accuracy}}</td>
      </tr>
      {{/if}}
    </table>
    {{/if}}

    {{#if (ne status "served")}}
    <!-- Non-Service Section -->
    <div class="text_center break_small">
      <p class="bold font_large">SERVICE WAS NOT EFFECTED</p>
    </div>

    <p class="text_justify break_small">
      After making diligent attempts, I was unable to serve <strong>{{default recipient_name "[Person being served]"}}</strong> at <strong>{{default recipient_address "[Address]"}}</strong>.
    </p>

    <!-- Service Attempts Table -->
    <table class="table_border break_small">
      <tr style="background-color: #f0f0f0;">
        <th>Date and Time</th>
        <th>Address Attempted</th>
        <th>Comments</th>
      </tr>
      {{#each service_attempts}}
      <tr>
        <td>{{this.date_time}}</td>
        <td>{{this.address}}</td>
        <td>{{this.comments}}</td>
      </tr>
      {{/each}}
    </table>
    {{/if}}

    <!-- Declaration -->
    <p class="text_justify break_medium">
      I declare under penalty of perjury that the foregoing is true and correct.
    </p>

    <!-- Signature Section - TABLE BASED (no absolute positioning) -->
    <table class="table_padding" style="width: 60%; margin-left: auto;">
      <tr>
        <td class="cell_underline align_bottom signature_cell" style="width: 65%;">
          {{#if placed_signature.signature_data}}
            <img src="{{placed_signature.signature_data}}" class="signature_img" alt="Signature" />
          {{/if}}
        </td>
        <td style="width: 5%;"></td>
        <td class="cell_underline align_bottom signature_cell" style="width: 30%;">
          {{#if placed_signature.signed_date}}
            {{formatDate placed_signature.signed_date "M/d/yyyy"}}
          {{/if}}
        </td>
      </tr>
      <tr>
        <td>
          {{titleCase server_name}}{{#if server_license_number}}<br>License #{{server_license_number}}{{/if}}
        </td>
        <td></td>
        <td><strong>Date</strong></td>
      </tr>
      {{#if company_info}}
      <tr>
        <td colspan="3" style="padding-top: 12pt;">
          {{company_info.company_name}}<br>
          <span class="font_small">{{company_info.address1}}<br>{{company_info.city}}, {{company_info.state}} {{company_info.postal_code}}</span>
        </td>
      </tr>
      {{/if}}
    </table>

  </div>
</div>`
  },

  css_test_ao440: {
    name: 'CSS Test - AO 440 Federal (Table Layout)',
    description: 'Test template for AO 440 Federal Proof of Service using table-based layout for consistent PDF rendering.',
    service_status: 'both',
    is_active: true,
    html: `<style>
  .sm_doc {
    font-family: "Times New Roman", Times, serif;
    font-size: 10pt;
    line-height: 1.2;
    color: #000;
  }
  .page {
    width: 612pt;
    min-height: 792pt;
    padding: 36pt;
    background: #fff;
    box-sizing: border-box;
  }
  .table_padding {
    width: 100%;
    border-collapse: collapse;
  }
  .table_padding td {
    padding: 0.15em 0.8em 0.15em 0;
    vertical-align: top;
  }
  .table_padding td:last-child {
    padding-right: 0;
  }
  .cell_collapse {
    width: 1%;
    white-space: nowrap;
  }
  .cell_underline {
    border-bottom: 1px solid #333;
  }
  .text_center {
    text-align: center;
  }
  .font_small {
    font-size: 80%;
  }
  .break_small {
    margin-bottom: 0.8em;
  }
  .break_large {
    margin-bottom: 1.5em;
  }
  p {
    margin: 0.3em 0;
  }
  .align_bottom {
    vertical-align: bottom !important;
  }
  .check_box {
    box-sizing: border-box;
    position: relative;
    display: inline-block;
    width: calc(1.9em + 1px);
    height: calc(1.1em + 1px);
    border: 1px solid #333;
    text-align: center;
    font-family: sans-serif;
    font-weight: bold;
  }
  .data {
    display: block;
    min-height: 1.45em;
  }
  .data_inline {
    display: inline;
    min-width: 10em;
  }
  .digital_signature_container {
    overflow: visible;
    font-family: sans-serif !important;
    height: 50px;
    position: relative;
  }
  .signature_img {
    height: 45pt;
    max-width: 250pt;
    object-fit: contain;
    display: block;
    position: absolute;
    bottom: -10pt;
    left: 0;
  }
  u {
    border-bottom: 1px solid #333;
    text-decoration: none;
  }
</style>

<div class="sm_doc">
  <div class="page">

    <!-- Header -->
    <p class="font_small">AO 440 (Rev. 06/12) Summons in a Civil Action (Page 2)</p>
    <table class="table_padding">
      <tr><td width="100%" class="cell_underline"></td></tr>
    </table>
    <p>Civil Action No. <span class="data_inline">{{case_number}}</span></p>

    <p><br></p>

    <!-- Title -->
    <p class="text_center">
      <strong>PROOF OF SERVICE</strong>
      <br>
      <strong><em>(This section should not be filed with the court unless required by Fed. R. Civ. P. 4 (l))</em></strong>
    </p>

    <p><br></p>

    <!-- Opening Statement -->
    <p style="text-indent: 3em;">
      This summons for <em>(name of individual and title, if any)</em>
      <u><span class="data_inline">{{recipient_name}}</span></u> was received by me on <em>(date)</em>
      <u><span class="data_inline">{{formatDate date_received "MMM d, yyyy, h:mm a"}}</span></u>.
    </p>
    <p><br></p>

    <!-- Checkbox Options -->
    <div style="padding-left: 3em;">
      <table class="table_padding break_small">

        <!-- Personal Service -->
        <tr>
          <td class="cell_collapse">
            <span class="check_box">{{#if (eq service_method "personal")}}X{{/if}}</span>
          </td>
          <td><p>
            I personally served the summons on the individual at <em>(place)</em>
            <u><span class="data_inline">{{#if (eq service_method "personal")}}{{service_place}}{{/if}}</span></u>
            on <em>(date)</em>
            <u><span class="data_inline">{{#if (eq service_method "personal")}}{{formatDate service_date "ddd, MMM dd yyyy"}}{{/if}}</span></u>;
            or
          </p></td>
        </tr>

        <!-- Sub-service -->
        <tr>
          <td class="cell_collapse">
            <span class="check_box">{{#if (eq service_method "residence")}}X{{/if}}</span>
          </td>
          <td><p>
            I left the summons at the individual's residence or usual place of abode with <em>(name)</em>
            <u><span class="data_inline">{{#if (eq service_method "residence")}}{{residence_person}}{{/if}}</span></u>
            , a person of suitable age and discretion who resides there, on <em>(date)</em>
            <u><span class="data_inline">{{#if (eq service_method "residence")}}{{formatDate residence_date "ddd, MMM dd yyyy"}}{{/if}}</span></u>
            , and mailed a copy to the individual's last known address; or
          </p></td>
        </tr>

        <!-- Registered Agent -->
        <tr>
          <td class="cell_collapse">
            <span class="check_box">{{#if (eq service_method "organization")}}X{{/if}}</span>
          </td>
          <td><p>
            I served the summons on <em>(name of individual)</em>
            <u><span class="data_inline">{{#if (eq service_method "organization")}}{{organization_agent}}{{/if}}</span></u>
            , who is designated by law to accept service of process on behalf of <em>(name of organization)</em>
            <u><span class="data_inline">{{#if (eq service_method "organization")}}{{organization_name}}{{/if}}</span></u>
            on <em>(date)</em>
            <u><span class="data_inline">{{#if (eq service_method "organization")}}{{formatDate organization_date "ddd, MMM dd yyyy"}}{{/if}}</span></u>;
            or
          </p></td>
        </tr>

        <!-- Non-Service / Unexecuted -->
        <tr>
          <td class="cell_collapse">
            <span class="check_box">{{#if (eq service_method "unexecuted")}}X{{/if}}</span>
          </td>
          <td><p>
            I returned the summons unexecuted because:
            <u><span class="data_inline">{{#if (eq service_method "unexecuted")}}{{unexecuted_reason}}{{/if}}</span></u>; or
          </p></td>
        </tr>

        <!-- Other -->
        <tr>
          <td class="cell_collapse">
            <span class="check_box">{{#if (eq service_method "other")}}X{{/if}}</span>
          </td>
          <td>
            <p>Other:
              <u><span class="data_inline">{{#if (eq service_method "other")}}{{other_details}}{{/if}}</span></u>
            </p>
          </td>
        </tr>
      </table>

      <!-- Fees -->
      <p>My fees are $ <u><span class="data_inline">{{default travel_fee ""}}</span></u> for travel and $ <u><span class="data_inline">{{default service_fee ""}}</span></u> for services, for a total of $ <u><span class="data_inline">{{default total_fee "$0.00"}}</span></u>.</p>

      <p><br></p>
      <p>I declare under penalty of perjury that this information is true.</p>
      <p><br></p>

    </div>

    <p><br></p>

    <!-- Signature Section - TABLE BASED (competitor approach) -->
    <table class="table_padding break_small">
      <tr>
        <td><p>Date: <span class="data_inline">{{#if placed_signature.signed_date}}{{formatDate placed_signature.signed_date "MM/dd/yyyy"}}{{/if}}</span></p></td>
        <td class="cell_underline align_bottom digital_signature_container">
          {{#if placed_signature.signature_data}}
            <img src="{{placed_signature.signature_data}}" class="signature_img" alt="Signature" />
          {{/if}}
        </td>
      </tr>

      <tr>
        <td width="48%">&nbsp;</td>
        <td class="text_center"><em>Server's signature</em></td>
      </tr>

      <tr>
        <td>&nbsp;</td>
        <td class="cell_underline"><div class="data">{{server_name_and_title}}</div></td>
      </tr>

      <tr>
        <td>&nbsp;</td>
        <td class="text_center"><em>Printed name and title</em></td>
      </tr>

      <tr>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>

      <tr>
        <td>&nbsp;</td>
        <td class="cell_underline"><span class="data_inline">{{server_address}}</span></td>
      </tr>

      <tr>
        <td></td>
        <td class="text_center"><em>Server's address</em></td>
      </tr>
    </table>

    <!-- Additional Information -->
    <p>Additional information regarding attempted service, etc.:</p>

    <div class="data">
      {{#each service_attempts}}
        {{@index}}) Unsuccessful Attempt: {{this.date_time}} at {{this.address}}
        <br><p>{{this.comments}}</p>
        <p><br></p>
      {{/each}}
      {{additional_info}}
    </div>

  </div>
</div>`
  },

  standard_test: {
    name: 'Standard Affidavit Test',
    description: 'Standard affidavit using CSS table-based layout for consistent PDF rendering.',
    service_status: 'both',
    is_active: true,
    html: `<style>
  .sm_doc {
    font-family: "Times New Roman", Times, serif;
    font-size: 13pt;
    line-height: 1.5;
    color: #000;
  }
  .page {
    width: 612pt;
    min-height: 792pt;
    padding: 12pt 24pt;
    background: #fff;
    box-sizing: border-box;
  }
  .text_center {
    text-align: center;
  }
  .text_justify {
    text-align: justify;
  }
  .text_right {
    text-align: right;
  }
  .font_bold {
    font-weight: bold;
  }
  .font_14 {
    font-size: 14pt;
  }
  .font_12 {
    font-size: 12pt;
  }
  .font_11 {
    font-size: 11pt;
  }
  .font_10 {
    font-size: 10pt;
  }
  .break_small {
    margin-bottom: 4pt;
  }
  .break_medium {
    margin-bottom: 12pt;
  }
  .break_large {
    margin-bottom: 18pt;
  }
  .table_layout {
    width: 100%;
    border-collapse: collapse;
  }
  .table_layout td {
    vertical-align: top;
    border: none;
  }
  .table_border {
    width: 100%;
    border-collapse: collapse;
  }
  .table_border td, .table_border th {
    border: 1pt solid #000;
    padding: 4pt 6pt;
    vertical-align: top;
  }
  .table_border th {
    background-color: #f0f0f0;
    text-align: left;
    font-weight: bold;
  }
  .divider {
    width: 75%;
    height: 1pt;
    background-color: #000;
  }
  .signature_line {
    border-bottom: 1pt solid #000;
    height: 50pt;
    position: relative;
  }
  .signature_img {
    position: absolute;
    bottom: -10pt;
    left: 0;
    height: 60pt;
    max-width: 350pt;
    object-fit: contain;
  }
  .notary_line {
    border-bottom: 1pt solid #000;
    height: 30pt;
  }
  .notary_small_line {
    border-bottom: 1pt solid #000;
    height: 15pt;
  }
  .avoid_break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
</style>

<div class="sm_doc">
  <div class="page">

    <!-- Court Name -->
    <div class="text_center" style="margin-bottom: 50pt;">
      <div class="font_bold font_14" style="text-transform: capitalize; line-height: 1.3; max-width: 500pt; margin: 0 auto;">
        {{full_court_name}}
      </div>
    </div>

    <!-- Caption Section: Parties and Case Info -->
    <table class="table_layout break_large">
      <tr>
        <td style="width: 66.66%; padding-right: 24pt;">
          <!-- Left Side: Party Names -->
          <div style="margin-left: 16pt; line-height: 1.5;">
            <!-- Plaintiff -->
            <div class="break_medium">
              <div class="font_bold" style="line-height: 1.4; word-wrap: break-word;">
                {{truncateParties plaintiff 120}}
              </div>
              <div style="margin-left: 8pt;" class="font_11">Plaintiff</div>
            </div>

            <!-- vs -->
            <div class="break_medium">v.</div>

            <!-- Defendant -->
            <div style="margin-bottom: 20pt;">
              <div class="font_bold" style="line-height: 1.4; word-wrap: break-word;">
                {{truncateParties defendant 120}}
              </div>
              <div style="margin-left: 8pt;" class="font_11">Defendant</div>
            </div>

            <!-- Divider Line -->
            <div class="divider"></div>
          </div>
        </td>
        <td style="width: 33.33%;">
          <!-- Right Side: Case Info -->
          <div class="text_center" style="line-height: 1.5;">
            <!-- Case Number -->
            <div class="font_bold" style="margin-top: 10pt; margin-bottom: 18pt;">
              Case No: {{case_number}}
            </div>

            <!-- Document Title -->
            <div class="font_bold font_14" style="line-height: 1.3;">
              {{#if (eq status "served")}}
                AFFIDAVIT OF SERVICE
              {{else}}
                AFFIDAVIT OF DUE DILIGENCE
              {{/if}}
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Opening Affidavit Paragraph -->
    <p class="text_justify break_small" style="margin-top: 8pt;">
      I, <strong>{{titleCase server_name}}</strong>, being duly sworn, depose and say: I am over the age of 18 years and not a party to this action{{#if (eq status "served")}}, and that within the boundaries of the state where service was effected, I was authorized by applicable law to make service of the documents and informed said person of the contents herein{{else}}, and that I was authorized by applicable law to attempt service of the documents{{/if}}
    </p>

    <!-- Documents Received -->
    <p class="text_justify break_small">
      I received the documents on <strong>{{default (formatDate job_created_date "MMMM d, yyyy 'at' h:mm a") "[Date documents received]"}}</strong>; they were directed to <strong>{{#if (or (eq service_manner "registered_agent") (eq service_manner "authorized_representative") (eq service_manner "corporate_officer") (eq service_manner "business"))}}{{default company_being_served "[Company name]"}}{{else}}{{default recipient_name "[Recipient name]"}}{{/if}}</strong> at <strong>{{default recipient_address "[Service address]"}}</strong>.
    </p>

    <!-- Documents Section -->
    <p class="text_justify break_small">
      <strong>Documents served:</strong> {{#if documents_served.length}}{{#each documents_served}}{{this.title}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}[No documents marked for service]{{/if}}
    </p>

    <!-- Service Type Section -->
    <p class="text_justify break_small">
      <strong>Type of service:</strong> {{#if (eq status "served")}}{{#if (eq service_manner "substitute")}}Served - Sub-service{{else}}Served - {{formatServiceManner service_manner}}{{/if}}{{else}}Non Service{{/if}}
    </p>

    <!-- Date/Time of Service (only for served status) -->
    {{#if (eq status "served")}}
      <p class="text_justify break_small">
        <strong>Date/Time of Service:</strong> {{formatDate service_date "MMMM d, yyyy"}} at {{service_time}}
      </p>
    {{/if}}

    <!-- Person Served / Address (only for served status) -->
    {{#if (eq status "served")}}
      <p class="text_justify break_small">
        <strong>Person Served / Address:</strong>
        {{#if (eq service_manner "personal")}}
          {{titleCase person_served_name}} at {{service_address}}
        {{else if (or (eq service_manner "registered_agent") (eq service_manner "authorized_representative") (eq service_manner "corporate_officer") (eq service_manner "business"))}}
          {{titleCase person_served_name}}, {{person_title}}, who is authorized to accept legal documents on behalf of {{company_being_served}} at {{service_address}}
        {{else if (eq service_manner "substitute")}}
          {{titleCase person_served_name}} ({{person_relationship}}) who lives at the address and confirmed residency of {{titleCase recipient_name}} - to comply with sub-service statute(s) I also mailed the documents via USPS on {{formatDate mailing_date "MMMM d, yyyy"}} to {{titleCase recipient_name}} at {{service_address}}.
        {{else}}
          {{titleCase person_served_name}} ({{person_relationship}}) at {{service_address}}
        {{/if}}
      </p>
    {{/if}}

    <!-- Non-Service Section (only for non-served status) -->
    {{#if (ne status "served")}}
      <p class="text_center font_bold font_14" style="margin-top: 8pt; margin-bottom: 6pt;">
        SERVICE WAS NOT EFFECTED
      </p>

      <p class="text_justify" style="margin-bottom: 8pt; line-height: 1.4;">
        After making diligent attempts, I was unable to serve <strong>{{default recipient_name "[Person being served]"}}</strong> at <strong>{{default recipient_address "[Address]"}}</strong>.
      </p>

      <!-- Service Attempts Table -->
      <table class="table_border font_12" style="margin-bottom: 8pt;">
        <thead>
          <tr>
            <th>Date and Time</th>
            <th>Address Attempted</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
          {{#each service_attempts}}
            <tr>
              <td>{{this.date_time}}</td>
              <td>{{this.address}}</td>
              <td>{{this.comments}}</td>
            </tr>
          {{/each}}
        </tbody>
      </table>
    {{/if}}

    <!-- Person Description (only for served status, if description exists) -->
    {{#if (eq status "served")}}
      {{#if (buildPersonDescription person_sex person_age person_height person_weight person_hair person_relationship person_description_other)}}
        <p class="text_justify break_small">
          <strong>Description:</strong> {{buildPersonDescription person_sex person_age person_height person_weight person_hair person_relationship person_description_other}}
        </p>
      {{/if}}
    {{/if}}

    <!-- GPS Coordinates (only for served status, if GPS data exists) -->
    {{#if (eq status "served")}}
      {{#if attempt_gps_lat}}
        <p class="text_justify break_small">
          <strong>GPS Coordinates:</strong> {{formatGPS attempt_gps_lat attempt_gps_lon attempt_gps_accuracy}}
        </p>
      {{/if}}
    {{/if}}

    <!-- Declaration -->
    <p class="text_justify" style="{{#if (ne status 'served')}}margin-top: 8pt; margin-bottom: 12pt;{{else}}margin-top: 12pt; margin-bottom: 16pt;{{/if}}">
      I declare under penalty of perjury that the foregoing is true and correct.
    </p>

    <!-- Signature Section with Optional Notary -->
    {{#if include_notary}}
      <!-- Two Column Layout: Notary Left, Signature Right -->
      <div class="avoid_break" style="margin-top: 20pt;">
        <table class="table_layout">
          <tr>
            <td style="width: 50%; padding-right: 12pt;">
              <!-- Notary Block -->
              <div class="font_10" style="font-style: italic; margin-bottom: 4pt; line-height: 1.3;">
                Subscribed and sworn to before me by the affiant who is personally known to me.
              </div>
              <div class="notary_line" style="margin-bottom: 4pt;"></div>
              <div class="font_bold" style="margin-bottom: 4pt;">Notary Public</div>
              <table class="table_layout">
                <tr>
                  <td style="width: 45%;">
                    <div class="notary_small_line" style="margin-bottom: 4pt;"></div>
                    <div class="font_10">Date</div>
                  </td>
                  <td style="width: 10%;"></td>
                  <td style="width: 45%;">
                    <div class="notary_small_line" style="margin-bottom: 4pt;"></div>
                    <div class="font_10">Commission Expires</div>
                  </td>
                </tr>
              </table>
            </td>
            <td style="width: 50%; padding-left: 12pt;">
              <!-- Signature Block -->
              <div class="signature_line" style="margin-bottom: 4pt;">
                {{#if placed_signature.signature_data}}
                  <img src="{{placed_signature.signature_data}}" alt="Signature" class="signature_img" />
                {{/if}}
              </div>
              <table class="table_layout" style="margin-bottom: 8pt;">
                <tr>
                  <td>{{titleCase server_name}}{{#if server_license_number}}, License #{{server_license_number}}{{/if}}</td>
                  <td class="text_right" style="padding-right: 20pt;">Date: {{#if placed_signature.signed_date}}{{formatDate placed_signature.signed_date "M/d/yyyy"}}{{else}}_____________{{/if}}</td>
                </tr>
              </table>
              {{#if company_info}}
              <div style="margin-bottom: 2pt;">{{company_info.company_name}}</div>
              <div class="font_11">{{company_info.address1}}</div>
              <div class="font_11">{{company_info.city}}, {{company_info.state}} {{company_info.postal_code}}</div>
              {{/if}}
            </td>
          </tr>
        </table>
      </div>
    {{else}}
      <!-- Single Column: Signature Only (Right Aligned) -->
      <div class="avoid_break" style="margin-top: 20pt;">
        <table class="table_layout">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%;">
              <div class="signature_line" style="margin-bottom: 4pt;">
                {{#if placed_signature.signature_data}}
                  <img src="{{placed_signature.signature_data}}" alt="Signature" class="signature_img" />
                {{/if}}
              </div>
              <table class="table_layout" style="margin-bottom: 8pt;">
                <tr>
                  <td>{{titleCase server_name}}{{#if server_license_number}}, License #{{server_license_number}}{{/if}}</td>
                  <td class="text_right" style="padding-right: 20pt;">Date: {{#if placed_signature.signed_date}}{{formatDate placed_signature.signed_date "M/d/yyyy"}}{{else}}_____________{{/if}}</td>
                </tr>
              </table>
              {{#if company_info}}
              <div style="margin-bottom: 2pt;">{{company_info.company_name}}</div>
              <div class="font_11">{{company_info.address1}}</div>
              <div class="font_11">{{company_info.city}}, {{company_info.state}} {{company_info.postal_code}}</div>
              {{/if}}
            </td>
          </tr>
        </table>
      </div>
    {{/if}}

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
  return STARTER_TEMPLATES[id] || STARTER_TEMPLATES.standard_test;
};
