# Email Templates System

## Overview

The email templates system allows super admins to create and manage email templates for SendGrid integration. These templates can be used to send notifications about attempts, notes, affidavits, invoices, and case summaries.

## Features

- **Template Types**: Support for 5 different template types
  - Service Attempts
  - Notes
  - Affidavits
  - Invoices
  - Case Summaries

- **Default vs Custom Templates**
  - **Default Templates**: General templates available to all companies
  - **Custom Templates**: Company-specific templates that override defaults

- **SendGrid Variable Support**: Templates use SendGrid's `{{variable}}` syntax

## Template Types and Available Variables

### 1. Service Attempt Templates

Use these templates when sending notifications about service attempts.

**Available Variables:**
- `{{job_number}}` - Job number
- `{{client_name}}` - Client's company name
- `{{defendant_name}}` - Name of the person to be served
- `{{attempt_date}}` - Date of the attempt
- `{{attempt_time}}` - Time of the attempt
- `{{attempt_status}}` - Status (served, not_served, contact_made, vacant, bad_address)
- `{{address_of_attempt}}` - Address where attempt was made
- `{{server_name}}` - Name of the process server
- `{{notes}}` - Notes about the attempt
- `{{gps_coordinates}}` - GPS coordinates of the attempt

**Example Template:**

**Subject:** `Service Attempt Report - Job {{job_number}}`

**Body:**
```
Dear {{client_name}},

This is to inform you that a service attempt was made for Job #{{job_number}}.

Defendant: {{defendant_name}}
Date/Time: {{attempt_date}} at {{attempt_time}}
Status: {{attempt_status}}
Address: {{address_of_attempt}}
Process Server: {{server_name}}

Notes:
{{notes}}

GPS Location: {{gps_coordinates}}

Best regards,
Your Process Service Team
```

### 2. Note Templates

Use these templates when sending notifications about notes added to a job.

**Available Variables:**
- `{{job_number}}` - Job number
- `{{client_name}}` - Client's company name
- `{{defendant_name}}` - Name of the person to be served
- `{{note_text}}` - The actual note content
- `{{note_date}}` - Date the note was created
- `{{author_name}}` - Name of the person who created the note

**Example Template:**

**Subject:** `New Note Added - Job {{job_number}}`

**Body:**
```
Dear {{client_name}},

A new note has been added to Job #{{job_number}} for {{defendant_name}}.

Date: {{note_date}}
Added by: {{author_name}}

Note:
{{note_text}}

Best regards,
Your Process Service Team
```

### 3. Affidavit Templates

Use these templates when sending affidavits to clients.

**Available Variables:**
- `{{job_number}}` - Job number
- `{{client_name}}` - Client's company name
- `{{defendant_name}}` - Name of the person served
- `{{service_date}}` - Date of service
- `{{server_name}}` - Name of the process server
- `{{affidavit_url}}` - Link to download the affidavit

**Example Template:**

**Subject:** `Affidavit of Service - Job {{job_number}}`

**Body:**
```
Dear {{client_name}},

The affidavit of service for Job #{{job_number}} is now ready.

Defendant: {{defendant_name}}
Service Date: {{service_date}}
Process Server: {{server_name}}

Download Affidavit: {{affidavit_url}}

Best regards,
Your Process Service Team
```

### 4. Invoice Templates

Use these templates when sending invoices to clients.

**Available Variables:**
- `{{invoice_number}}` - Invoice number
- `{{invoice_date}}` - Date of the invoice
- `{{client_name}}` - Client's company name
- `{{total_amount}}` - Total amount due
- `{{due_date}}` - Payment due date
- `{{invoice_url}}` - Link to view/download the invoice
- `{{line_items}}` - Formatted list of invoice line items

**Example Template:**

**Subject:** `Invoice {{invoice_number}} - Payment Due`

**Body:**
```
Dear {{client_name}},

Your invoice is ready for review.

Invoice Number: {{invoice_number}}
Invoice Date: {{invoice_date}}
Total Amount: ${{total_amount}}
Due Date: {{due_date}}

Items:
{{line_items}}

View Invoice: {{invoice_url}}

Please remit payment by the due date.

Best regards,
Your Accounting Team
```

### 5. Case Summary Templates

Use these templates when sending case summaries with selected information.

**Available Variables:**
- `{{job_number}}` - Job number
- `{{client_name}}` - Client's company name
- `{{defendant_name}}` - Name of the person to be served
- `{{case_number}}` - Court case number
- `{{status}}` - Current job status
- `{{attempts_count}}` - Number of attempts made
- `{{notes_count}}` - Number of notes
- `{{service_date}}` - Date of service (if completed)
- `{{all_attempts}}` - Formatted list of all attempts
- `{{all_notes}}` - Formatted list of all notes

**Example Template:**

**Subject:** `Case Summary - Job {{job_number}}`

**Body:**
```
Dear {{client_name}},

Here is the complete case summary for Job #{{job_number}}.

Case Information:
- Defendant: {{defendant_name}}
- Case Number: {{case_number}}
- Status: {{status}}
- Service Date: {{service_date}}

Statistics:
- Total Attempts: {{attempts_count}}
- Total Notes: {{notes_count}}

Service Attempts:
{{all_attempts}}

Notes:
{{all_notes}}

Please let us know if you need any additional information.

Best regards,
Your Process Service Team
```

## Creating Templates

### As Super Admin:

1. Navigate to **Templates** in the main menu
2. Click on the **Email Templates** tab
3. Click **New Template**
4. Fill in the template details:
   - **Name**: A descriptive name for the template
   - **Type**: Select the template type (attempt, note, affidavit, invoice, case_summary)
   - **Description**: Optional description
   - **Default**: Check if this should be the default template for this type
   - **Company**: Leave blank for general templates, or select a specific company for custom templates
   - **Subject**: Email subject line (can include variables)
   - **Body**: Email body (can include variables)
5. Use the variable buttons to insert variables into your template
6. Click **Create Template**

## Using Templates

When sending emails from the system:

1. The system will look for a company-specific template first
2. If no company-specific template exists, it will use the default template for that type
3. Variables will be automatically replaced with actual data from the job/attempt/note/etc.

## SendGrid Integration

To use these templates with SendGrid:

1. Set up your SendGrid API key in the system settings (coming soon)
2. Configure your sender email and name
3. Templates will be sent using SendGrid's API
4. Variables will be replaced before sending

## Notes

- Only super admins can create and edit email templates
- Regular users cannot edit templates but will use them when sending emails
- Default templates can be overridden on a per-company basis
- Templates support HTML formatting in the body
- Make sure to test templates before using them in production

## Future Enhancements

- Visual template editor with rich text formatting
- Template preview with sample data
- Template analytics (open rates, click rates)
- Scheduled email sending
- Bulk email sending with template selection
- Template versioning
