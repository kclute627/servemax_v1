/**
 * Starter Template Library
 *
 * Pre-built HTML templates that users can start from
 */

export const STARTER_TEMPLATES = {
  standard: {
    name: 'Standard Affidavit',
    description: 'Professional service affidavit - the best affidavit known to the legal industry. Multi-page support with precise formatting.',
    service_status: 'both',
    is_active: true,
    html: `<div style="width: 612pt; padding: 12pt 24pt; font-family: Times New Roman, Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; background-color: #FFFFFF; box-sizing: border-box; position: relative;">

  <!-- Top Section: Court Name -->
  <div style="text-align: center; margin-bottom: 50pt;">
    <div style="font-weight: bold; font-size: 14pt; text-transform: capitalize; line-height: 1.3; max-width: 500pt; margin: 0 auto;">
      {{full_court_name}}
    </div>
  </div>

  <!-- Caption Section: Parties and Case Info -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 18pt; border: none;">
    <tr>
      <td style="width: 66.66%; vertical-align: top; padding-right: 24pt; border: none;">
        <!-- Left Side: Party Names (2/3 width) -->
        <div style="margin-left: 16pt; line-height: 1.5;">
          <!-- Plaintiff -->
          <div style="margin-bottom: 12pt;">
            <div style="font-weight: bold; line-height: 1.4; word-wrap: break-word;">
              {{truncateParties plaintiff 120}}
            </div>
            <div style="margin-left: 8pt; font-size: 11pt;">Plaintiff</div>
          </div>

          <!-- vs -->
          <div style="margin-bottom: 12pt;">v.</div>

          <!-- Defendant -->
          <div style="margin-bottom: 20pt;">
            <div style="font-weight: bold; line-height: 1.4; word-wrap: break-word;">
              {{truncateParties defendant 120}}
            </div>
            <div style="margin-left: 8pt; font-size: 11pt;">Defendant</div>
          </div>

          <!-- Divider Line -->
          <div style="width: 75%; height: 1pt; background-color: #000000;"></div>
        </div>
      </td>
      <td style="width: 33.33%; vertical-align: top; border: none;">
        <!-- Right Side: Case Info (1/3 width) -->
        <div style="text-align: center; line-height: 1.5;">
          <!-- Case Number -->
          <div style="font-weight: bold; margin-top: 10pt; margin-bottom: 18pt;">
            Case No: {{case_number}}
          </div>

          <!-- Document Title - Conditional based on service status -->
          <div style="font-weight: bold; font-size: 14pt; line-height: 1.3;">
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
  <p style="margin-top: 8pt; margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
    I, <strong>{{titleCase server_name}}</strong>, being duly sworn, depose and say: I am over the age of 18 years and not a party to this action{{#if (eq status "served")}}, and that within the boundaries of the state where service was effected, I was authorized by applicable law to make service of the documents and informed said person of the contents herein{{else}}, and that I was authorized by applicable law to attempt service of the documents{{/if}}
  </p>

  <!-- Second Paragraph: Documents Received -->
  <p style="margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
    I received the documents on <strong>{{default (formatDate job_created_date "MMMM d, yyyy 'at' h:mm a") "[Date documents received]"}}</strong>; they were directed to <strong>{{#if (or (eq service_manner "registered_agent") (eq service_manner "authorized_representative") (eq service_manner "corporate_officer") (eq service_manner "business"))}}{{default company_being_served "[Company name]"}}{{else}}{{default recipient_name "[Recipient name]"}}{{/if}}</strong> at <strong>{{default recipient_address "[Service address]"}}</strong>.
  </p>

  <!-- Documents Section -->
  <p style="margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
    <strong>Documents served:</strong> {{#if documents_served.length}}{{#each documents_served}}{{this.title}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}[No documents marked for service]{{/if}}
  </p>

  <!-- Service Type Section -->
  <p style="margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
    <strong>Type of service:</strong> {{#if (eq status "served")}}{{#if (eq service_manner "substitute")}}Served - Sub-service{{else}}Served - {{formatServiceManner service_manner}}{{/if}}{{else}}Non Service{{/if}}
  </p>

  <!-- Date/Time of Service (only for served status) -->
  {{#if (eq status "served")}}
    <p style="margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
      <strong>Date/Time of Service:</strong> {{formatDate service_date "MMMM d, yyyy"}} at {{service_time}}
    </p>
  {{/if}}

  <!-- Person Served / Address (only for served status) -->
  {{#if (eq status "served")}}
    <p style="margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
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
    <p style="margin-top: 8pt; margin-bottom: 6pt; text-align: center; font-weight: bold; font-size: 14pt;">
      SERVICE WAS NOT EFFECTED
    </p>

    <p style="margin-bottom: 8pt; text-align: justify; line-height: 1.4;">
      After making diligent attempts, I was unable to serve <strong>{{default recipient_name "[Person being served]"}}</strong> at <strong>{{default recipient_address "[Address]"}}</strong>.
    </p>

    <!-- Service Attempts Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8pt; border: 1pt solid #000000; font-size: 12pt;">
      <thead>
        <tr style="background-color: #f0f0f0;">
          <th style="border: 1pt solid #000000; padding: 4pt 6pt; text-align: left; font-weight: bold;">Date and Time</th>
          <th style="border: 1pt solid #000000; padding: 4pt 6pt; text-align: left; font-weight: bold;">Address Attempted</th>
          <th style="border: 1pt solid #000000; padding: 4pt 6pt; text-align: left; font-weight: bold;">Comments</th>
        </tr>
      </thead>
      <tbody>
        {{#each service_attempts}}
          <tr>
            <td style="border: 1pt solid #000000; padding: 4pt 6pt; vertical-align: top;">{{this.date_time}}</td>
            <td style="border: 1pt solid #000000; padding: 4pt 6pt; vertical-align: top;">{{this.address}}</td>
            <td style="border: 1pt solid #000000; padding: 4pt 6pt; vertical-align: top;">{{this.comments}}</td>
          </tr>
        {{/each}}
      </tbody>
    </table>
  {{/if}}

  <!-- Person Description (only for served status, if description exists) -->
  {{#if (eq status "served")}}
    {{#if (buildPersonDescription person_sex person_age person_height person_weight person_hair person_relationship person_description_other)}}
      <p style="margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
        <strong>Description:</strong> {{buildPersonDescription person_sex person_age person_height person_weight person_hair person_relationship person_description_other}}
      </p>
    {{/if}}
  {{/if}}

  <!-- GPS Coordinates (only for served status, if GPS data exists) -->
  {{#if (eq status "served")}}
    {{#if attempt_gps_lat}}
      <p style="margin-bottom: 4pt; text-align: justify; line-height: 1.5;">
        <strong>GPS Coordinates:</strong> {{formatGPS attempt_gps_lat attempt_gps_lon attempt_gps_accuracy}}
      </p>
    {{/if}}
  {{/if}}

  <!-- Template content will be built section by section -->

  <!-- Declaration -->
  <p style="{{#if (ne status "served")}}margin-top: 8pt; margin-bottom: 12pt;{{else}}margin-top: 12pt; margin-bottom: 16pt;{{/if}} text-align: justify; line-height: 1.5;">
    I declare under penalty of perjury that the foregoing is true and correct.
  </p>

  <!-- Signature Section with Optional Notary -->
  {{#if include_notary}}
    <!-- Two Column Layout: Notary Left, Signature Right -->
    <div style="margin-top: 20pt; page-break-inside: avoid; break-inside: avoid;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; border: none; vertical-align: top; padding-right: 12pt;">
            <!-- Notary Block -->
            <div style="font-style: italic; margin-bottom: 4pt; font-size: 10pt; line-height: 1.3;">
              Subscribed and sworn to before me by the affiant who is personally known to me.
            </div>
            <div style="border-bottom: 1pt solid #000000; width: 100%; margin-bottom: 4pt; height: 30pt;"></div>
            <div style="margin-bottom: 4pt; font-weight: bold;">Notary Public</div>
            <div style="display: flex; justify-content: space-between;">
              <div style="width: 45%;">
                <div style="border-bottom: 1pt solid #000000; margin-bottom: 4pt; height: 15pt;"></div>
                <div style="font-size: 10pt;">Date</div>
              </div>
              <div style="width: 45%;">
                <div style="border-bottom: 1pt solid #000000; margin-bottom: 4pt; height: 15pt;"></div>
                <div style="font-size: 10pt;">Commission Expires</div>
              </div>
            </div>
          </td>
          <td style="width: 50%; border: none; vertical-align: top; padding-left: 12pt;">
            <!-- Signature Block -->
            <div style="border-bottom: 1pt solid #000000; width: 100%; margin-bottom: 4pt; height: 40pt; position: relative;">
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8pt;">
              <div>{{titleCase server_name}}{{#if server_license_number}}, License #{{server_license_number}}{{/if}}</div>
              <div style="padding-right: 20pt;">Date: {{#if placed_signature.signed_date}}{{formatDate placed_signature.signed_date "M/d/yyyy"}}{{else}}_____________{{/if}}</div>
            </div>
            {{#if company_info}}
            <div style="margin-bottom: 2pt;">{{company_info.company_name}}</div>
            <div style="font-size: 11pt;">{{company_info.address1}}</div>
            <div style="font-size: 11pt;">{{company_info.city}}, {{company_info.state}} {{company_info.postal_code}}</div>
            {{/if}}
          </td>
        </tr>
      </table>
    </div>
  {{else}}
    <!-- Single Column: Signature Only (Right Aligned) -->
    <div style="margin-top: 20pt; page-break-inside: avoid; break-inside: avoid; display: flex; justify-content: flex-end;">
      <div style="text-align: left; width: 300pt;">
        <div style="border-bottom: 1pt solid #000000; width: 100%; margin-bottom: 4pt; height: 40pt; position: relative;">
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8pt;">
          <div>{{titleCase server_name}}{{#if server_license_number}}, License #{{server_license_number}}{{/if}}</div>
          <div style="padding-right: 20pt;">Date: {{#if placed_signature.signed_date}}{{formatDate placed_signature.signed_date "M/d/yyyy"}}{{else}}_____________{{/if}}</div>
        </div>
        {{#if company_info}}
        <div style="margin-bottom: 2pt;">{{company_info.company_name}}</div>
        <div style="font-size: 11pt;">{{company_info.address1}}</div>
        <div style="font-size: 11pt;">{{company_info.city}}, {{company_info.state}} {{company_info.postal_code}}</div>
        {{/if}}
      </div>
    </div>
  {{/if}}

</div>`
  },

  ao440_federal: {
    name: 'AO 440 Federal Proof of Service',
    description: 'Official AO 440 (Rev. 06/12) Summons in a Civil Action - Proof of Service (Page 2). Pixel-perfect federal court format for both service and non-service scenarios.',
    service_status: 'both',
    is_active: true,
    html: `<div style="width: 612pt; padding: 24pt 36pt; font-family: Times New Roman, Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; background-color: #FFFFFF; box-sizing: border-box;">

  <!-- Header Line -->
  <div style="font-size: 10pt; margin-bottom: 0pt; line-height: 1.2;">
    AO 440 (Rev. 06/12) Summons in a Civil Action (Page 2)
  </div>
  <div style="font-size: 10pt; margin-bottom: 12pt; line-height: 1.2;">
    Civil Action No. {{case_number}}
  </div>

  <!-- Title Section -->
  <div style="text-align: center; margin-bottom: 12pt;">
    <div style="font-weight: bold; font-size: 12pt; margin-bottom: 0pt; line-height: 1.2;">PROOF OF SERVICE</div>
    <div style="font-size: 10pt; font-style: italic; line-height: 1.2;">(This section should not be filed with the court unless required by Fed. R. Civ. P. 4 (l))</div>
  </div>

  <!-- Opening Statement -->
  <p style="margin: 12pt 0; line-height: 1.4;">
    This summons for <i>(name of individual and title, if any)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 180pt;">{{recipient_name}}</span> was received by me on <i>(date)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 150pt;">{{formatDate date_received "MMM d, yyyy, h:mm a"}}</span>.
  </p>

  <!-- Checkbox Options -->
  <div style="margin-bottom: 15pt;">
    <!-- Option 1: Personal Service -->
    <div style="display: flex; margin-bottom: 12pt; line-height: 1.5;">
      <div style="width: 22pt; flex-shrink: 0; font-size: 18pt; font-family: Arial, sans-serif;">
        {{#if (eq service_method "personal")}}☑{{else}}☐{{/if}}
      </div>
      <div style="flex: 1;">
        I personally served the summons on the individual at <i>(place)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 180pt;">{{#if (eq service_method "personal")}}{{service_place}}{{/if}}</span> on <i>(date)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 120pt;">{{#if (eq service_method "personal")}}{{formatDate service_date "MMM d, yyyy h:mm a"}}{{/if}}</span>; or
      </div>
    </div>

    <!-- Option 2: Left at Residence -->
    <div style="display: flex; margin-bottom: 12pt; line-height: 1.5;">
      <div style="width: 22pt; flex-shrink: 0; font-size: 18pt; font-family: Arial, sans-serif;">
        {{#if (eq service_method "residence")}}☑{{else}}☐{{/if}}
      </div>
      <div style="flex: 1;">
        I left the summons at the individual's residence or usual place of abode with <i>(name)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 120pt;">{{#if (eq service_method "residence")}}{{residence_person}}{{/if}}</span>, a person of suitable age and discretion who resides there, on <i>(date)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 100pt;">{{#if (eq service_method "residence")}}{{formatDate residence_date "MMM d, yyyy h:mm a"}}{{/if}}</span>, and mailed a copy to the individual's last known address; or
      </div>
    </div>

    <!-- Option 3: Served on Organization -->
    <div style="display: flex; margin-bottom: 12pt; line-height: 1.5;">
      <div style="width: 22pt; flex-shrink: 0; font-size: 18pt; font-family: Arial, sans-serif;">
        {{#if (eq service_method "organization")}}☑{{else}}☐{{/if}}
      </div>
      <div style="flex: 1;">
        I served the summons on <i>(name of individual)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 140pt;">{{#if (eq service_method "organization")}}{{organization_agent}}{{/if}}</span>, who is designated by law to accept service of process on behalf of <i>(name of organization)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 180pt;">{{#if (eq service_method "organization")}}{{organization_name}}{{/if}}</span> on <i>(date)</i> <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 120pt;">{{#if (eq service_method "organization")}}{{formatDate organization_date "MMM d, yyyy h:mm a"}}{{/if}}</span>; or
      </div>
    </div>

    <!-- Option 4: Returned Unexecuted -->
    <div style="display: flex; margin-bottom: 12pt; line-height: 1.5;">
      <div style="width: 22pt; flex-shrink: 0; font-size: 18pt; font-family: Arial, sans-serif;">
        {{#if (eq service_method "unexecuted")}}☑{{else}}☐{{/if}}
      </div>
      <div style="flex: 1;">
        I returned the summons unexecuted because: <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 240pt;">{{#if (eq service_method "unexecuted")}}{{unexecuted_reason}}{{/if}}</span>; or
      </div>
    </div>

    <!-- Option 5: Other -->
    <div style="display: flex; margin-bottom: 12pt; line-height: 1.5;">
      <div style="width: 22pt; flex-shrink: 0; font-size: 18pt; font-family: Arial, sans-serif;">
        {{#if (eq service_method "other")}}☑{{else}}☐{{/if}}
      </div>
      <div style="flex: 1;">
        Other: <span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 340pt;">{{#if (eq service_method "other")}}{{other_details}}{{/if}}</span>; or
      </div>
    </div>
  </div>

  <!-- Fees Section -->
  <p style="margin: 12pt 0; line-height: 1.4;">
    My fees are $<span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 60pt; text-align: right;">{{default travel_fee ""}}</span> for travel and $<span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 60pt; text-align: right;">{{default service_fee ""}}</span> for services, for a total of $<span style="border-bottom: 1pt solid #000; display: inline-block; min-width: 60pt; text-align: right;">{{default total_fee "0.00"}}</span>.
  </p>

  <!-- Declaration -->
  <p style="margin: 12pt 0; line-height: 1.4;">
    I declare under penalty of perjury that this information is true.
  </p>

  <!-- Signature Section - Exact AO 440 Format -->
  <div style="margin-top: 30pt;">
    <!-- First Row: Date and Server's Signature on SAME LINE -->
    <div style="display: flex; gap: 40pt; align-items: flex-end; margin-bottom: 2pt;">
      <!-- Date -->
      <div style="display: flex; align-items: baseline; gap: 8pt; flex: 0 0 168pt;">
        <span style="font-size: 10pt;">Date:</span>
        <div style="border-bottom: 1pt solid #000; width: 120pt; height: 0pt; margin-bottom: 2pt; display: flex; align-items: flex-end; padding-bottom: 2pt;">
          {{#if placed_signature.signed_date}}<span style="font-size: 11pt;">{{formatDate placed_signature.signed_date "M/d/yyyy"}}</span>{{/if}}
        </div>
      </div>
      <!-- Server's Signature Line -->
      <div style="flex: 1; padding-right: 10px; position: relative;">
        <div style="border-bottom: 1pt solid #000; width: 100%; height: 30pt; position: relative;">
          {{#if placed_signature.signature_data}}
            <img src="{{placed_signature.signature_data}}" alt="Signature" style="position: absolute; bottom: 2pt; left: 0; height: 28pt; max-width: 200pt; object-fit: contain;" />
          {{/if}}
        </div>
      </div>
    </div>
    <div style="text-align: center; font-size: 10pt; font-style: italic; margin-bottom: 26pt; padding-left: 168pt; padding-right: 10px;">
      Server's signature
    </div>

    <!-- Printed Name and Title -->
    <div style="display: flex; gap: 40pt;">
      <div style="flex: 0 0 168pt;"></div>
      <div style="flex: 1; padding-right: 10px;">
        <div style="border-bottom: 1pt solid #000; width: 100%; height: 20pt; margin-bottom: 2pt; display: flex; align-items: flex-end; padding-bottom: 2pt;">
          <span style="font-size: 11pt;">{{server_name_and_title}}</span>
        </div>
      </div>
    </div>
    <div style="text-align: center; font-size: 10pt; font-style: italic; margin-bottom: 26pt; padding-left: 168pt; padding-right: 10px;">
      Printed name and title
    </div>

    <!-- Server's Address -->
    <div style="display: flex; gap: 40pt;">
      <div style="flex: 0 0 168pt;"></div>
      <div style="flex: 1; padding-right: 10px;">
        <div style="border-bottom: 1pt solid #000; width: 100%; min-height: 20pt; margin-bottom: 2pt; display: flex; align-items: flex-end; padding-bottom: 2pt;">
          <span style="font-size: 11pt;">{{server_address}}</span>
        </div>
      </div>
    </div>
    <div style="text-align: center; font-size: 10pt; font-style: italic; margin-bottom: 12pt; padding-left: 168pt; padding-right: 10px;">
      Server's address
    </div>
  </div>

  <!-- Additional Information Section -->
  <div style="margin-top: 0pt; line-height: 1.3;">
    <div style="font-weight: normal; margin-bottom: 4pt;">Additional information regarding attempted service, etc.:</div>
    <div style="white-space: pre-wrap; line-height: 1.3;">{{additional_info}}</div>
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
  return STARTER_TEMPLATES[id] || STARTER_TEMPLATES.standard;
};
