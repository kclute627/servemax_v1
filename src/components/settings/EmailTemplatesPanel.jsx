import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  FileText,
  Share2,
  MessageSquare,
  Handshake,
  UserPlus,
  Briefcase,
  Eye,
  Mail,
  MapPin
} from "lucide-react";

// Template definitions with metadata and dummy data
const EMAIL_TEMPLATES = [
  {
    id: 'invoice',
    name: 'Invoice',
    description: 'Sent to clients when a new invoice is generated',
    icon: Receipt,
    category: 'Billing',
    dummyData: {
      client_name: 'Acme Law Firm',
      invoice_number: 'INV-2024-0042',
      total_amount: '$450.00',
      due_date: 'February 15, 2024',
      job_reference: 'Case #2024-CV-789',
      invoice_view_url: '#preview',
    },
  },
  {
    id: 'affidavit',
    name: 'Affidavit of Service',
    description: 'Sent to clients when an affidavit is ready for review',
    icon: FileText,
    category: 'Documents',
    dummyData: {
      client_name: 'Johnson & Associates',
      case_caption: 'Smith vs. Jones',
      case_number: '2024-CV-12345',
      service_date: 'January 20, 2024',
      recipient_name: 'John Smith',
      service_status: 'Personal Service',
      affidavit_view_url: '#preview',
    },
  },
  {
    id: 'job-share-notification',
    name: 'Job Share Notification',
    description: 'Sent to partner companies when a job is shared with them',
    icon: Share2,
    category: 'Job Sharing',
    dummyData: {
      requires_acceptance: true,
      from_company_name: 'ABC Process Servers',
      service_address: '123 Main Street',
      city: 'Chicago',
      state: 'IL',
      due_date: 'February 1, 2024',
      documents_count: 3,
      proposed_fee: '$85.00',
      accept_url: '#preview',
      decline_url: '#preview',
    },
  },
  {
    id: 'job-share-response',
    name: 'Job Share Response',
    description: 'Sent back to the sharing company when partner responds',
    icon: MessageSquare,
    category: 'Job Sharing',
    dummyData: {
      to_company_name: 'ABC Process Servers',
      from_company_name: 'Quick Serve LLC',
      job_address: '456 Oak Avenue, Springfield, IL',
      response_status: 'accepted',
      response_message: 'We can handle this job. Will begin service attempts tomorrow.',
    },
  },
  {
    id: 'partnership-request',
    name: 'Partnership Request',
    description: 'Sent when a company requests to become partners',
    icon: Handshake,
    category: 'Partnerships',
    dummyData: {
      to_company_name: 'Premier Process Serving',
      from_company_name: 'City Legal Services',
      from_company_location: 'Chicago, IL',
      message: 'We would like to establish a partnership to share jobs in the Chicago metro area.',
      accept_url: '#preview',
    },
  },
  {
    id: 'partnership-response',
    name: 'Partnership Response',
    description: 'Sent when a company responds to a partnership request',
    icon: Handshake,
    category: 'Partnerships',
    dummyData: {
      to_company_name: 'City Legal Services',
      from_company_name: 'Premier Process Serving',
      response_status: 'accepted',
      response_message: 'We are excited to partner with you! Looking forward to working together.',
    },
  },
  {
    id: 'client-portal-invitation',
    name: 'Client Portal Invitation',
    description: 'Sent to invite clients to access the client portal',
    icon: UserPlus,
    category: 'Clients',
    dummyData: {
      client_name: 'Sarah Johnson',
      is_new_user: true,
      invite_url: '#preview',
    },
  },
  {
    id: 'employee-assignment',
    name: 'Employee Assignment',
    description: 'Sent to employees when assigned to a new job',
    icon: Briefcase,
    category: 'Internal',
    dummyData: {
      employee_name: 'Mike Thompson',
      job_type: 'Personal Service',
      recipient_name: 'Robert Williams',
      service_address: '789 Elm Street',
      city: 'Oak Park',
      state: 'IL',
      zip: '60302',
      due_date: 'January 25, 2024',
      documents_count: 2,
      special_instructions: 'Gated community - call ahead for access code.',
      job_url: '#preview',
    },
  },
  {
    id: 'job-attempt',
    name: 'Job Attempt Notification',
    description: 'Sent to clients with details of a service attempt',
    icon: MapPin,
    category: 'Updates',
    dummyData: {
      client_name: 'Acme Law Firm',
      case_caption: 'Smith vs. Jones',
      case_number: '2024-CV-12345',
      recipient_name: 'John Smith',
      attempt_date: 'January 20, 2024',
      attempt_time: '2:30 PM',
      status: 'served',
      success: true,
      address_of_attempt: '123 Main Street, Springfield, IL 62701',
      gps_lat: 39.7817,
      gps_lon: -89.6501,
      gps_accuracy: 8.5,
      person_served_name: 'John Smith',
      person_served_description: 'Male, 35-45 years old, brown hair, business attire',
      service_type_detail: 'Personal Service',
      notes: 'Successfully served at workplace reception desk. Recipient acknowledged receipt.',
      photos: [
        { url: 'https://placehold.co/120x120/e2e8f0/64748b?text=Photo+1', title: 'Photo 1' },
        { url: 'https://placehold.co/120x120/e2e8f0/64748b?text=Photo+2', title: 'Photo 2' },
      ],
      server_name: 'Mike Thompson',
      job_view_url: '#preview',
    },
  },
];

// Generate rendered HTML for each template with dummy data
const renderTemplate = (template) => {
  const { id, dummyData } = template;

  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
      .email-wrapper { width: 100%; background: #f5f5f5; padding: 40px 0; }
      .email-container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
      .header { background: #1e40af; padding: 24px; text-align: center; }
      .header-text { color: #fff; font-size: 22px; font-weight: 600; margin: 0; }
      .content { padding: 32px; }
      .content h2 { color: #1e293b; margin: 0 0 16px; font-size: 20px; }
      .content p { margin: 0 0 16px; color: #475569; }
      .info-box { background: #f8fafc; border-left: 4px solid #1e40af; padding: 16px 20px; margin: 20px 0; border-radius: 0 6px 6px 0; }
      .info-box p { margin: 0 0 8px; color: #334155; font-size: 14px; }
      .info-box p:last-child { margin: 0; }
      .info-box strong { color: #1e293b; }
      .button { display: inline-block; background: #1e40af; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; }
      .footer { background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; }
      .footer p { margin: 0 0 8px; font-size: 13px; color: #64748b; }
      .footer a { color: #1e40af; text-decoration: none; }
      .tagline { font-style: italic; color: #64748b; }
      .powered-by { margin-top: 16px !important; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px !important; color: #94a3b8 !important; }
      .review-link { display: inline-block; background: #1e40af; color: #fff !important; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; text-decoration: none; }
      .status-accepted { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
      .status-declined { background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
    </style>
  `;

  const footerHtml = `
    <div class="footer">
      <p><strong>Sample Process Serving Company</strong></p>
      <p class="tagline">Professional Process Serving Since 2010</p>
      <p>123 Business Ave, Suite 100, Chicago, IL 60601</p>
      <p>(555) 123-4567</p>
      <p><a href="mailto:contact@samplecompany.com">contact@samplecompany.com</a></p>
      <p style="margin-top: 12px;"><a href="#">Visit Our Website</a></p>
      <p><a href="#" class="review-link">Leave Us a Review ⭐</a></p>
      <p class="powered-by">Powered by <a href="https://servemax.pro">ServeMax</a></p>
    </div>
  `;

  let contentHtml = '';

  switch (id) {
    case 'invoice':
      contentHtml = `
        <h2>Invoice #${dummyData.invoice_number}</h2>
        <p>Hello ${dummyData.client_name},</p>
        <p>A new invoice has been generated for your account.</p>
        <div class="info-box">
          <p><strong>Invoice Number:</strong> ${dummyData.invoice_number}</p>
          <p><strong>Amount Due:</strong> ${dummyData.total_amount}</p>
          <p><strong>Due Date:</strong> ${dummyData.due_date}</p>
          <p><strong>Reference:</strong> ${dummyData.job_reference}</p>
        </div>
        <p style="text-align: center;"><a href="#" class="button">View Invoice</a></p>
        <p>Thank you for your business!</p>
        <p style="font-size: 13px; color: #64748b;">If you have any questions about this invoice, please don't hesitate to contact us.</p>
      `;
      break;

    case 'affidavit':
      contentHtml = `
        <h2>Affidavit of Service Ready</h2>
        <p>Hello ${dummyData.client_name},</p>
        <p>The affidavit of service for your job has been completed and is ready for your review.</p>
        <div class="info-box">
          <p><strong>Case:</strong> ${dummyData.case_caption}</p>
          <p><strong>Case Number:</strong> ${dummyData.case_number}</p>
          <p><strong>Service Date:</strong> ${dummyData.service_date}</p>
          <p><strong>Recipient:</strong> ${dummyData.recipient_name}</p>
          <p><strong>Status:</strong> ${dummyData.service_status}</p>
        </div>
        <p style="text-align: center;"><a href="#" class="button">View Affidavit</a></p>
        <p style="font-size: 13px; color: #64748b;">You can download or print the affidavit from the link above.</p>
      `;
      break;

    case 'job-share-notification':
      contentHtml = `
        <h2>New Job Share Request</h2>
        <p><strong>${dummyData.from_company_name}</strong> has shared a job with you that requires your acceptance.</p>
        <div class="info-box">
          <p><strong>Service Address:</strong> ${dummyData.service_address}</p>
          <p><strong>City/State:</strong> ${dummyData.city}, ${dummyData.state}</p>
          <p><strong>Due Date:</strong> ${dummyData.due_date}</p>
          <p><strong>Documents:</strong> ${dummyData.documents_count} document(s)</p>
          <p><strong>Proposed Fee:</strong> ${dummyData.proposed_fee}</p>
        </div>
        <p style="text-align: center;">
          <a href="#" class="button" style="background: #16a34a; margin-right: 8px;">Accept Job</a>
          <a href="#" class="button" style="background: #dc2626;">Decline</a>
        </p>
        <p style="font-size: 13px; color: #64748b;">Please respond to this request at your earliest convenience.</p>
      `;
      break;

    case 'job-share-response':
      contentHtml = `
        <h2>Job Share Response</h2>
        <p>Hello ${dummyData.to_company_name},</p>
        <p><strong>${dummyData.from_company_name}</strong> has responded to your job share request.</p>
        <div class="info-box">
          <p><strong>Job Address:</strong> ${dummyData.job_address}</p>
          <p><strong>Response:</strong> <span class="status-accepted">ACCEPTED</span></p>
          <p><strong>Message:</strong> ${dummyData.response_message}</p>
        </div>
        <p style="text-align: center;"><a href="#" class="button">View Job Details</a></p>
      `;
      break;

    case 'partnership-request':
      contentHtml = `
        <h2>New Partnership Request</h2>
        <p>Hello ${dummyData.to_company_name},</p>
        <p><strong>${dummyData.from_company_name}</strong> from ${dummyData.from_company_location} would like to establish a job sharing partnership with your company.</p>
        <div class="info-box">
          <p><strong>Company:</strong> ${dummyData.from_company_name}</p>
          <p><strong>Location:</strong> ${dummyData.from_company_location}</p>
          <p><strong>Message:</strong> ${dummyData.message}</p>
        </div>
        <p style="text-align: center;"><a href="#" class="button">Review Partnership Request</a></p>
        <p style="font-size: 13px; color: #64748b;">You can accept or decline this request from your settings page.</p>
      `;
      break;

    case 'partnership-response':
      contentHtml = `
        <h2>Partnership Request Update</h2>
        <p>Hello ${dummyData.to_company_name},</p>
        <p><strong>${dummyData.from_company_name}</strong> has responded to your partnership request.</p>
        <div class="info-box">
          <p><strong>Status:</strong> <span class="status-accepted">ACCEPTED</span></p>
          <p><strong>Message:</strong> ${dummyData.response_message}</p>
        </div>
        <p>You can now share jobs with this partner through your dashboard.</p>
        <p style="text-align: center;"><a href="#" class="button">View Partner Details</a></p>
      `;
      break;

    case 'client-portal-invitation':
      contentHtml = `
        <h2>You're Invited to the Client Portal</h2>
        <p>Hello ${dummyData.client_name},</p>
        <p>You've been invited to access the client portal where you can:</p>
        <ul style="color: #475569; margin: 0 0 16px; padding-left: 24px;">
          <li>Track the status of your jobs in real-time</li>
          <li>View and download affidavits</li>
          <li>Access invoices and payment history</li>
          <li>Submit new service requests</li>
        </ul>
        <p style="text-align: center;"><a href="#" class="button">Access Client Portal</a></p>
        <p style="font-size: 13px; color: #64748b;">This invitation link will expire in 7 days. If you have any questions, please contact us.</p>
      `;
      break;

    case 'employee-assignment':
      contentHtml = `
        <h2>New Job Assignment</h2>
        <p>Hello ${dummyData.employee_name},</p>
        <p>You've been assigned to a new job. Please review the details below.</p>
        <div class="info-box">
          <p><strong>Job Type:</strong> ${dummyData.job_type}</p>
          <p><strong>Recipient:</strong> ${dummyData.recipient_name}</p>
          <p><strong>Address:</strong> ${dummyData.service_address}</p>
          <p><strong>City/State/Zip:</strong> ${dummyData.city}, ${dummyData.state} ${dummyData.zip}</p>
          <p><strong>Due Date:</strong> ${dummyData.due_date}</p>
          <p><strong>Documents:</strong> ${dummyData.documents_count} document(s)</p>
        </div>
        <div class="info-box" style="border-left-color: #f59e0b;">
          <p><strong>Special Instructions:</strong></p>
          <p>${dummyData.special_instructions}</p>
        </div>
        <p style="text-align: center;"><a href="#" class="button">View Full Job Details</a></p>
      `;
      break;

    case 'job-attempt':
      contentHtml = `
        <h2>Service Attempt Update</h2>
        <p>Hello ${dummyData.client_name},</p>
        <p>A service attempt has been made for your job. Here are the details:</p>
        <div class="info-box">
          <p><strong>Case:</strong> ${dummyData.case_caption}</p>
          <p><strong>Case Number:</strong> ${dummyData.case_number}</p>
          <p><strong>Recipient:</strong> ${dummyData.recipient_name}</p>
        </div>
        <h3 style="color: #1e293b; font-size: 16px; margin: 24px 0 12px 0;">Attempt Details</h3>
        <div class="info-box">
          <p><strong>Date:</strong> ${dummyData.attempt_date}</p>
          <p><strong>Time:</strong> ${dummyData.attempt_time}</p>
          <p><strong>Status:</strong> <span class="status-accepted">SERVED</span></p>
          <p><strong>Address:</strong> ${dummyData.address_of_attempt}</p>
          <p><strong>GPS Location:</strong> ${dummyData.gps_lat}, ${dummyData.gps_lon} (±${dummyData.gps_accuracy}m)</p>
        </div>
        <h3 style="color: #1e293b; font-size: 16px; margin: 24px 0 12px 0;">Service Details</h3>
        <div class="info-box">
          <p><strong>Person Served:</strong> ${dummyData.person_served_name}</p>
          <p><strong>Description:</strong> ${dummyData.person_served_description}</p>
          <p><strong>Service Type:</strong> ${dummyData.service_type_detail}</p>
        </div>
        <h3 style="color: #1e293b; font-size: 16px; margin: 24px 0 12px 0;">Notes</h3>
        <div class="info-box">
          <p>${dummyData.notes}</p>
        </div>
        <h3 style="color: #1e293b; font-size: 16px; margin: 24px 0 12px 0;">Photos</h3>
        <table cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
          <tr>
            ${dummyData.photos.map(photo => `
              <td style="padding: 4px;">
                <img src="${photo.url}" alt="${photo.title}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;" />
              </td>
            `).join('')}
          </tr>
        </table>
        <p style="font-size: 12px; color: #64748b;">Click photos to view full size</p>
        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
          <strong>Process Server:</strong> ${dummyData.server_name}
        </p>
        <p style="text-align: center; margin-top: 24px;"><a href="#" class="button">View Full Job Details</a></p>
      `;
      break;

    default:
      contentHtml = '<p>Template preview not available.</p>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <div class="header">
            <p class="header-text">Sample Process Serving Company</p>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          ${footerHtml}
        </div>
      </div>
    </body>
    </html>
  `;
};

export default function EmailTemplatesPanel() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const openPreview = (template) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Billing': return 'bg-green-100 text-green-800';
      case 'Documents': return 'bg-blue-100 text-blue-800';
      case 'Job Sharing': return 'bg-purple-100 text-purple-800';
      case 'Partnerships': return 'bg-orange-100 text-orange-800';
      case 'Clients': return 'bg-pink-100 text-pink-800';
      case 'Internal': return 'bg-slate-100 text-slate-800';
      case 'Updates': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Templates</h2>
        <p className="text-slate-600">
          Preview all email templates with sample data. These templates are automatically branded with each company's settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EMAIL_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openPreview(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="secondary" className={`mt-1 ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-slate-500 mb-4">{template.description}</p>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Eye className="w-4 h-4" />
                  Preview Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTemplate && (
                <>
                  <Mail className="w-5 h-5" />
                  {selectedTemplate.name} Template Preview
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-slate-100 rounded-lg p-4">
            {selectedTemplate && (
              <iframe
                srcDoc={renderTemplate(selectedTemplate)}
                title={`${selectedTemplate.name} Preview`}
                className="w-full h-[600px] bg-white rounded border-0"
                sandbox="allow-same-origin"
              />
            )}
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-slate-500">
              This preview shows the template with sample data. The actual emails will include the company's branding settings (logo, colors, tagline, etc.).
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
