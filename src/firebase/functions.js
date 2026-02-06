import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

export class FirebaseFunctions {
  // Google Places search
  static async googlePlaces(params) {
    try {
      const googlePlacesAutocomplete = httpsCallable(functions, 'googlePlacesAutocomplete');
      const result = await googlePlacesAutocomplete(params);
      return result.data;
    } catch (error) {
      console.error('Google Places error:', error);
      // Return empty data on error
      return {
        data: {
          suggestions: []
        }
      };
    }
  }

  // Google Place Details
  static async googlePlaceDetails(params) {
    try {
      const googlePlaceDetails = httpsCallable(functions, 'googlePlaceDetails');
      const result = await googlePlaceDetails(params);
      return result.data;
    } catch (error) {
      console.error('Google Place Details error:', error);
      // Return empty data on error
      return {
        data: {
          address: {
            address1: '',
            address2: '',
            city: '',
            state: '',
            postal_code: '',
            county: ''
          }
        }
      };
    }
  }

  // Update shared job status
  static async updateSharedJobStatus(jobId, status) {
    try {
      const updateSharedJobStatus = httpsCallable(functions, 'updateSharedJobStatus');
      const result = await updateSharedJobStatus({ jobId, status });
      return result.data;
    } catch (error) {
      console.error('Update shared job status error:', error);
      // Mock response for development
      return { success: true, jobId, status };
    }
  }

  // Generate field sheet
  static async generateFieldSheet(jobData) {
    try {
      const generateFieldSheet = httpsCallable(functions, 'generateFieldSheet');
      const result = await generateFieldSheet(jobData);
      return result.data;
    } catch (error) {
      console.error('Generate field sheet error:', error);
      // Mock response for development
      return {
        success: true,
        url: 'mock://field-sheet.pdf',
        message: 'Field sheet generated (mock)'
      };
    }
  }

  // Generate affidavit
  static async generateAffidavit(jobData) {
    try {
      const generateAffidavit = httpsCallable(functions, 'generateAffidavit');
      const result = await generateAffidavit(jobData);
      return result.data;
    } catch (error) {
      console.error('Generate affidavit error:', error);
      // Re-throw the error so the frontend can handle it properly
      throw error;
    }
  }

  // Find directory companies
  static async findDirectoryCompanies(query) {
    try {
      const findDirectoryCompanies = httpsCallable(functions, 'findDirectoryCompanies');
      const result = await findDirectoryCompanies({ query });
      return result.data;
    } catch (error) {
      console.error('Find directory companies error:', error);
      // Mock response for development
      return [
        {
          id: 1,
          name: `${query} Mock Company`,
          address: '123 Mock Business Ave',
          phone: '(555) 123-4567'
        }
      ];
    }
  }

  // Merge PDFs
  static async mergePDFs(data) {
    try {
      const mergePDFs = httpsCallable(functions, 'mergePDFs');
      const result = await mergePDFs(data);
      return result.data;
    } catch (error) {
      console.error('Merge PDFs error:', error);
      throw error;
    }
  }

  // Send email
  static async sendEmail(to, subject, body, options = {}) {
    try {
      const sendEmail = httpsCallable(functions, 'sendEmail');
      const result = await sendEmail({
        to,
        subject,
        body,
        ...options
      });
      return result.data;
    } catch (error) {
      console.error('Send email error:', error);
      // Mock response for development
      console.log(`Mock email sent to ${to}: ${subject}`);
      return {
        success: true,
        message: 'Email sent (mock)'
      };
    }
  }

  // Invoke LLM
  static async invokeLLM(prompt) {
    try {
      const invokeLLM = httpsCallable(functions, 'invokeLLM');
      const result = await invokeLLM({ prompt });
      return result.data;
    } catch (error) {
      console.error('Invoke LLM error:', error);
      // Mock response for development
      return {
        success: true,
        response: `Mock LLM response to: ${prompt}`
      };
    }
  }

  // Generate image
  static async generateImage(prompt) {
    try {
      const generateImage = httpsCallable(functions, 'generateImage');
      const result = await generateImage({ prompt });
      return result.data;
    } catch (error) {
      console.error('Generate image error:', error);
      // Mock response for development
      return {
        success: true,
        url: 'mock://generated-image.png',
        message: `Generated image for: ${prompt}`
      };
    }
  }

  // Extract data from uploaded file
  static async extractDataFromUploadedFile(fileId, fileUrl) {
    try {
      const extractData = httpsCallable(functions, 'extractDataFromUploadedFile');
      const result = await extractData({ fileId, fileUrl });
      return result.data;
    } catch (error) {
      console.error('Extract data error:', error);
      // Mock response for development
      return {
        success: true,
        data: {
          text: 'Mock extracted text from file',
          metadata: { pages: 1, type: 'document' }
        }
      };
    }
  }

  // Extract document data using Google Document AI
  static async extractDocumentAI(params) {
    try {
      const extractDocumentAI = httpsCallable(functions, 'extractDocumentAI');
      // Support both old format (string URL) and new format (object with file_url or first_page_base64)
      const requestData = typeof params === 'string'
        ? { file_url: params }
        : params;
      const result = await extractDocumentAI(requestData);
      return result.data;
    } catch (error) {
      console.error('Extract document AI error:', error);
      throw error;
    }
  }

  // Extract document data using Claude Vision
  static async extractDocumentClaudeVision(params) {
    try {
      const extractDocumentClaudeVision = httpsCallable(functions, 'extractDocumentClaudeVision');
      // Support both old format (string URL) and new format (object with file_url or first_page_base64)
      const requestData = typeof params === 'string'
        ? { file_url: params }
        : params;
      const result = await extractDocumentClaudeVision(requestData);
      return result.data;
    } catch (error) {
      console.error('Extract document Claude Vision error:', error);
      throw error;
    }
  }

  // Extract document data using Claude Haiku (Fast & Cheap)
  static async extractDocumentClaudeHaiku(params) {
    try {
      const extractDocumentClaudeHaiku = httpsCallable(functions, 'extractDocumentClaudeHaiku');
      // Support both old format (string URL) and new format (object with file_url or first_page_base64)
      const requestData = typeof params === 'string'
        ? { file_url: params }
        : params;
      const result = await extractDocumentClaudeHaiku(requestData);
      return result.data;
    } catch (error) {
      console.error('Extract document Claude Haiku error:', error);
      throw error;
    }
  }

  // Find court address using AI (server-side)
  static async findCourtAddressWithAI(courtName) {
    try {
      const findCourtAddressWithAI = httpsCallable(functions, 'findCourtAddressWithAI');
      const result = await findCourtAddressWithAI({ courtName });
      return result.data;
    } catch (error) {
      console.error('Find court address with AI error:', error);
      throw error;
    }
  }

  // Sign external PDF
  static async signExternalPDF(data) {
    try {
      const signExternalPDF = httpsCallable(functions, 'signExternalPDF');
      const result = await signExternalPDF(data);
      return result.data;
    } catch (error) {
      console.error('Sign external PDF error:', error);
      throw error;
    }
  }

  // === Client Portal Functions ===

  // Invite a client user to the portal
  static async inviteClientUser(data) {
    try {
      const inviteClientUser = httpsCallable(functions, 'inviteClientUser');
      const result = await inviteClientUser(data);
      return result.data;
    } catch (error) {
      console.error('Invite client user error:', error);
      throw error;
    }
  }

  // Accept a client portal invitation
  static async acceptClientInvitation(token) {
    try {
      const acceptClientInvitation = httpsCallable(functions, 'acceptClientInvitation');
      const result = await acceptClientInvitation({ token });
      return result.data;
    } catch (error) {
      console.error('Accept client invitation error:', error);
      throw error;
    }
  }

  // Get public portal info by slug (no auth required)
  static async getPortalInfo(portalSlug) {
    try {
      const getPortalInfo = httpsCallable(functions, 'getPortalInfo');
      const result = await getPortalInfo({ portalSlug });
      return result.data;
    } catch (error) {
      console.error('Get portal info error:', error);
      throw error;
    }
  }

  // Self-register as a client portal user (creates company + user)
  static async selfRegisterClient(data) {
    try {
      const selfRegisterClientUser = httpsCallable(functions, 'selfRegisterClientUser');
      const result = await selfRegisterClientUser(data);
      return result.data;
    } catch (error) {
      console.error('Self register client error:', error);
      throw error;
    }
  }

  // Acknowledge a client registration notification
  static async acknowledgeClientRegistration(notificationId) {
    try {
      const acknowledgeClientRegistration = httpsCallable(functions, 'acknowledgeClientRegistration');
      const result = await acknowledgeClientRegistration({ notificationId });
      return result.data;
    } catch (error) {
      console.error('Acknowledge client registration error:', error);
      throw error;
    }
  }

  // Get client portal data for authenticated client user
  static async getClientPortalData() {
    try {
      const getClientPortalData = httpsCallable(functions, 'getClientPortalData');
      const result = await getClientPortalData({});
      return result.data;
    } catch (error) {
      console.error('Get client portal data error:', error);
      throw error;
    }
  }

  // Update client profile
  static async updateClientProfile(profileData) {
    try {
      const updateClientProfile = httpsCallable(functions, 'updateClientProfile');
      const result = await updateClientProfile(profileData);
      return result.data;
    } catch (error) {
      console.error('Update client profile error:', error);
      throw error;
    }
  }

  // Send attempt notification email to client
  static async sendAttemptNotification(attemptId, jobId, companyId) {
    try {
      const sendAttemptNotification = httpsCallable(functions, 'sendAttemptNotification');
      const result = await sendAttemptNotification({ attemptId, jobId, companyId });
      return result.data;
    } catch (error) {
      console.error('Send attempt notification error:', error);
      throw error;
    }
  }

  // Generate client portal preview for admin
  static async generateClientPortalPreview(clientCompanyId) {
    try {
      const generateClientPortalPreview = httpsCallable(functions, 'generateClientPortalPreview');
      const result = await generateClientPortalPreview({ client_company_id: clientCompanyId });
      return result.data;
    } catch (error) {
      console.error('Generate client portal preview error:', error);
      throw error;
    }
  }

  // Create a job from the client portal
  static async createClientJob(jobData) {
    try {
      const createClientJob = httpsCallable(functions, 'createClientJob');
      const result = await createClientJob(jobData);
      return result.data;
    } catch (error) {
      console.error('Create client job error:', error);
      throw error;
    }
  }

  // Send password reset email to a client user
  static async sendClientPasswordReset(data) {
    try {
      const sendClientPasswordReset = httpsCallable(functions, 'sendClientPasswordReset');
      const result = await sendClientPasswordReset(data);
      return result.data;
    } catch (error) {
      console.error('Send client password reset error:', error);
      throw error;
    }
  }

  // === Email Verification Functions ===

  // Send verification email to a new user
  static async sendVerificationEmail(userId, email, userName) {
    try {
      const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
      const result = await sendVerificationEmail({ userId, email, userName });
      return result.data;
    } catch (error) {
      console.error('Send verification email error:', error);
      throw error;
    }
  }

  // Verify email with token
  static async verifyEmail(token) {
    try {
      const verifyEmail = httpsCallable(functions, 'verifyEmail');
      const result = await verifyEmail({ token });
      return result.data;
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  }

  // Resend verification email
  static async resendVerificationEmail(userId, email, userName) {
    try {
      const resendVerificationEmail = httpsCallable(functions, 'resendVerificationEmail');
      const result = await resendVerificationEmail({ userId, email, userName });
      return result.data;
    } catch (error) {
      console.error('Resend verification email error:', error);
      throw error;
    }
  }

  // Share document with partner (affidavit sharing)
  static async shareDocumentWithPartner(data) {
    try {
      const shareDocumentWithPartner = httpsCallable(functions, 'shareDocumentWithPartner');
      const result = await shareDocumentWithPartner(data);
      return result.data;
    } catch (error) {
      console.error('Share document with partner error:', error);
      throw error;
    }
  }

  // Toggle visibility of an attempt or document in a shared job chain
  // Only the job owner can change visibility settings
  // @param {string} jobId - The job ID
  // @param {string} collectionType - "attempts" or "documents"
  // @param {string} itemId - The document ID of the item to update
  // @param {string[]} visibility - Array of targets: ["client"], ["server"], ["client", "server"], or []
  static async toggleVisibility(jobId, collectionType, itemId, visibility) {
    try {
      const toggleVisibility = httpsCallable(functions, 'toggleVisibility');
      const result = await toggleVisibility({ jobId, collectionType, itemId, visibility });
      return result.data;
    } catch (error) {
      console.error('Toggle visibility error:', error);
      throw error;
    }
  }

  // Report job status to the upstream client who shared the job
  // Sends an email update and optionally syncs status to the parent job
  // @param {string} jobId - The job ID
  // @param {Object} options - Options for the report
  // @param {boolean} options.includeAttempts - Include service attempts in report (default: true)
  // @param {boolean} options.includeAffidavit - Include affidavit link if available (default: true)
  // @param {boolean} options.includeInvoice - Include invoice info if available (default: false)
  // @param {boolean} options.syncToParent - Also update parent job status (default: true)
  // @param {string} options.customMessage - Optional custom message to include
  static async reportStatusToUpstream(jobId, options = {}) {
    try {
      const reportStatusToUpstream = httpsCallable(functions, 'reportStatusToUpstream');
      const result = await reportStatusToUpstream({
        jobId,
        includeAttempts: options.includeAttempts ?? true,
        includeAffidavit: options.includeAffidavit ?? true,
        includeInvoice: options.includeInvoice ?? false,
        syncToParent: options.syncToParent ?? true,
        customMessage: options.customMessage || '',
      });
      return result.data;
    } catch (error) {
      console.error('Report status to upstream error:', error);
      throw error;
    }
  }

  // Backfill partner client records from clients to companies collection
  static async backfillPartnerClients() {
    try {
      const backfillPartnerClients = httpsCallable(functions, 'backfillPartnerClients');
      const result = await backfillPartnerClients({});
      return result.data;
    } catch (error) {
      console.error('Backfill partner clients error:', error);
      throw error;
    }
  }

  // === Job Email Functions ===

  // Send job update email with selected content
  static async sendJobEmail(data) {
    try {
      const sendJobEmail = httpsCallable(functions, 'sendJobEmail');
      const result = await sendJobEmail(data);
      return result.data;
    } catch (error) {
      console.error('Send job email error:', error);
      throw error;
    }
  }

  // === Stripe Subscription Functions ===

  // Create subscription checkout session
  static async createSubscriptionCheckout(data) {
    try {
      const fn = httpsCallable(functions, 'createSubscriptionCheckout');
      const result = await fn(data);
      return result.data;
    } catch (error) {
      console.error('Create subscription checkout error:', error);
      throw error;
    }
  }

  // Create billing portal session
  static async createBillingPortalSession(data) {
    try {
      const fn = httpsCallable(functions, 'createBillingPortalSession');
      const result = await fn(data);
      return result.data;
    } catch (error) {
      console.error('Create billing portal session error:', error);
      throw error;
    }
  }

  // Sync pricing plans with Stripe (super admin only)
  static async syncPricingPlansWithStripe() {
    try {
      const fn = httpsCallable(functions, 'syncPricingPlansWithStripe');
      const result = await fn({});
      return result.data;
    } catch (error) {
      console.error('Sync pricing plans error:', error);
      throw error;
    }
  }

  // === Stripe Connect Functions ===

  // Create Connect onboarding link
  static async createConnectOnboarding(data) {
    try {
      const fn = httpsCallable(functions, 'createConnectOnboarding');
      const result = await fn(data);
      return result.data;
    } catch (error) {
      console.error('Create Connect onboarding error:', error);
      throw error;
    }
  }

  // Get Connect account status
  static async getConnectAccountStatus(data) {
    try {
      const fn = httpsCallable(functions, 'getConnectAccountStatus');
      const result = await fn(data);
      return result.data;
    } catch (error) {
      console.error('Get Connect account status error:', error);
      throw error;
    }
  }

  // Create Connect dashboard link
  static async createConnectDashboardLink(data) {
    try {
      const fn = httpsCallable(functions, 'createConnectDashboardLink');
      const result = await fn(data);
      return result.data;
    } catch (error) {
      console.error('Create Connect dashboard link error:', error);
      throw error;
    }
  }

  // === Stripe Invoice Payment Functions ===

  // Create invoice payment checkout session
  static async createInvoicePaymentCheckout(data) {
    try {
      const fn = httpsCallable(functions, 'createInvoicePaymentCheckout');
      const result = await fn(data);
      return result.data;
    } catch (error) {
      console.error('Create invoice payment checkout error:', error);
      throw error;
    }
  }

  // === Job Notes Functions ===

  // Create a job note with optional email notification
  // @param {string} jobId - The job ID
  // @param {string} content - The note content (max 5000 chars)
  // @param {string} visibility - 'client' | 'server' | 'both' | 'internal'
  // @param {boolean} sendEmail - Whether to send email notification
  static async createJobNote(jobId, content, visibility, sendEmail = false) {
    try {
      const fn = httpsCallable(functions, 'createJobNote');
      const result = await fn({ jobId, content, visibility, sendEmail });
      return result.data;
    } catch (error) {
      console.error('Create job note error:', error);
      throw error;
    }
  }
}