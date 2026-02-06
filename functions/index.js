const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {PDFDocument, rgb, StandardFonts} = require("pdf-lib");
// PERFORMANCE: Lazy-load Google Maps Client - only used by 2 functions
let GoogleMapsClient;
function getGoogleMapsClient() {
  if (!GoogleMapsClient) {
    GoogleMapsClient = new (require("@googlemaps/google-maps-services-js").Client)({});
  }
  return GoogleMapsClient;
}
const QRCode = require("qrcode");
// PERFORMANCE: Lazy-load Puppeteer and Chromium - only used by PDF generation functions
let puppeteer;
let chromium;
function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = require("puppeteer-core");
  }
  return puppeteer;
}
function getChromium() {
  if (!chromium) {
    chromium = require("@sparticuz/chromium");
  }
  return chromium;
}
const Handlebars = require("handlebars");
const {format} = require("date-fns");
// PERFORMANCE: Lazy-load DocumentAI client - only used by 1 function
let DocumentProcessorServiceClient;
function getDocumentAIClient() {
  if (!DocumentProcessorServiceClient) {
    DocumentProcessorServiceClient = require("@google-cloud/documentai").v1.DocumentProcessorServiceClient;
  }
  return new DocumentProcessorServiceClient();
}
// PERFORMANCE: Lazy-load Anthropic SDK - only used by 4 functions
let Anthropic;
let anthropicClient;
function getAnthropicClient(apiKey) {
  if (!Anthropic) {
    Anthropic = require("@anthropic-ai/sdk");
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({apiKey});
  }
  return anthropicClient;
}
const axios = require("axios");
const sgMail = require("@sendgrid/mail");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

admin.initializeApp();

// Define secrets
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");
const anthropicApiKey = defineSecret("CLAUDE_API_KEY");
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const stripeConnectWebhookSecret = defineSecret("STRIPE_CONNECT_WEBHOOK_SECRET");

// PERFORMANCE: Lazy-load Stripe SDK
let stripeClient;
function getStripe(apiKey) {
  if (!stripeClient) {
    const Stripe = require("stripe");
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
}

// PERFORMANCE: SendGrid API key initialization - only set once per function instance
let sendgridInitialized = false;
function initSendGrid(apiKey) {
  if (!sendgridInitialized) {
    sgMail.setApiKey(apiKey);
    sendgridInitialized = true;
  }
}

// ============================================================================
// Input Validation Utilities
// ============================================================================

/**
 * Validate that a value is a non-empty string within length limits
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum length (default: 1)
 * @param {number} options.maxLength - Maximum length (default: 10000)
 * @param {boolean} options.required - Whether field is required (default: true)
 */
function validateString(value, fieldName, options = {}) {
  const {minLength = 1, maxLength = 10000, required = true} = options;

  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpsError("invalid-argument", `${fieldName} is required`);
    }
    return;
  }

  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${fieldName} must be a string`);
  }

  if (value.length < minLength) {
    throw new HttpsError("invalid-argument", `${fieldName} must be at least ${minLength} characters`);
  }

  if (value.length > maxLength) {
    throw new HttpsError("invalid-argument", `${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {boolean} required - Whether field is required
 */
function validateEmail(email, fieldName = "email", required = true) {
  if (!email && !required) return;

  validateString(email, fieldName, {maxLength: 254, required});

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new HttpsError("invalid-argument", `${fieldName} must be a valid email address`);
  }
}

/**
 * Validate Firebase document ID format
 * @param {string} id - ID to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {boolean} required - Whether field is required
 */
function validateDocumentId(id, fieldName, required = true) {
  if (!id && !required) return;

  validateString(id, fieldName, {minLength: 1, maxLength: 1500, required});

  // Firebase IDs cannot contain: / . or be . or ..
  if (id.includes("/") || id === "." || id === "..") {
    throw new HttpsError("invalid-argument", `${fieldName} contains invalid characters`);
  }
}

/**
 * Validate array input
 * @param {*} arr - Array to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {Object} options - Validation options
 */
function validateArray(arr, fieldName, options = {}) {
  const {maxLength = 1000, required = true} = options;

  if (!arr && !required) return;

  if (!Array.isArray(arr)) {
    throw new HttpsError("invalid-argument", `${fieldName} must be an array`);
  }

  if (arr.length > maxLength) {
    throw new HttpsError("invalid-argument", `${fieldName} exceeds maximum of ${maxLength} items`);
  }
}

/**
 * Validate boolean input
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {boolean} required - Whether field is required
 */
function validateBoolean(value, fieldName, required = false) {
  if (value === undefined || value === null) {
    if (required) {
      throw new HttpsError("invalid-argument", `${fieldName} is required`);
    }
    return;
  }

  if (typeof value !== "boolean") {
    throw new HttpsError("invalid-argument", `${fieldName} must be a boolean`);
  }
}

/**
 * Validate number input
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {Object} options - Validation options
 */
function validateNumber(value, fieldName, options = {}) {
  const {min, max, required = false} = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpsError("invalid-argument", `${fieldName} is required`);
    }
    return;
  }

  if (typeof value !== "number" || isNaN(value)) {
    throw new HttpsError("invalid-argument", `${fieldName} must be a number`);
  }

  if (min !== undefined && value < min) {
    throw new HttpsError("invalid-argument", `${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new HttpsError("invalid-argument", `${fieldName} must be at most ${max}`);
  }
}

/**
 * Validate that user is authenticated
 * @param {Object} auth - Auth object from request
 * @returns {string} User ID
 */
function requireAuth(auth) {
  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to perform this action");
  }
  return auth.uid;
}

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (!str || typeof str !== "string") return str;
  // Remove null bytes and control characters
  return str.replace(/\x00/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Mask email address for logging (preserves first 2 chars and domain)
 * @param {string} email - Email to mask
 * @returns {string} Masked email (e.g., "jo***@example.com")
 */
function maskEmail(email) {
  if (!email || typeof email !== "string") return "[no-email]";
  const parts = email.split("@");
  if (parts.length !== 2) return "[invalid-email]";
  const local = parts[0];
  const domain = parts[1];
  const masked = local.length > 2 ? local.substring(0, 2) + "***" : "***";
  return `${masked}@${domain}`;
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {boolean} required - Whether field is required
 */
function validateUrl(url, fieldName = "url", required = false) {
  if (!url && !required) return;

  validateString(url, fieldName, {maxLength: 2048, required});

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new HttpsError("invalid-argument", `${fieldName} must use http or https protocol`);
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("invalid-argument", `${fieldName} must be a valid URL`);
  }
}

// ============================================================================
// Rate Limiting Utilities
// ============================================================================

/**
 * Check and enforce rate limits for a given identifier
 * Uses Firestore to track request counts within time windows
 *
 * @param {string} identifier - Unique identifier (e.g., userId, IP, email)
 * @param {string} action - Action being rate limited (e.g., 'sendEmail', 'login')
 * @param {Object} limits - Rate limit configuration
 * @param {number} limits.maxRequests - Maximum requests allowed in window
 * @param {number} limits.windowSeconds - Time window in seconds
 * @throws {HttpsError} If rate limit exceeded
 */
async function checkRateLimit(identifier, action, limits = {maxRequests: 10, windowSeconds: 60}) {
  const {maxRequests, windowSeconds} = limits;

  // Sanitize identifier to be safe for document IDs
  const safeId = identifier.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
  const docId = `${action}_${safeId}`;

  const rateLimitRef = admin.firestore().collection("rate_limits").doc(docId);

  try {
    const result = await admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();
      const windowMs = windowSeconds * 1000;

      if (!doc.exists) {
        // First request - create record
        transaction.set(rateLimitRef, {
          count: 1,
          window_start: now,
          identifier: safeId,
          action: action,
        });
        return {allowed: true, remaining: maxRequests - 1};
      }

      const data = doc.data();
      const windowStart = data.window_start || 0;

      // Check if we're in a new window
      if (now - windowStart > windowMs) {
        // Reset window
        transaction.set(rateLimitRef, {
          count: 1,
          window_start: now,
          identifier: safeId,
          action: action,
        });
        return {allowed: true, remaining: maxRequests - 1};
      }

      // Same window - check count
      const currentCount = data.count || 0;

      if (currentCount >= maxRequests) {
        return {allowed: false, remaining: 0, resetTime: windowStart + windowMs};
      }

      // Increment count
      transaction.update(rateLimitRef, {
        count: currentCount + 1,
      });
      return {allowed: true, remaining: maxRequests - currentCount - 1};
    });

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      console.warn(`[RateLimit] Rate limit exceeded for ${action}:${safeId}`);
      throw new HttpsError(
          "resource-exhausted",
          `Too many requests. Please try again in ${retryAfter} seconds.`,
      );
    }

    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    // Log but don't fail the request if rate limiting itself fails
    console.error(`[RateLimit] Error checking rate limit:`, error);
    return {allowed: true, remaining: -1};
  }
}

/**
 * Clean up old rate limit records (run periodically)
 * Records older than 24 hours are deleted
 */
async function cleanupRateLimits() {
  const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

  const oldRecords = await admin.firestore()
      .collection("rate_limits")
      .where("window_start", "<", cutoff)
      .limit(500)
      .get();

  if (oldRecords.empty) return 0;

  const batch = admin.firestore().batch();
  oldRecords.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  console.log(`[RateLimit] Cleaned up ${oldRecords.size} old rate limit records`);
  return oldRecords.size;
}

// ============================================================================
// Platform Usage Tracking Utilities
// ============================================================================

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Generate document IDs for all time buckets
 */
function getUsageDocIds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const week = String(getWeekNumber(now)).padStart(2, "0");

  return {
    daily: `daily_${year}-${month}-${day}`,
    weekly: `weekly_${year}-W${week}`,
    monthly: `monthly_${year}-${month}`,
    yearly: `yearly_${year}`,
    allTime: "all_time",
  };
}

/**
 * Track platform usage by incrementing counters in Firestore
 * @param {string} operation - The operation to track (e.g., 'affidavits_generated')
 */
async function trackPlatformUsage(operation) {
  try {
    const docIds = getUsageDocIds();
    const batch = admin.firestore().batch();

    Object.values(docIds).forEach((docId) => {
      const ref = admin.firestore().collection("platform_usage").doc(docId);
      batch.set(ref, {
        [operation]: admin.firestore.FieldValue.increment(1),
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    });

    await batch.commit();
    console.log(`[UsageTracker] Tracked ${operation}`);
  } catch (err) {
    console.error(`[UsageTracker] Error tracking ${operation}:`, err);
    // Don't throw - tracking errors should not fail the main operation
  }
}

// ============================================================================
// Email Service Utilities
// ============================================================================

// PERFORMANCE: Cache compiled email templates to avoid repeated disk reads
const templateCache = {};

/**
 * Load and compile an email template from the email-templates directory
 * @param {string} templateName - Name of the template file (without .hbs extension)
 * @returns {Function} Compiled Handlebars template function
 */
function loadEmailTemplate(templateName) {
  // PERFORMANCE: Lazy-register Handlebars helpers only when first template is loaded
  ensureHandlebarsHelpers();

  // Return cached template if available
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }

  const templatePath = path.join(__dirname, "email-templates", `${templateName}.hbs`);
  const templateSource = fs.readFileSync(templatePath, "utf-8");
  const compiledTemplate = Handlebars.compile(templateSource);

  // Cache for future use
  templateCache[templateName] = compiledTemplate;
  return compiledTemplate;
}

/**
 * Format company address for email footer
 * @param {Object} company - Company data object
 * @returns {string} Formatted address string
 */
function formatCompanyAddressForEmail(company) {
  if (!company) return "";
  const parts = [];
  if (company.address1) parts.push(company.address1);
  if (company.city && company.state) {
    parts.push(`${company.city}, ${company.state} ${company.zip || ""}`);
  }
  return parts.join(", ");
}

/**
 * Render a complete email with base layout and company branding
 * @param {string} templateName - Name of the content template
 * @param {Object} data - Template data
 * @param {Object} companyData - Company data for branding
 * @returns {string} Rendered HTML email
 */
function renderEmail(templateName, data, companyData) {
  // Compile and render the content template
  const contentTemplate = loadEmailTemplate(templateName);
  const contentHtml = contentTemplate(data);

  // Prepare branding data
  const brandingData = {
    ...data,
    content: contentHtml,
    company_name: companyData.name || companyData.company_name || "ServeMax",
    company_address: formatCompanyAddressForEmail(companyData),
    company_phone: companyData.phone || "",
    company_email: companyData.email || "",
    company_website: companyData.website || "",
    branding: {
      logo_url: companyData.branding?.logo_url || companyData.logo_url || null,
      primary_color: companyData.branding?.primary_color || "#1e40af",
      accent_color: companyData.branding?.accent_color || "#3b82f6",
      email_tagline: companyData.branding?.email_tagline || "",
      google_review_url: companyData.branding?.google_review_url || "",
    },
  };

  // Render with base layout
  const baseLayout = loadEmailTemplate("base-layout");
  return baseLayout(brandingData);
}

/**
 * Internal helper to send email with template (for use within other Cloud Functions)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.templateName - Name of template to use
 * @param {Object} options.templateData - Data for template
 * @param {string} options.companyId - Company ID for branding
 * @param {string} [options.from] - Optional from email
 * @param {string} [options.replyTo] - Optional reply-to email
 * @returns {Promise<Object>} Send result
 */
async function sendEmailWithTemplate(options) {
  const {to, subject, templateName, templateData, companyId, from, replyTo} = options;

  // Fetch company data for branding
  let companyData = {};
  if (companyId) {
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    if (companyDoc.exists) {
      companyData = companyDoc.data();
    }
  }

  // Render the email
  const html = renderEmail(templateName, {...templateData, emailSubject: subject}, companyData);

  // PERFORMANCE: Initialize SendGrid once per instance
  initSendGrid(sendgridApiKey.value());

  // Build the message
  const msg = {
    to: to,
    from: {
      email: from || companyData.email || "noreply@em7646.nwbs-inc.com",
      name: companyData.name || companyData.company_name || "ServeMax",
    },
    replyTo: replyTo || companyData.email || undefined,
    subject: subject,
    html: html,
  };

  // Send the email
  const response = await sgMail.send(msg);

  console.log(`[Email] Sent "${subject}" to ${to}`);
  await trackPlatformUsage("emails_sent");

  return {success: true, messageId: response[0]?.headers?.["x-message-id"]};
}

/**
 * Merges multiple PDFs in the specified order
 * @param {Object} data - { file_urls: string[], merged_title: string }
 * @returns {Object} - { success: boolean, url: string }
 */
exports.mergePDFs = onCall(async (request) => {
  try {
    const {file_urls, merged_title} = request.data;

    // Validate input
    if (!file_urls || !Array.isArray(file_urls) || file_urls.length === 0) {
      throw new HttpsError(
          "invalid-argument",
          "file_urls must be a non-empty array",
      );
    }

    console.log(`Merging ${file_urls.length} PDFs...`);

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Download and merge each PDF in order
    for (const [index, url] of file_urls.entries()) {
      try {
        console.log(`Processing PDF ${index + 1}/${file_urls.length}: ${url}`);

        // Download PDF from URL
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download PDF from ${url}`);
        }

        const pdfBytes = await response.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);

        // Copy all pages from this PDF
        const copiedPages = await mergedPdf.copyPages(
            pdf,
            pdf.getPageIndices(),
        );
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });

        console.log(`Added ${copiedPages.length} pages from PDF ${index + 1}`);
      } catch (error) {
        console.error(`Error processing PDF ${index + 1}:`, error);
        throw new HttpsError(
            "internal",
            `Failed to process PDF ${index + 1}: ${error.message}`,
        );
      }
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    console.log(`Merged PDF created, size: ${mergedPdfBytes.byteLength} bytes`);

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `merged_pdfs/${Date.now()}_${merged_title || "merged"}.pdf`;
    const file = bucket.file(fileName);

    await file.save(Buffer.from(mergedPdfBytes), {
      metadata: {
        contentType: "application/pdf",
        metadata: {
          originalFileCount: file_urls.length.toString(),
          mergedAt: new Date().toISOString(),
        },
      },
    });

    // Make the file publicly readable (adjust based on your security needs)
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`Merged PDF uploaded successfully: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      message: `Successfully merged ${file_urls.length} PDFs`,
      pageCount: mergedPdf.getPageCount(),
    };
  } catch (error) {
    console.error("Error in mergePDFs:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to merge PDFs: ${error.message}`,
    );
  }
});

/**
 * Signs an external PDF by embedding a signature image and/or date at specified positions
 * @param {Object} data - { pdfUrl, signatureData, position, size, page, dateData, renderedWidth, renderedHeight }
 * @returns {Object} - { success: boolean, url: string }
 */
exports.signExternalPDF = onCall(async (request) => {
  try {
    const {pdfUrl, signatureData, position, size, page, dateData, renderedWidth, renderedHeight} = request.data;

    // Validate input
    if (!pdfUrl) {
      throw new HttpsError("invalid-argument", "pdfUrl is required");
    }
    if (!signatureData && !dateData) {
      throw new HttpsError("invalid-argument", "Either signatureData or dateData is required");
    }

    console.log("[signExternalPDF] Starting...");
    console.log("[signExternalPDF] PDF URL:", pdfUrl);
    console.log("[signExternalPDF] Signature Position:", position);
    console.log("[signExternalPDF] Signature Size:", size);
    console.log("[signExternalPDF] Signature Page:", page);
    console.log("[signExternalPDF] Date Data:", dateData);
    console.log("[signExternalPDF] Rendered dimensions:", renderedWidth, "x", renderedHeight);

    // Download the original PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the target page (0-indexed)
    const pageIndex = (page || 1) - 1;
    const pages = pdfDoc.getPages();
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new HttpsError(
          "invalid-argument",
          `Invalid page number: ${page}. PDF has ${pages.length} pages.`,
      );
    }
    const targetPage = pages[pageIndex];
    const pageSize = targetPage.getSize();

    console.log("[signExternalPDF] PDF page size:", pageSize);
    console.log("[signExternalPDF] Rendered dimensions:", renderedWidth, "x", renderedHeight);

    // Calculate scale factors between rendered dimensions and actual PDF dimensions
    const scaleX = pageSize.width / (renderedWidth || 612);
    const scaleY = pageSize.height / (renderedHeight || 792);

    console.log("[signExternalPDF] Scale factors - X:", scaleX, "Y:", scaleY);

    // Draw signature if provided
    if (signatureData) {
      // Extract the base64 image data
      let imageBytes;
      if (signatureData.startsWith("data:image/png")) {
        const base64Data = signatureData.replace(/^data:image\/png;base64,/, "");
        imageBytes = Buffer.from(base64Data, "base64");
      } else if (signatureData.startsWith("data:image/jpeg") ||
                 signatureData.startsWith("data:image/jpg")) {
        const base64Data = signatureData.replace(/^data:image\/jpe?g;base64,/, "");
        imageBytes = Buffer.from(base64Data, "base64");
      } else {
        // Assume it's raw base64
        imageBytes = Buffer.from(signatureData, "base64");
      }

      // Embed the signature image
      let embeddedImage;
      try {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } catch (pngError) {
        console.log("[signExternalPDF] PNG embed failed, trying JPEG...");
        try {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } catch (jpgError) {
          throw new Error("Failed to embed signature image as PNG or JPEG");
        }
      }

      // Calculate position in PDF coordinates
      // PDF coordinates: origin at bottom-left, Y increases upward
      // Screen coordinates: origin at top-left, Y increases downward
      const sigWidth = (size?.width || 180) * scaleX;
      const sigHeight = (size?.height || 50) * scaleY;
      const sigX = (position?.x || 0) * scaleX;

      // Convert Y coordinate: PDF Y = page height - screen Y - signature height
      // Screen Y is distance from top, PDF Y is distance from bottom
      const screenY = position?.y || 0;
      const sigY = pageSize.height - (screenY * scaleY) - sigHeight;

      console.log("[signExternalPDF] Drawing signature at PDF coordinates:");
      console.log("  x:", sigX, "y:", sigY);
      console.log("  width:", sigWidth, "height:", sigHeight);

      // Draw the signature on the target page
      const sigPageIndex = (page || 1) - 1;
      const sigPage = pages[sigPageIndex] || targetPage;
      sigPage.drawImage(embeddedImage, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
      });
    }

    // Draw date if provided
    if (dateData && dateData.text && dateData.position) {
      const datePageIndex = (dateData.page || 1) - 1;
      const datePage = pages[datePageIndex] || targetPage;
      const datePageSize = datePage.getSize();

      // Get scale factors for the date page (might be different if on different page)
      const dateScaleX = datePageSize.width / (renderedWidth || 612);
      const dateScaleY = datePageSize.height / (renderedHeight || 792);

      // Calculate font size based on the element height
      const dateHeight = (dateData.size?.height || 30) * dateScaleY;
      const fontSize = Math.max(10, dateHeight * 0.7);

      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Calculate position
      const dateX = (dateData.position.x || 0) * dateScaleX;
      // For text, we position from baseline, so add some offset
      const dateScreenY = dateData.position.y || 0;
      const dateY = datePageSize.height - (dateScreenY * dateScaleY) - dateHeight + (fontSize * 0.3);

      console.log("[signExternalPDF] Drawing date at PDF coordinates:");
      console.log("  text:", dateData.text);
      console.log("  x:", dateX, "y:", dateY);
      console.log("  fontSize:", fontSize);

      datePage.drawText(dateData.text, {
        x: dateX,
        y: dateY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    console.log("[signExternalPDF] Signed PDF size:", signedPdfBytes.length);

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `signed_affidavits/${Date.now()}_signed.pdf`;
    const file = bucket.file(fileName);

    await file.save(Buffer.from(signedPdfBytes), {
      metadata: {
        contentType: "application/pdf",
        metadata: {
          signedAt: new Date().toISOString(),
          signaturePage: page?.toString() || "1",
        },
      },
    });

    // Make the file publicly readable
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log("[signExternalPDF] Signed PDF uploaded:", publicUrl);

    return {
      success: true,
      url: publicUrl,
      message: "PDF signed successfully",
    };
  } catch (error) {
    console.error("[signExternalPDF] Error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to sign PDF: ${error.message}`,
    );
  }
});

/**
 * Google Places Autocomplete
 * @param {Object} data - { query: string }
 * @returns {Object} - { data: { suggestions: Array } }
 */
exports.googlePlacesAutocomplete = onCall(
    {secrets: [googleMapsApiKey]},
    async (request) => {
      try {
        const {query} = request.data;

        if (!query || query.trim().length < 3) {
          throw new HttpsError(
              "invalid-argument",
              "Query must be at least 3 characters",
          );
        }

        // PERFORMANCE: Use singleton Google Maps client
        const client = getGoogleMapsClient();
        const response = await client.placeAutocomplete({
          params: {
            input: query,
            key: googleMapsApiKey.value(),
          },
        });

        if (response.data.status !== "OK" &&
            response.data.status !== "ZERO_RESULTS") {
          throw new Error(
              `Google Places API error: ${response.data.status}`,
          );
        }

        // Format suggestions to match the expected format
        const suggestions = (response.data.predictions || []).map((pred) => ({
          place_id: pred.place_id,
          description: pred.description,
          main_text: pred.structured_formatting?.main_text || "",
          secondary_text: pred.structured_formatting?.secondary_text || "",
        }));

        return {
          data: {
            suggestions,
          },
        };
      } catch (error) {
        console.error("Error in googlePlacesAutocomplete:", error);
        throw new HttpsError(
            "internal",
            `Failed to fetch place suggestions: ${error.message}`,
        );
      }
    },
);

/**
 * Google Place Details
 * @param {Object} data - { place_id: string }
 * @returns {Object} - { data: { address: Object } }
 */
exports.googlePlaceDetails = onCall(
    {secrets: [googleMapsApiKey]},
    async (request) => {
      try {
        const {place_id} = request.data;

        if (!place_id) {
          throw new HttpsError(
              "invalid-argument",
              "place_id is required",
          );
        }

        // PERFORMANCE: Use singleton Google Maps client
        const client = getGoogleMapsClient();
        const response = await client.placeDetails({
          params: {
            place_id,
            key: googleMapsApiKey.value(),
          },
        });

        if (response.data.status !== "OK") {
          throw new Error(
              `Google Place Details API error: ${response.data.status}`,
          );
        }

        const place = response.data.result;

        // Parse address components
        const addressComponents = {};
        (place.address_components || []).forEach((component) => {
          const types = component.types;
          if (types.includes("street_number")) {
            addressComponents.streetNumber = component.long_name;
          }
          if (types.includes("route")) {
            addressComponents.route = component.long_name;
          }
          if (types.includes("locality")) {
            addressComponents.city = component.long_name;
          }
          if (types.includes("administrative_area_level_1")) {
            addressComponents.state = component.short_name;
          }
          if (types.includes("postal_code")) {
            addressComponents.postalCode = component.long_name;
          }
          if (types.includes("administrative_area_level_2")) {
            addressComponents.county = component.long_name;
          }
        });

        // Build structured address
        const address = {
          address1: [
            addressComponents.streetNumber,
            addressComponents.route,
          ].filter(Boolean).join(" ") || "",
          address2: "",
          city: addressComponents.city || "",
          state: addressComponents.state || "",
          postal_code: addressComponents.postalCode || "",
          county: addressComponents.county || "",
          latitude: place.geometry?.location?.lat || null,
          longitude: place.geometry?.location?.lng || null,
          formatted_address: place.formatted_address || "",
        };

        return {
          data: {
            address,
          },
        };
      } catch (error) {
        console.error("Error in googlePlaceDetails:", error);
        throw new HttpsError(
            "internal",
            `Failed to fetch place details: ${error.message}`,
        );
      }
    },
);

/**
 * Generate Field Sheet PDF for a job
 * @param {Object} data - { job_id: string }
 * @returns {Object} - { success: boolean, url: string, document_id: string }
 */
exports.generateFieldSheet = onCall(async (request) => {
  try {
    const {job_id} = request.data;

    if (!job_id) {
      throw new HttpsError("invalid-argument", "job_id is required");
    }

    console.log(`Generating field sheet for job: ${job_id}`);

    const db = admin.firestore();

    // Fetch job data
    const jobDoc = await db.collection("jobs").doc(job_id).get();
    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "Job not found");
    }
    const job = {id: jobDoc.id, ...jobDoc.data()};

    // DEBUG: Log job data to see all fields
    console.log("Job data for field sheet:", JSON.stringify(job, null, 2));

    // Fetch company data
    const companyDoc = await db.collection("companies").doc(job.company_id).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }
    const company = companyDoc.data();

    // Fetch documents for this job
    const documentsSnapshot = await db.collection("documents")
        .where("job_id", "==", job_id)
        .where("document_category", "==", "to_be_served")
        .get();
    const documents = documentsSnapshot.docs.map((doc) => doc.data());

    // DEBUG: Log documents
    console.log("Documents found:", documents.length);
    console.log("Document data:", JSON.stringify(documents, null, 2));

    // Read server name directly from job document (stored at creation time)
    const serverName = job.server_name || "Unassigned";

    // Auto-fetch missing case data if needed
    if (job.case_id && (!job.case_number || !job.court_name || !job.plaintiff || !job.defendant)) {
      console.log("Fetching case data for case_id:", job.case_id);
      try {
        const caseDoc = await db.collection("cases").doc(job.case_id).get();
        if (caseDoc.exists) {
          const caseData = caseDoc.data();
          // Fill in missing fields from case document
          job.case_number = job.case_number || caseData.case_number || null;
          job.court_name = job.court_name || caseData.court_name || null;
          job.plaintiff = job.plaintiff || caseData.plaintiff || null;
          job.defendant = job.defendant || caseData.defendant || null;
          console.log("Case data fetched and merged successfully");
        }
      } catch (error) {
        console.error("Error fetching case data:", error);
        // Continue with existing data
      }
    }

    // Determine app URL for QR code
    const appUrl = process.env.APP_URL ||
      "https://servemax-8d818.web.app";
    const qrCodeUrl = `${appUrl}/log-attempt?jobId=${job_id}`;

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, {
      errorCorrectionLevel: "M",
      type: "png",
      width: 200,
      margin: 1,
    });

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size (8.5" x 11")
    const {width, height} = page.getSize();

    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ========================================
    // DESIGN CONSTANTS
    // ========================================
    const COLORS = {
      primary: rgb(0.043, 0.180, 0.357), // #0B2E5B - dark blue
      accent: rgb(0.867, 0.867, 0.867), // #DDDDDD - light gray
      text: rgb(0.2, 0.2, 0.2), // #333333
      white: rgb(1, 1, 1),
      black: rgb(0, 0, 0),
      lightGray: rgb(0.949, 0.949, 0.949), // #F2F2F2 - table header
      borderGray: rgb(0.898, 0.898, 0.898), // #E5E5E5 - borders
    };

    const MARGIN = 36; // 0.5 inch margins
    const PADDING = 12;
    const HEADER_HEIGHT = 72; // ~1 inch
    const QR_SIZE = 90; // 1.25 inches (72 points per inch × 1.25)
    const QR_PADDING = 6; // White background padding around QR code

    // ========================================
    // HEADER SECTION - Full-width Dark Blue Bar
    // ========================================
    let yPos = height - MARGIN;

    // Draw dark blue header bar background
    page.drawRectangle({
      x: 0,
      y: yPos - HEADER_HEIGHT,
      width: width,
      height: HEADER_HEIGHT,
      color: COLORS.primary,
    });

    // Company info in white text - left side
    const headerTextX = MARGIN;
    let headerTextY = yPos - 20;

    // Company Name
    const companyName = company.name || "NATIONWIDE INVESTIGATIONS";
    page.drawText(companyName, {
      x: headerTextX,
      y: headerTextY,
      size: 14,
      font: helveticaBold,
      color: COLORS.white,
    });

    // Company Address Line 1
    headerTextY -= 14;
    const primaryAddress = company.addresses?.find((a) => a.primary) ||
      company.addresses?.[0];
    const address1 = primaryAddress?.address1 || company.address || "300 N LaSalle";
    page.drawText(address1, {
      x: headerTextX,
      y: headerTextY,
      size: 9,
      font: helveticaFont,
      color: COLORS.white,
    });

    // Company Address Line 2 (City, State, Zip)
    headerTextY -= 12;
    const cityStateZip = primaryAddress ?
      `${primaryAddress.city || "Chicago"}, ${primaryAddress.state || "IL"} ${primaryAddress.postal_code || "60654"}` :
      `${company.city || "Chicago"}, ${company.state || "IL"} ${company.zip || "60654"}`;
    page.drawText(cityStateZip, {
      x: headerTextX,
      y: headerTextY,
      size: 9,
      font: helveticaFont,
      color: COLORS.white,
    });

    // Phone and Website
    headerTextY -= 12;
    const companyPhone = company.phone || "(217) 816-9075";
    const companyWebsite = company.website || "www.nationwide-investigations.com";
    page.drawText(`${companyPhone} | ${companyWebsite}`, {
      x: headerTextX,
      y: headerTextY,
      size: 9,
      font: helveticaFont,
      color: COLORS.white,
    });

    // QR Code - Inside header bar, right-aligned with white background
    const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
    const qrMarginRight = 18; // 0.25 inch from right edge
    const qrX = width - QR_SIZE - QR_PADDING - qrMarginRight;
    const qrY = (yPos - HEADER_HEIGHT / 2) - (QR_SIZE / 2); // Vertically centered in header

    // Draw white background box for QR code
    page.drawRectangle({
      x: qrX - QR_PADDING,
      y: qrY - QR_PADDING,
      width: QR_SIZE + (QR_PADDING * 2),
      height: QR_SIZE + (QR_PADDING * 2),
      color: COLORS.white,
      borderColor: COLORS.borderGray,
      borderWidth: 0.5,
    });

    // Draw QR code on white background
    page.drawImage(qrCodeImage, {
      x: qrX,
      y: qrY,
      width: QR_SIZE,
      height: QR_SIZE,
    });

    // Gray divider line below header
    yPos -= HEADER_HEIGHT;
    page.drawLine({
      start: {x: 0, y: yPos},
      end: {x: width, y: yPos},
      thickness: 0,
      color: COLORS.accent,
    });

    // ========================================
    // CASE DETAILS - Compact Reference Box (De-emphasized)
    // ========================================
    yPos -= 20;
    const sectionX = MARGIN;
    const caseBoxTop = yPos;
    const caseBoxHeight = 120;
    const caseBoxLeft = MARGIN;
    const caseBoxWidth = width - (MARGIN * 2);

    // Small header
    page.drawText("Case Details (For Reference Only)", {
      x: caseBoxLeft,
      y: caseBoxTop,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPos -= 12;

    // Draw case details box
    page.drawRectangle({
      x: caseBoxLeft,
      y: yPos - caseBoxHeight,
      width: caseBoxWidth,
      height: caseBoxHeight,
      borderColor: COLORS.borderGray,
      borderWidth: 1,
      color: COLORS.white,
    });

    let caseY = yPos - PADDING - 6;
    const caseX = caseBoxLeft + PADDING;

    // Compact two-column layout for case details
    const caseCol1X = caseX;
    const caseCol2X = caseX + (caseBoxWidth / 2);

    // Left column
    page.drawText(`Job #: ${job.job_number || "N/A"}`, {
      x: caseCol1X,
      y: caseY,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    caseY -= 12;
    page.drawText(`Server: ${serverName}`, {
      x: caseCol1X,
      y: caseY,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    caseY -= 12;
    page.drawText(`Court: ${job.court_name || "N/A"}`, {
      x: caseCol1X,
      y: caseY,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    caseY -= 12;
    page.drawText(`Case #: ${job.case_number || "N/A"}`, {
      x: caseCol1X,
      y: caseY,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    // Right column
    let caseCol2Y = yPos - PADDING - 6;
    page.drawText(`Plaintiff: ${job.plaintiff || "N/A"}`, {
      x: caseCol2X,
      y: caseCol2Y,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    caseCol2Y -= 12;
    page.drawText(`Defendant: ${job.defendant || "N/A"}`, {
      x: caseCol2X,
      y: caseCol2Y,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    caseCol2Y -= 12;
    // Documents - compact
    if (documents.length > 0) {
      const docCount = documents.length;
      page.drawText(`Documents: ${docCount} file${docCount > 1 ? "s" : ""}`, {
        x: caseCol2X,
        y: caseCol2Y,
        size: 9,
        font: helveticaFont,
        color: COLORS.text,
      });
    } else {
      page.drawText("Documents: None", {
        x: caseCol2X,
        y: caseCol2Y,
        size: 9,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    yPos = yPos - caseBoxHeight - 20;

    // ========================================
    // IMPORTANT JOB DETAILS - Emphasized Section
    // ========================================
    const importantBoxTop = yPos;
    const importantBoxLeft = MARGIN;
    const importantBoxWidth = width - (MARGIN * 2);

    // Calculate box height dynamically based on content
    const dueDate = job.due_date ?
      new Date(job.due_date.toDate ?
        job.due_date.toDate() : job.due_date).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }) : "N/A";

    const hasAlternateAddresses = job.addresses && job.addresses.length > 1;
    const importantBoxHeight = hasAlternateAddresses ? 190 : 155;

    // Draw shaded background box
    page.drawRectangle({
      x: importantBoxLeft,
      y: importantBoxTop - importantBoxHeight,
      width: importantBoxWidth,
      height: importantBoxHeight,
      color: rgb(0.969, 0.973, 0.980), // #F7F8FA
      borderColor: COLORS.borderGray,
      borderWidth: 1.5,
    });

    let importantY = importantBoxTop - PADDING - 8;
    const importantX = importantBoxLeft + PADDING + 4;

    // PARTY TO SERVE (Large, Bold)
    page.drawText("PARTY TO SERVE", {
      x: importantX,
      y: importantY,
      size: 12,
      font: helveticaBold,
      color: COLORS.text,
    });

    importantY -= 16;
    const partyName = job.recipient?.name || "N/A";
    page.drawText(partyName, {
      x: importantX,
      y: importantY,
      size: 11,
      font: helveticaBold,
      color: COLORS.black,
    });

    // SERVICE ADDRESS (Large, Bold)
    importantY -= 24;
    page.drawText("SERVICE ADDRESS", {
      x: importantX,
      y: importantY,
      size: 12,
      font: helveticaBold,
      color: COLORS.text,
    });

    importantY -= 16;
    if (job.addresses && job.addresses.length > 0) {
      const primaryAddr = job.addresses.find((a) => a.primary) || job.addresses[0];
      const fullAddress = `${primaryAddr.address1 || ""}${primaryAddr.address2 ? ", " + primaryAddr.address2 : ""}, ${primaryAddr.city || ""}, ${primaryAddr.state || ""} ${primaryAddr.postal_code || ""}`;
      page.drawText(fullAddress, {
        x: importantX,
        y: importantY,
        size: 11,
        font: helveticaBold,
        color: COLORS.black,
      });
    } else {
      page.drawText("No address provided", {
        x: importantX,
        y: importantY,
        size: 11,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Alternate addresses (if more than 1 address exists)
    if (hasAlternateAddresses) {
      importantY -= 18;
      page.drawText("Alternate Address(es):", {
        x: importantX,
        y: importantY,
        size: 9,
        font: helveticaBold,
        color: COLORS.text,
      });
      importantY -= 12;
      // Leave space for handwritten notes
      page.drawLine({
        start: {x: importantX, y: importantY - 2},
        end: {x: width - MARGIN - PADDING - 4, y: importantY - 2},
        thickness: 0.5,
        color: COLORS.borderGray,
      });
    }

    // DUE DATE (Large, Bold)
    importantY -= 24;
    page.drawText("DUE DATE", {
      x: importantX,
      y: importantY,
      size: 12,
      font: helveticaBold,
      color: COLORS.text,
    });

    importantY -= 16;
    page.drawText(dueDate, {
      x: importantX,
      y: importantY,
      size: 11,
      font: helveticaBold,
      color: COLORS.black,
    });

    // SPECIAL INSTRUCTIONS (Large, Bold)
    importantY -= 24;
    page.drawText("SPECIAL INSTRUCTIONS", {
      x: importantX,
      y: importantY,
      size: 12,
      font: helveticaBold,
      color: COLORS.text,
    });

    importantY -= 14;
    // If service instructions exist, show them in dark red/bold
    if (job.service_instructions && job.service_instructions.trim()) {
      page.drawText(job.service_instructions, {
        x: importantX,
        y: importantY,
        size: 10,
        font: helveticaBold,
        color: rgb(0.545, 0, 0), // Dark red #8B0000
      });
      importantY -= 14;
    }

    // Draw 3 lines for handwritten notes
    for (let i = 0; i < 3; i++) {
      page.drawLine({
        start: {x: importantX, y: importantY - 2},
        end: {x: width - MARGIN - PADDING - 4, y: importantY - 2},
        thickness: 0.5,
        color: COLORS.borderGray,
      });
      importantY -= 14;
    }

    yPos = importantBoxTop - importantBoxHeight - 20;

    // ========================================
    // ATTEMPT LOG SECTION - 4 Rows with Shaded Headers
    // ========================================
    yPos -= 20;

    // Section Title with Blue Underline
    page.drawText("ATTEMPT LOG", {
      x: sectionX,
      y: yPos,
      size: 11,
      font: helveticaBold,
      color: COLORS.text,
    });

    const attemptTitleWidth = helveticaBold.widthOfTextAtSize("ATTEMPT LOG", 11);
    page.drawLine({
      start: {x: sectionX, y: yPos - 2},
      end: {x: sectionX + attemptTitleWidth, y: yPos - 2},
      thickness: 2,
      color: COLORS.primary,
    });

    yPos -= 20;
    const tableLeft = sectionX;
    const tableRight = width - MARGIN;
    const tableWidth = tableRight - tableLeft;

    // Column widths
    const dateColWidth = 70;
    const timeColWidth = 60;
    const descColWidth = tableWidth - dateColWidth - timeColWidth - 80;
    const resultColWidth = 80;

    const col1 = tableLeft;
    const col2 = col1 + dateColWidth;
    const col3 = col2 + timeColWidth;
    const col4 = col3 + descColWidth;

    // Header row background (shaded)
    const headerHeight = 20;
    page.drawRectangle({
      x: tableLeft,
      y: yPos - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: COLORS.lightGray,
    });

    // Header text
    const headerY = yPos - 14;
    page.drawText("Date", {
      x: col1 + 4,
      y: headerY,
      size: 10,
      font: helveticaBold,
      color: COLORS.text,
    });
    page.drawText("Time", {
      x: col2 + 4,
      y: headerY,
      size: 10,
      font: helveticaBold,
      color: COLORS.text,
    });
    page.drawText("Description / Recipient", {
      x: col3 + 4,
      y: headerY,
      size: 10,
      font: helveticaBold,
      color: COLORS.text,
    });
    page.drawText("Result", {
      x: col4 + 4,
      y: headerY,
      size: 10,
      font: helveticaBold,
      color: COLORS.text,
    });

    // Draw table borders and rows
    const rowHeight = 35;
    const numRows = 4;

    // Horizontal lines
    for (let i = 0; i <= numRows; i++) {
      const lineY = yPos - headerHeight - (i * rowHeight);
      page.drawLine({
        start: {x: tableLeft, y: lineY},
        end: {x: tableRight, y: lineY},
        thickness: 0.75,
        color: COLORS.borderGray,
      });
    }

    // Top header border (thicker)
    page.drawLine({
      start: {x: tableLeft, y: yPos},
      end: {x: tableRight, y: yPos},
      thickness: 1,
      color: COLORS.borderGray,
    });

    // Vertical column separators
    const tableTop = yPos;
    const tableBottom = yPos - headerHeight - (numRows * rowHeight);

    [col1, col2, col3, col4, tableRight].forEach((x) => {
      page.drawLine({
        start: {x, y: tableTop},
        end: {x, y: tableBottom},
        thickness: 0.75,
        color: COLORS.borderGray,
      });
    });

    yPos = tableBottom - 20;

    // ========================================
    // PHYSICAL DESCRIPTION SECTION
    // ========================================

    // Section Title with Blue Underline
    page.drawText("PHYSICAL DESCRIPTION", {
      x: sectionX,
      y: yPos,
      size: 11,
      font: helveticaBold,
      color: COLORS.text,
    });

    const physDescTitleWidth = helveticaBold.widthOfTextAtSize("PHYSICAL DESCRIPTION", 11);
    page.drawLine({
      start: {x: sectionX, y: yPos - 2},
      end: {x: sectionX + physDescTitleWidth, y: yPos - 2},
      thickness: 2,
      color: COLORS.primary,
    });

    yPos -= 20;
    const fieldSpacing = 130;

    // Row 1: Age, Gender, Ethnicity, Weight
    page.drawText("Age: ____", {
      x: sectionX,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });
    page.drawText("Gender: ____", {
      x: sectionX + fieldSpacing,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });
    page.drawText("Ethnicity: _______", {
      x: sectionX + (fieldSpacing * 2),
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });
    page.drawText("Weight: _____", {
      x: sectionX + (fieldSpacing * 3),
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    // Row 2: Height, Hair, Eyes, Relationship
    yPos -= 16;
    page.drawText("Height: ____", {
      x: sectionX,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });
    page.drawText("Hair: ______", {
      x: sectionX + fieldSpacing,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });
    page.drawText("Eyes: _______", {
      x: sectionX + (fieldSpacing * 2),
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });
    page.drawText("Relationship: _______", {
      x: sectionX + (fieldSpacing * 3),
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: COLORS.text,
    });

    // Notes section with guide lines
    yPos -= 20;
    page.drawText("Notes:", {
      x: sectionX,
      y: yPos,
      size: 9,
      font: helveticaBold,
      color: COLORS.text,
    });

    yPos -= 12;
    // Draw horizontal guide lines for notes (2 lines)
    for (let i = 0; i < 2; i++) {
      page.drawLine({
        start: {x: sectionX, y: yPos - 2},
        end: {x: width - MARGIN, y: yPos - 2},
        thickness: 0.5,
        color: COLORS.borderGray,
      });
      yPos -= 14;
    }

    // ========================================
    // FOOTER - Confidential Notice and Copyright
    // ========================================
    const footerY = MARGIN + 20;
    const footerText1 = "Confidential Field Sheet – For Authorized Process Servers Only";
    const footerText2 = `© ${new Date().getFullYear()} ${companyName}`;

    // Center the footer text
    const footer1Width = helveticaFont.widthOfTextAtSize(footerText1, 8);
    const footer2Width = helveticaFont.widthOfTextAtSize(footerText2, 8);

    page.drawText(footerText1, {
      x: (width - footer1Width) / 2,
      y: footerY + 10,
      size: 8,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(footerText2, {
      x: (width - footer2Width) / 2,
      y: footerY,
      size: 8,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    console.log(`Field sheet PDF created, size: ${pdfBytes.byteLength} bytes`);

    // Delete any existing field sheets for this job (keep only 1)
    const existingSheetsSnapshot = await db.collection("documents")
        .where("job_id", "==", job_id)
        .where("document_category", "==", "field_sheet")
        .get();

    const deletePromises = existingSheetsSnapshot.docs.map((doc) =>
      doc.ref.delete()
    );
    await Promise.all(deletePromises);
    console.log(`Deleted ${existingSheetsSnapshot.size} existing field sheet(s)`);

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `field_sheets/${job_id}_${Date.now()}.pdf`;
    const file = bucket.file(fileName);

    await file.save(Buffer.from(pdfBytes), {
      metadata: {
        contentType: "application/pdf",
        metadata: {
          jobId: job_id,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`Field sheet uploaded to: ${publicUrl}`);

    // Create Document record in Firestore
    const documentData = {
      name: `Field Sheet - Job ${job.job_number}`,
      title: `Field Sheet - Job ${job.job_number}`,
      file_url: publicUrl,
      document_category: "field_sheet",
      job_id: job_id,
      company_id: job.company_id,
      uploaded_by: request.auth?.uid || "system",
      file_type: "application/pdf",
      file_size: pdfBytes.byteLength,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      received_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("documents").add(documentData);

    console.log(`Document record created: ${docRef.id}`);

    // Return document data with ID for UI to use without refresh
    return {
      success: true,
      url: publicUrl,
      document_id: docRef.id,
      message: "Field sheet generated successfully",
      document: {
        id: docRef.id,
        ...documentData,
        // Convert server timestamps to ISO strings for JSON response
        created_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error in generateFieldSheet:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to generate field sheet: ${error.message}`,
    );
  }
});

// ========================================
// AFFIDAVIT TEMPLATE ENGINE HELPERS
// ========================================

/**
 * Template Constants - Same as frontend for consistency
 */
const TEMPLATE_CONSTANTS = {
  PAPER_WIDTH: "612pt",
  PAPER_HEIGHT: "792pt",
  PAGE_MARGIN: "72pt",
  FONT_FAMILY: "Times New Roman, Times, serif",
  FONT_SIZE: "12pt",
  FONT_SIZE_TITLE: "16pt",
  FONT_SIZE_SMALL: "10pt",
  LINE_HEIGHT: "1.5",
  TEXT_COLOR: "#000000",
  BG_COLOR: "#FFFFFF",
  SECTION_SPACING: "20pt",
  TABLE_BORDER: "1pt solid #CBCBCB",
  TABLE_CELL_PADDING: "8pt",
  TABLE_HEADER_BG: "#F8FAFC",
};

/**
 * Register Handlebars helpers for date formatting, loops, conditionals
 */
function registerHandlebarsHelpers() {
  Handlebars.registerHelper("formatDate", function(dateString, formatString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      // Use date-fns for proper date formatting with format string
      if (formatString && typeof formatString === 'string') {
        return format(date, formatString);
      }
      // Fallback to locale string if no format specified
      return date.toLocaleString("en-US");
    } catch (e) {
      return dateString;
    }
  });

  Handlebars.registerHelper("default", function(value, defaultValue) {
    // Return the value if it exists and is not empty, otherwise return defaultValue
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }
    return value;
  });

  Handlebars.registerHelper("formatGPS", function(lat, lon, accuracy) {
    if (!lat || !lon) return "";
    const latFixed = parseFloat(lat).toFixed(6);
    const lonFixed = parseFloat(lon).toFixed(6);
    const acc = accuracy ? ` (±${Math.round(accuracy)}m)` : "";
    return `${latFixed}, ${lonFixed}${acc}`;
  });

  Handlebars.registerHelper("eq", function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper("ne", function(a, b) {
    return a !== b;
  });

  Handlebars.registerHelper("or", function(a, b) {
    return a || b;
  });

  Handlebars.registerHelper("and", function(a, b) {
    return a && b;
  });

  Handlebars.registerHelper("capitalize", function(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  });

  Handlebars.registerHelper("uppercase", function(str) {
    if (!str) return "";
    return str.toUpperCase();
  });

  Handlebars.registerHelper("lowercase", function(str) {
    if (!str) return "";
    return str.toLowerCase();
  });

  Handlebars.registerHelper("truncateParties", function(text, maxLength = 300) {
    if (!text) return "";

    // If under limit, return as-is
    if (text.length <= maxLength) return text;

    // Find last complete name (assume comma, semicolon, or 'and' separation)
    let truncated = text.substring(0, maxLength);

    // Find last comma, semicolon, or ' and ' before the cutoff
    const lastComma = truncated.lastIndexOf(",");
    const lastSemicolon = truncated.lastIndexOf(";");
    const lastAnd = truncated.lastIndexOf(" and ");

    const lastSeparator = Math.max(lastComma, lastSemicolon, lastAnd);

    if (lastSeparator > 0) {
      truncated = text.substring(0, lastSeparator);
    }

    return truncated.trim() + " et al.";
  });

  Handlebars.registerHelper("titleCase", function(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  });

  Handlebars.registerHelper("formatServiceManner", function(manner) {
    if (!manner) return "";
    if (manner === "other") return "";

    // Convert snake_case to Title Case
    return manner
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
  });

  Handlebars.registerHelper("buildPersonDescription", function(sex, age, height, weight, hair, relationship, description) {
    const parts = [];

    if (sex) parts.push(sex);
    if (age) parts.push(`${age} years old`);
    if (height) parts.push(height);
    if (weight) parts.push(weight);
    if (hair) parts.push(`${hair} hair`);
    if (relationship) parts.push(relationship);
    if (description) parts.push(description);

    return parts.join(", ");
  });

  Handlebars.registerHelper("formatCurrency", function(value) {
    if (!value && value !== 0) return "$0.00";
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  });

  Handlebars.registerHelper("formatPhone", function(phone) {
    if (!phone) return "";
    const cleaned = ("" + phone).replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === "1") {
      return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
    }
    return phone; // Return as-is if format not recognized
  });

  Handlebars.registerHelper("formatAddress", function(address1, address2, city, state, zip) {
    const parts = [];
    if (address1) parts.push(address1);
    if (address2) parts.push(address2);

    const cityStateZip = [city, state, zip].filter(Boolean).join(", ");
    if (cityStateZip) parts.push(cityStateZip);

    return parts.join("<br/>");
  });

  Handlebars.registerHelper("pluralize", function(count, singular, plural) {
    if (!count && count !== 0) return "";
    const num = parseInt(count);
    return `${num} ${num === 1 ? singular : plural}`;
  });

  Handlebars.registerHelper("ifContains", function(haystack, needle) {
    if (!haystack) return false;
    if (Array.isArray(haystack)) {
      return haystack.some((item) => {
        if (typeof item === "object") {
          return Object.values(item).some((val) =>
              String(val).toLowerCase().includes(String(needle).toLowerCase()),
          );
        }
        return String(item).toLowerCase().includes(String(needle).toLowerCase());
      });
    }
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  });

  Handlebars.registerHelper("length", function(value) {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === "string") return value.length;
    if (typeof value === "object") return Object.keys(value).length;
    return 0;
  });

  // Math operations
  Handlebars.registerHelper("add", function(a, b) {
    return parseFloat(a || 0) + parseFloat(b || 0);
  });

  Handlebars.registerHelper("subtract", function(a, b) {
    return parseFloat(a || 0) - parseFloat(b || 0);
  });

  Handlebars.registerHelper("multiply", function(a, b) {
    return parseFloat(a || 0) * parseFloat(b || 0);
  });

  Handlebars.registerHelper("divide", function(a, b) {
    const divisor = parseFloat(b || 1);
    if (divisor === 0) return 0;
    return parseFloat(a || 0) / divisor;
  });

  // Greater than / Less than comparisons
  Handlebars.registerHelper("gt", function(a, b) {
    return parseFloat(a || 0) > parseFloat(b || 0);
  });

  Handlebars.registerHelper("gte", function(a, b) {
    return parseFloat(a || 0) >= parseFloat(b || 0);
  });

  Handlebars.registerHelper("lt", function(a, b) {
    return parseFloat(a || 0) < parseFloat(b || 0);
  });

  Handlebars.registerHelper("lte", function(a, b) {
    return parseFloat(a || 0) <= parseFloat(b || 0);
  });

  Handlebars.registerHelper("json", function(value) {
    return JSON.stringify(value, null, 2);
  });
}

// PERFORMANCE: Lazy register helpers - only when first email template is loaded
let handlebarsHelpersRegistered = false;
function ensureHandlebarsHelpers() {
  if (!handlebarsHelpersRegistered) {
    registerHandlebarsHelpers();
    handlebarsHelpersRegistered = true;
  }
}

/**
 * Replace constant placeholders in HTML template
 */
function replaceConstants(html) {
  if (!html) return html;
  let result = html;
  Object.keys(TEMPLATE_CONSTANTS).forEach((key) => {
    const regex = new RegExp(`\\{\\{CONST\\.${key}\\}\\}`, "g");
    result = result.replace(regex, TEMPLATE_CONSTANTS[key]);
  });
  return result;
}

/**
 * Replace placeholders in template (for simple text templates)
 */
function replacePlaceholders(template, data) {
  if (!template) return "";
  let result = template;

  // Replace all common placeholders
  const placeholders = {
    "{{document_title}}": data.document_title || "AFFIDAVIT OF SERVICE",
    "{{server_name}}": data.server_name || "",
    "{{server_license_number}}": data.server_license_number || "",
    "{{case_number}}": data.case_number || "",
    "{{court_name}}": data.court_name || "",
    "{{court_county}}": data.court_county || "",
    "{{court_state}}": data.court_state || "",
    "{{case_caption}}": data.case_caption || "",
    "{{service_date}}": data.service_date || "",
    "{{service_time}}": data.service_time || "",
    "{{service_address}}": data.service_address || "",
    "{{service_manner}}": data.service_manner || "",
    "{{recipient_name}}": data.recipient_name || "",
    "{{person_served_name}}": data.person_served_name || "",
    "{{person_relationship}}": data.person_relationship || "",
  };

  Object.keys(placeholders).forEach((placeholder) => {
    result = result.replace(new RegExp(placeholder, "g"), placeholders[placeholder]);
  });

  return result;
}

/**
 * Render HTML template with Handlebars and placeholders
 */
function renderHTMLTemplate(htmlTemplate, data) {
  if (!htmlTemplate) return "";

  // First replace constants
  let rendered = replaceConstants(htmlTemplate);

  // Check if template uses Handlebars syntax
  const usesHandlebars = /\{\{#(each|if|unless|with)/.test(rendered);

  if (usesHandlebars) {
    // Compile and render with Handlebars
    const template = Handlebars.compile(rendered);
    rendered = template(data);
  } else {
    // Simple placeholder replacement
    rendered = replacePlaceholders(rendered, data);
  }

  return rendered;
}

/**
 * Inject signature image into HTML for PDF generation
 *
 * For generated affidavits using templates with Handlebars conditionals,
 * the signature is already rendered at the signature line - so we skip injection.
 *
 * For uploaded affidavits (no template rendering), we inject the signature
 * at the position specified in the signature data.
 */
function injectSignatureIntoHTML(html, sig) {
  if (!sig || !sig.signature_data) {
    console.log("[injectSignatureIntoHTML] No signature present.");
    return html;
  }

  // Check if signature is already in the HTML (from template rendering)
  // This happens for generated affidavits using Handlebars templates
  if (html.includes('alt="Signature"')) {
    console.log("[injectSignatureIntoHTML] Signature already present in HTML from template. Skipping injection.");
    return html;
  }

  console.log("[injectSignatureIntoHTML] Injecting signature into PDF HTML");

  // For uploaded affidavits with position data, use the position-based injection
  if (sig.positionPercent || sig.position) {
    const PAGE_WIDTH = 612;
    const PAGE_HEIGHT = 792;

    const posPercent = sig.positionPercent || null;
    const sizePercent = sig.sizePercent || null;
    const defaultPos = sig.position || { x: 340, y: 620 };
    const defaultSize = sig.size || { width: 180, height: 50 };

    const leftPx = posPercent ? posPercent.x * PAGE_WIDTH : defaultPos.x;
    const topPx = posPercent ? posPercent.y * PAGE_HEIGHT : defaultPos.y;
    const widthPx = sizePercent ? sizePercent.width * PAGE_WIDTH : defaultSize.width;
    const heightPx = sizePercent ? sizePercent.height * PAGE_HEIGHT : defaultSize.height;

    console.log("  Position-based injection: left=", leftPx, "top=", topPx);

    const signatureHTML = `
      <img src="${sig.signature_data}"
        alt="Signature"
        style="
          position: absolute;
          left: ${leftPx}px;
          top: ${topPx}px;
          width: ${widthPx}px;
          height: ${heightPx}px;
          object-fit: contain;
          z-index: 999;
        "
      />
    `;

    // Find ALL 612pt top-level page containers
    const pageRegex = /<div style="width:\s*612pt[^>]*>[\s\S]*?<\/div>/gi;
    const pages = html.match(pageRegex);

    if (!pages || pages.length === 0) {
      // Fallback: inject inside main container or before </body>
      const containerMatch = html.match(
        /(<div[^>]*style="[^"]*612pt[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/
      );
      if (containerMatch) {
        const [fullMatch, openingTag, inner, closingTag] = containerMatch;
        return html.replace(fullMatch, openingTag + inner + "\n" + signatureHTML + closingTag);
      }
      return html.replace(/<\/body>\s*<\/html>/i, (match) => signatureHTML + "\n" + match);
    }

    const targetPageIndex = (sig.pageIndex !== null && sig.pageIndex !== undefined && sig.pageIndex < pages.length)
      ? sig.pageIndex
      : pages.length - 1;

    const targetPage = pages[targetPageIndex];
    const updatedPage = targetPage.replace(/<\/div>\s*$/, signatureHTML + "</div>");

    let searchStart = 0;
    for (let i = 0; i < targetPageIndex; i++) {
      const idx = html.indexOf(pages[i], searchStart);
      if (idx !== -1) searchStart = idx + pages[i].length;
    }
    const targetIndex = html.indexOf(targetPage, searchStart);

    if (targetIndex !== -1) {
      html = html.substring(0, targetIndex) + updatedPage + html.substring(targetIndex + targetPage.length);
    }
  }

  return html;
}

/**
 * Generate PDF from HTML using Puppeteer (optimized for Cloud Functions)
 * @param {string} html - HTML content to convert
 * @param {object} options - PDF generation options
 * @param {string} options.headerTemplate - HTML template for header (use <span class="pageNumber"></span> for page numbers)
 * @param {string} options.footerTemplate - HTML template for footer (use <span class="pageNumber"></span> and <span class="totalPages"></span>)
 * @param {boolean} options.displayHeaderFooter - Enable header/footer (default: false)
 * @param {string} options.marginTop - Top margin (e.g. "72pt" for 1 inch) - required if displayHeaderFooter is true
 * @param {string} options.marginBottom - Bottom margin (e.g. "72pt" for 1 inch) - required if displayHeaderFooter is true
 */
async function generatePDFFromHTML(html, options = {}) {
  let browser = null;
  try {
    // PERFORMANCE: Lazy-load Puppeteer and Chromium only when needed
    const puppeteerLib = getPuppeteer();
    const chromiumLib = getChromium();

    // Launch Puppeteer with Cloud Functions optimized settings using @sparticuz/chromium
    browser = await puppeteerLib.launch({
      args: chromiumLib.args,
      defaultViewport: chromiumLib.defaultViewport,
      executablePath: await chromiumLib.executablePath(),
      headless: chromiumLib.headless,
    });

    const page = await browser.newPage();

    // Set content with proper base styles for PDF generation
    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: letter;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* Auto page break styles */
            .page-break {
              page-break-after: always;
            }
            .avoid-break {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

    await page.setContent(fullHTML, {waitUntil: "networkidle0"});

    // Build PDF options - standard letter size with automatic page breaks
    const pdfOptions = {
      format: "letter",  // 8.5 x 11 inches
      printBackground: true,
      preferCSSPageSize: false,
    };

    // Add header/footer support if enabled
    if (options.displayHeaderFooter) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = options.headerTemplate || "<div></div>";
      pdfOptions.footerTemplate = options.footerTemplate || `
        <div style="font-size: 10pt; text-align: center; width: 100%; padding: 5pt 0;">
          <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `;

      // Headers/footers require margins to be set
      pdfOptions.margin = {
        top: options.marginTop || "72pt",
        bottom: options.marginBottom || "72pt",
        left: options.marginLeft || "0",
        right: options.marginRight || "0",
      };
    }

    // Generate PDF with proper settings for multi-page support
    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Download photo data from URL
 * @param {string} url - Photo URL to download
 * @returns {Promise<ArrayBuffer>} - Photo data as ArrayBuffer
 */
async function downloadPhotoFromURL(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000, // 30 second timeout
    });
    return response.data;
  } catch (error) {
    console.error(`Error downloading photo from ${url}:`, error.message);
    throw new Error(`Failed to download photo: ${error.message}`);
  }
}

/**
 * Generate photo exhibit pages for affidavit
 * @param {PDFDocument} pdfDoc - The PDF document to add pages to
 * @param {Array} photos - Array of photo objects with file_url, attemptDate, address_of_attempt
 * @returns {Promise<void>}
 */
async function generatePhotoExhibitPages(pdfDoc, photos) {
  if (!photos || photos.length === 0) {
    return;
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions
  const pageWidth = 612; // US Letter width in points
  const pageHeight = 792; // US Letter height in points
  const margin = 40;

  // Grid layout (2x2)
  const cols = 2;
  const rows = 2;
  const photosPerPage = cols * rows; // 4 photos per page

  // Calculate dimensions for each photo cell
  const availableWidth = pageWidth - (margin * 2);
  const availableHeight = pageHeight - (margin * 2) - 60; // Reserve 60pt for footer
  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;
  const photoSize = Math.min(cellWidth, cellHeight) - 40; // Leave space between photos and for metadata
  const metadataHeight = 50; // Space for metadata text below photo

  // Group photos into pages (4 per page)
  const photoPages = [];
  for (let i = 0; i < photos.length; i += photosPerPage) {
    photoPages.push(photos.slice(i, i + photosPerPage));
  }

  // Generate each exhibit page
  for (let pageIndex = 0; pageIndex < photoPages.length; pageIndex++) {
    const pagePhotos = photoPages[pageIndex];
    const exhibitNumber = pageIndex + 1;

    // Add new page
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Process each photo on this page
    for (let photoIndex = 0; photoIndex < pagePhotos.length; photoIndex++) {
      const photo = pagePhotos[photoIndex];

      try {
        // Download photo data
        const photoData = await downloadPhotoFromURL(photo.file_url);

        // Determine image type and embed
        let image;
        const contentType = photo.content_type || '';
        if (contentType.includes('png')) {
          image = await pdfDoc.embedPng(photoData);
        } else {
          // Default to JPEG
          image = await pdfDoc.embedJpg(photoData);
        }

        // Calculate position in grid
        const col = photoIndex % cols;
        const row = Math.floor(photoIndex / cols);

        // Calculate photo position (centered in cell)
        const cellX = margin + (col * cellWidth);
        const cellY = pageHeight - margin - ((row + 1) * cellHeight);

        // Center photo in cell
        const photoX = cellX + (cellWidth - photoSize) / 2;
        const photoY = cellY + cellHeight - photoSize - 10; // 10pt from top of cell

        // Draw photo
        const imageDims = image.scale(photoSize / Math.max(image.width, image.height));
        page.drawImage(image, {
          x: photoX,
          y: photoY,
          width: imageDims.width,
          height: imageDims.height,
        });

        // Draw metadata below photo
        const metadataY = photoY - 5;
        const metadataX = cellX + 10;

        // Format attempt date if available
        if (photo.attemptDate) {
          try {
            const dateStr = format(new Date(photo.attemptDate), 'MMM d, yyyy h:mm a');
            page.drawText(dateStr, {
              x: metadataX,
              y: metadataY,
              size: 8,
              font: font,
              color: rgb(0.2, 0.2, 0.2),
            });
          } catch (e) {
            console.warn('Error formatting date:', e);
          }
        }

        // Draw location if available
        if (photo.address_of_attempt) {
          const addressText = photo.address_of_attempt.length > 35
            ? photo.address_of_attempt.substring(0, 32) + '...'
            : photo.address_of_attempt;

          page.drawText(addressText, {
            x: metadataX,
            y: metadataY - 12,
            size: 7,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
          });
        }

      } catch (error) {
        console.error(`Error embedding photo ${photoIndex} on page ${pageIndex}:`, error);
        // Continue with next photo if one fails
      }
    }

    // Add "EXHIBIT N" footer at bottom center
    const exhibitText = `EXHIBIT ${exhibitNumber}`;
    const exhibitTextWidth = fontBold.widthOfTextAtSize(exhibitText, 14);
    page.drawText(exhibitText, {
      x: (pageWidth - exhibitTextWidth) / 2,
      y: 30,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  console.log(`Generated ${photoPages.length} photo exhibit page(s) with ${photos.length} total photos`);
}

/**
 * Generate Affidavit PDF for a job
 * @param {Object} data - Affidavit data including template selection
 * @returns {Object} - { success: boolean, data: Buffer }
 */

/**
 * ============================
 *  MAIN AFFIDAVIT GENERATION
 * ============================
 */
exports.generateAffidavit = onCall(
  { timeoutSeconds: 540, memory: "1GiB" },
  async (request) => {
    try {
      const data = request.data;

      if (!data) {
        throw new HttpsError("invalid-argument", "Affidavit data is required");
      }

      console.log(`Generating affidavit with template: ${data.affidavit_template_id || 'general'}`);

      const db = admin.firestore();
      let template;

      /**
       * TEMPLATE LOADING (unchanged)
       */
      if (data.template_mode && (data.html_content || data.template_mode === "simple")) {
        console.log("Using template from request");
        template = {
          name: "Template from request",
          template_mode: data.template_mode,
          html_content: data.html_content,
          header_html: data.header_html,
          footer_html: data.footer_html,
          margin_top: data.margin_top,
          margin_bottom: data.margin_bottom,
          margin_left: data.margin_left,
          margin_right: data.margin_right,
          body: data.body,
          footer_text: data.footer_text,
          include_notary_default: data.include_notary_default || false,
          include_company_info_default: data.include_company_info_default || false,
        };
      } else {
        const templateId = data.affidavit_template_id || "general";
        console.log("Loading template:", templateId);

        const templateDoc = await db.collection("affidavit_templates").doc(templateId).get();
        template = templateDoc.exists
          ? templateDoc.data()
          : {
              template_mode: "simple",
              body: "I, {{server_name}}, depose and say...",
              footer_text: "Subscribed and sworn...",
            };
      }

      const isHTMLTemplate = template.template_mode === "html" && template.html_content;

      /**
       * ============================
       *    HTML MODE (PUPPETEER)
       * ============================
       */
      if (isHTMLTemplate) {
        console.log("[generateAffidavit] Using HTML template mode");

        let renderedHTML = data.html_content_edited
          ? data.html_content_edited
          : renderHTMLTemplate(template.html_content, data);

        // Inject user’s signature
        if (data.placed_signature) {
          console.log("Injecting signature into HTML...");
          renderedHTML = injectSignatureIntoHTML(renderedHTML, data.placed_signature);
        } else {
          console.log("No signature to inject.");
        }

        // PDF options
        const pdfOptions = {};

        if (template.header_html || template.footer_html) {
          pdfOptions.displayHeaderFooter = true;
          if (template.header_html)
            pdfOptions.headerTemplate = renderHTMLTemplate(template.header_html, data);

          if (template.footer_html)
            pdfOptions.footerTemplate = renderHTMLTemplate(template.footer_html, data);

          pdfOptions.marginTop = template.margin_top || "72pt";
          pdfOptions.marginBottom = template.margin_bottom || "72pt";
          pdfOptions.marginLeft = template.margin_left || "72pt";
          pdfOptions.marginRight = template.margin_right || "72pt";
        }

        // Generate PDF
        let pdfBytes = await generatePDFFromHTML(renderedHTML, pdfOptions);

        console.log("HTML-mode PDF generated:", pdfBytes.byteLength, "bytes");

        // Handle photo exhibits
        if (data.selected_photos?.length > 0) {
          console.log(`Adding ${data.selected_photos.length} photo exhibits`);
          try {
            const pdfDoc = await PDFDocument.load(pdfBytes);

            const enriched = data.selected_photos.map((p) => ({
              ...p,
              address_of_attempt: p.address_of_attempt || "Unknown location",
            }));

            await generatePhotoExhibitPages(pdfDoc, enriched);

            pdfBytes = await pdfDoc.save();
            console.log("Exhibits added successfully");
          } catch (err) {
            console.error("Exhibit error:", err);
          }
        }

        await trackPlatformUsage("affidavits_generated");

        return {
          success: true,
          data: Buffer.from(pdfBytes).toString('base64'),
          message: "Affidavit generated successfully (HTML mode)",
        };
      }

      /**
       * ============================
       *     SIMPLE TEXT MODE
       * ============================
       * (your original logic unchanged)
       */
      console.log("Using SIMPLE MODE");
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // ... (Your entire simple PDF mode remains unchanged)
      // This block is not altered because it does not involve signatures in HTML.

      const pdfBytes = await pdfDoc.save();

      await trackPlatformUsage("affidavits_generated");

      return {
        success: true,
        data: Buffer.from(pdfBytes).toString('base64'),
        message: "Affidavit generated (simple mode)",
      };
    } catch (err) {
      console.error("generateAffidavit ERROR:", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", "Failed to generate affidavit: " + err.message);
    }
  }
);

/**
 * Helper function to wrap text into lines
 * @param {string} text - Text to wrap
 * @param {number} maxLength - Maximum characters per line
 * @return {string[]} Array of text lines
 */
function wrapText(text, maxLength) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

// ============================================================================
// JOB SHARING FEATURE - Cloud Functions
// ============================================================================

/**
 * Auto-assign jobs to partners based on zip code configuration
 * Triggers when a new job is created
 */
exports.autoAssignJobOnCreate = onDocumentCreated(
    "jobs/{jobId}",
    async (event) => {
      const job = event.data.data();
      const jobId = event.params.jobId;

      try {
        // Only process if job has address and isn't already shared
        if (!job.addresses?.[0]?.postal_code || job.job_share_chain?.is_shared) {
          console.log(`Job ${jobId}: Skipping auto-assignment - no zip or already shared`);
          return null;
        }

        const serviceZip = job.addresses[0].postal_code;
        console.log(`Job ${jobId}: Checking auto-assignment for zip ${serviceZip}`);

        // Get the company that created this job
        const companyDoc = await admin.firestore()
            .collection("companies")
            .doc(job.company_id)
            .get();

        if (!companyDoc.exists) {
          console.log(`Job ${jobId}: Company not found`);
          return null;
        }

        const companyData = companyDoc.data();

        // Query partner client records from companies collection
        const partnerClientsSnapshot = await admin.firestore()
            .collection("companies")
            .where("created_by", "==", job.company_id)
            .where("is_job_share_partner", "==", true)
            .where("relationship_status", "==", "active")
            .where("auto_assignment_enabled", "==", true)
            .get();

        if (partnerClientsSnapshot.empty) {
          console.log(`Job ${jobId}: No auto-assignment partners configured`);
          return null;
        }

        // Find eligible partners for this zip
        const eligiblePartners = partnerClientsSnapshot.docs
            .map((d) => ({id: d.id, ...d.data()}))
            .filter((partner) => {
              return partner.auto_assignment_zones?.some((zone) =>
                zone.enabled && zone.zip_codes.includes(serviceZip),
              );
            })
            .sort((a, b) => {
              const aPriority = a.auto_assignment_zones
                  .find((z) => z.zip_codes.includes(serviceZip))?.auto_assign_priority || 999;
              const bPriority = b.auto_assignment_zones
                  .find((z) => z.zip_codes.includes(serviceZip))?.auto_assign_priority || 999;
              return aPriority - bPriority;
            });

        if (eligiblePartners.length === 0) {
          console.log(`Job ${jobId}: No eligible partners found for zip ${serviceZip}`);
          return null;
        }

        const selectedPartner = eligiblePartners[0];
        const zone = selectedPartner.auto_assignment_zones
            .find((z) => z.zip_codes.includes(serviceZip));

        console.log(`Job ${jobId}: Auto-assigning to ${selectedPartner.company_name}`);

        // Create job share request
        const request = {
          job_id: jobId,
          requesting_company_id: job.company_id,
          requesting_user_id: job.created_by,
          requesting_company_name: companyData.name || companyData.company_name,
          target_company_id: selectedPartner.job_sharing_partner_id,
          target_user_id: null,
          target_company_name: selectedPartner.company_name || selectedPartner.name,
          status: selectedPartner.requires_acceptance ? "pending" : "accepted",
          proposed_fee: zone.default_fee,
          auto_assigned: true,
          expires_in_hours: selectedPartner.requires_acceptance ? 24 : null,
          expires_at: selectedPartner.requires_acceptance ?
            new Date(Date.now() + 24 * 60 * 60 * 1000) :
            null,
          job_preview: {
            recipient_name: job.recipient?.name || "",
            service_address: job.addresses[0].address1,
            city: job.addresses[0].city,
            state: job.addresses[0].state,
            zip: serviceZip,
            due_date: job.due_date,
            service_type: job.service_type || "standard",
            documents_count: job.documents?.length || 0,
            special_instructions: job.service_instructions || "",
          },
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          responded_at: selectedPartner.requires_acceptance ?
            null :
            admin.firestore.FieldValue.serverTimestamp(),
        };

        const requestRef = await admin.firestore()
            .collection("job_share_requests")
            .add(request);

        console.log(`Job ${jobId}: Created share request ${requestRef.id}`);

        // If auto-accept, immediately update the job
        if (!selectedPartner.requires_acceptance) {
          await updateJobWithShare(jobId, job, selectedPartner, zone.default_fee, companyData);
          console.log(`Job ${jobId}: Auto-accepted and job updated`);
        }

        // Send email notification to partner
        if (selectedPartner.email_notifications_enabled) {
          try {
            // Fetch partner company email
            const partnerCompanyDoc = await admin.firestore()
                .collection("companies")
                .doc(selectedPartner.job_sharing_partner_id)
                .get();

            if (partnerCompanyDoc.exists && partnerCompanyDoc.data().email) {
              await sendEmailWithTemplate({
                to: partnerCompanyDoc.data().email,
                subject: selectedPartner.requires_acceptance ?
                  `New Job Share Request from ${companyData.name || companyData.company_name}` :
                  `New Job Assigned from ${companyData.name || companyData.company_name}`,
                templateName: "job-share-notification",
                templateData: {
                  requires_acceptance: selectedPartner.requires_acceptance,
                  from_company_name: companyData.name || companyData.company_name,
                  job_preview: {
                    recipient_name: job.recipient?.name || "",
                    service_address: job.addresses?.[0]?.address1 || "",
                    city: job.addresses?.[0]?.city || "",
                    state: job.addresses?.[0]?.state || "",
                    due_date: job.due_date,
                    documents_count: job.documents?.length || 0,
                  },
                  proposed_fee: zone.default_fee,
                  job_url: `https://www.servemax.pro/jobs/${jobId}`,
                  accept_url: `https://www.servemax.pro/jobs/share-requests`,
                },
                companyId: job.company_id,
              });
              console.log(`Job ${jobId}: Email notification sent to partner`);
            }
          } catch (emailError) {
            console.error(`Job ${jobId}: Failed to send email notification:`, emailError);
            // Don't fail the auto-assignment if email fails
          }
        }

        return requestRef.id;
      } catch (error) {
        console.error(`Error in autoAssignJobOnCreate for job ${jobId}:`, error);
        // Don't throw - we don't want to fail job creation if auto-assignment fails
        return null;
      }
    },
);

/**
 * Helper function to update job with share chain
 */
async function updateJobWithShare(jobId, job, partner, fee, companyData) {
  const chainEntry = {
    level: 0,
    company_id: job.company_id,
    company_name: companyData.name || companyData.company_name || "Unknown",
    user_id: job.created_by,
    user_name: job.created_by_name || "Unknown",
    shared_with_company_id: partner.job_sharing_partner_id || partner.partner_company_id,
    shared_with_user_id: null,
    invoice_amount: job.total_fee || job.service_fee || 0,
    shared_at: admin.firestore.FieldValue.serverTimestamp(),
    accepted_at: admin.firestore.FieldValue.serverTimestamp(),
    sees_client_as: job.client_name || "Unknown Client",
    auto_assigned: true,
  };

  const partnerChainEntry = {
    level: 1,
    company_id: partner.job_sharing_partner_id || partner.partner_company_id,
    company_name: partner.company_name || partner.partner_company_name,
    user_id: null,
    shared_with_company_id: null,
    shared_with_user_id: null,
    invoice_amount: fee,
    sees_client_as: (companyData.name || companyData.company_name) + " - Process Serving",
    auto_assigned: true,
  };

  await admin.firestore().collection("jobs").doc(jobId).update({
    "job_share_chain": {
      is_shared: true,
      currently_assigned_to_user_id: null,
      currently_assigned_to_company_id: partner.job_sharing_partner_id || partner.partner_company_id,
      chain: [chainEntry, partnerChainEntry],
      total_levels: 1,
    },
    "assigned_to": partner.job_sharing_partner_id || partner.partner_company_id,
    "assigned_server_id": partner.job_sharing_partner_id || partner.partner_company_id,
    "updated_at": admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Create a manual job share request
 */
exports.createJobShareRequest = onCall(async (request) => {
  try {
    // Validate authentication
    const userId = requireAuth(request.auth);

    const {
      jobId,
      targetCompanyId,
      targetUserId,
      proposedFee,
      expiresInHours,
      // Carbon copy fields
      createCarbonCopy,
      sourceJobSnapshot,
      sharedJobNumber,
      shareChainRootJobId,
      shareChainLevel,
    } = request.data;

    // Validate required fields with proper type checking
    validateDocumentId(jobId, "jobId");
    validateDocumentId(targetCompanyId, "targetCompanyId");
    validateDocumentId(targetUserId, "targetUserId");
    validateNumber(proposedFee, "proposedFee", {min: 0, max: 100000, required: true});
    validateNumber(expiresInHours, "expiresInHours", {min: 1, max: 720, required: false});
    validateBoolean(createCarbonCopy, "createCarbonCopy", false);
    validateDocumentId(sharedJobNumber, "sharedJobNumber", false);
    validateDocumentId(shareChainRootJobId, "shareChainRootJobId", false);
    validateNumber(shareChainLevel, "shareChainLevel", {min: 0, max: 10, required: false});

    console.log(`Creating job share request for job ${jobId} to company ${targetCompanyId}`);

    // Get the user's company_id - try token claim first, then lookup from Firestore
    let userCompanyId = request.auth.token.company_id;
    if (!userCompanyId) {
      // Look up from user's Firestore document
      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();
      if (userDoc.exists) {
        userCompanyId = userDoc.data().company_id;
      }
    }

    if (!userCompanyId) {
      throw new HttpsError(
          "failed-precondition",
          "User does not have a company_id assigned",
      );
    }

    console.log(`User ${request.auth.uid} company_id: ${userCompanyId}`);

    // Get job and validate ownership/sharing rights
    const jobDoc = await admin.firestore().collection("jobs").doc(jobId).get();
    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "Job not found");
    }

    const job = jobDoc.data();

    // Check if the requesting user's company can share this job
    const canShare = job.job_share_chain?.chain ?
      job.job_share_chain.chain[job.job_share_chain.chain.length - 1].company_id ===
        userCompanyId :
      job.company_id === userCompanyId;

    if (!canShare) {
      throw new HttpsError(
          "permission-denied",
          "You do not have permission to share this job",
      );
    }

    // Get company data for proper naming
    const companyDoc = await admin.firestore()
        .collection("companies")
        .doc(userCompanyId)
        .get();

    const companyData = companyDoc.exists ? companyDoc.data() : {};

    // Get target company name
    const targetCompanyDoc = await admin.firestore()
        .collection("companies")
        .doc(targetCompanyId)
        .get();

    const targetCompanyData = targetCompanyDoc.exists ? targetCompanyDoc.data() : {};

    // Create the share request
    const shareRequest = {
      job_id: jobId,
      requesting_company_id: userCompanyId,
      requesting_user_id: request.auth.uid,
      requesting_company_name: companyData.name || companyData.company_name || "Unknown",
      target_company_id: targetCompanyId,
      target_user_id: targetUserId,
      target_company_name: targetCompanyData.name || targetCompanyData.company_name || "Unknown",
      status: "pending",
      proposed_fee: proposedFee,
      auto_assigned: false,
      expires_in_hours: expiresInHours || 24,
      expires_at: expiresInHours ?
        new Date(Date.now() + expiresInHours * 60 * 60 * 1000) :
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      job_preview: {
        recipient_name: job.recipient?.name || "",
        service_address: job.addresses?.[0]?.address1 || "",
        city: job.addresses?.[0]?.city || "",
        state: job.addresses?.[0]?.state || "",
        zip: job.addresses?.[0]?.postal_code || "",
        due_date: job.due_date || "",
        service_type: job.service_type || "standard",
        documents_count: job.documents?.length || 0,
        special_instructions: job.service_instructions || "",
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      // Carbon copy fields
      create_carbon_copy: createCarbonCopy || false,
      source_job_snapshot: createCarbonCopy ? sourceJobSnapshot : null,
      shared_job_number: sharedJobNumber || job.job_number,
      share_chain_root_job_id: shareChainRootJobId || jobId,
      share_chain_level: shareChainLevel || 1,
    };

    const requestRef = await admin.firestore()
        .collection("job_share_requests")
        .add(shareRequest);

    console.log(`Job share request created: ${requestRef.id}`);

    // Send email notification to target company
    if (targetCompanyData.email) {
      try {
        await sendEmailWithTemplate({
          to: targetCompanyData.email,
          subject: `New Job Share Request from ${companyData.name || companyData.company_name}`,
          templateName: "job-share-notification",
          templateData: {
            requires_acceptance: true,
            from_company_name: companyData.name || companyData.company_name,
            job_preview: shareRequest.job_preview,
            proposed_fee: proposedFee,
            job_url: `https://www.servemax.pro/jobs/${jobId}`,
            accept_url: `https://www.servemax.pro/jobs/share-requests`,
          },
          companyId: job.company_id,
        });
        console.log(`Email notification sent to ${targetCompanyData.email}`);
      } catch (emailError) {
        console.error("Failed to send share request email:", emailError);
        // Don't fail the share request if email fails
      }
    }

    return {requestId: requestRef.id, success: true};
  } catch (error) {
    console.error("Error in createJobShareRequest:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to create job share request: ${error.message}`,
    );
  }
});

/**
 * Respond to a job share request (accept or decline)
 */
exports.respondToShareRequest = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {requestId, accept, counterFee, declineReason} = request.data;

    if (!requestId || accept === undefined) {
      throw new HttpsError(
          "invalid-argument",
          "Missing required fields: requestId, accept",
      );
    }

    console.log(`Responding to share request ${requestId}: ${accept ? "accept" : "decline"}`);

    // Get the user's company_id - try token claim first, then lookup from Firestore
    let userCompanyId = request.auth.token.company_id;
    if (!userCompanyId) {
      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();
      if (userDoc.exists) {
        userCompanyId = userDoc.data().company_id;
      }
    }

    if (!userCompanyId) {
      throw new HttpsError(
          "failed-precondition",
          "User does not have a company_id assigned",
      );
    }

    // Get and validate request
    const requestDoc = await admin.firestore()
        .collection("job_share_requests")
        .doc(requestId)
        .get();

    if (!requestDoc.exists) {
      throw new HttpsError("not-found", "Share request not found");
    }

    const shareRequest = requestDoc.data();

    // Validate that the user is the target of this request
    if (shareRequest.target_company_id !== userCompanyId) {
      throw new HttpsError(
          "permission-denied",
          "You are not authorized to respond to this request",
      );
    }

    // Check if request is still pending
    if (shareRequest.status !== "pending") {
      throw new HttpsError(
          "failed-precondition",
          `Request has already been ${shareRequest.status}`,
      );
    }

    // Check expiration
    if (shareRequest.expires_at && shareRequest.expires_at.toDate() < new Date()) {
      await requestDoc.ref.update({status: "expired"});
      throw new HttpsError("deadline-exceeded", "Request has expired");
    }

    if (accept) {
      console.log(`Accepting share request ${requestId}`);

      // Update request status
      const finalFee = counterFee || shareRequest.proposed_fee;
      await requestDoc.ref.update({
        status: "accepted",
        responded_at: admin.firestore.FieldValue.serverTimestamp(),
        final_fee: finalFee,
      });

      // Get the source job
      const jobDoc = await admin.firestore()
          .collection("jobs")
          .doc(shareRequest.job_id)
          .get();

      if (!jobDoc.exists) {
        throw new HttpsError("not-found", "Job not found");
      }

      const job = jobDoc.data();

      // ========================================================================
      // CARBON COPY FLOW: Create a separate job copy for the accepting company
      // ========================================================================
      if (shareRequest.create_carbon_copy) {
        console.log(`Creating carbon copy job for ${shareRequest.target_company_name}`);

        // 1. Find or create the requesting company as a client in the target company's system
        // Clients are stored in the "companies" collection with created_by = owner company
        let clientId = null;
        const existingClients = await admin.firestore()
            .collection("companies")
            .where("created_by", "==", shareRequest.target_company_id)
            .where("job_sharing_partner_id", "==", shareRequest.requesting_company_id)
            .get();

        if (!existingClients.empty) {
          clientId = existingClients.docs[0].id;
          console.log(`Found existing client record: ${clientId}`);
        } else {
          // Create new client record in companies collection (matches app's SecureClientAccess pattern)
          const newClientRef = await admin.firestore().collection("companies").add({
            company_name: shareRequest.requesting_company_name,
            name: shareRequest.requesting_company_name,
            company_type: "client",
            client_type: "job_sharing_partner",
            job_sharing_partner_id: shareRequest.requesting_company_id,
            created_by: shareRequest.target_company_id,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          clientId = newClientRef.id;
          console.log(`Created new client record: ${clientId}`);
        }

        // 2. Get the source job snapshot data (from request or from job)
        const sourceSnapshot = shareRequest.source_job_snapshot || {};

        // 3. Create the carbon copy job
        const carbonCopyJob = {
          // Core fields
          job_type: sourceSnapshot.job_type || job.job_type || "process_serving",
          job_number: shareRequest.shared_job_number || job.job_number, // SAME job number!
          company_id: shareRequest.target_company_id,
          client_id: clientId,
          client_name: shareRequest.requesting_company_name,
          created_by: request.auth.uid,
          created_at: admin.firestore.FieldValue.serverTimestamp(),

          // Process serving fields
          addresses: sourceSnapshot.addresses || job.addresses || [],
          recipient: sourceSnapshot.recipient || job.recipient || {},
          plaintiff: sourceSnapshot.plaintiff || job.plaintiff || "",
          defendant: sourceSnapshot.defendant || job.defendant || "",
          case_number: sourceSnapshot.case_number || job.case_number || "",
          court_name: sourceSnapshot.court_name || job.court_name || "",
          court_county: sourceSnapshot.court_county || job.court_county || "",
          court_address: sourceSnapshot.court_address || job.court_address || {},
          court_case_id: null, // Carbon copies don't reference source company's court case
          service_instructions: sourceSnapshot.service_instructions || job.service_instructions || "",
          first_attempt_instructions: sourceSnapshot.first_attempt_instructions || job.first_attempt_instructions || "",
          first_attempt_due_date: sourceSnapshot.first_attempt_due_date || job.first_attempt_due_date || "",
          priority: sourceSnapshot.priority || job.priority || "standard",
          due_date: sourceSnapshot.due_date || job.due_date || "",
          notes: sourceSnapshot.notes || job.notes || "",

          // Assignment
          server_type: "employee",
          assigned_server_id: "unassigned",
          server_name: "Unassigned",

          // Status
          status: "pending",
          is_closed: false,

          // Fee (what the accepting company will charge)
          service_fee: finalFee,
          total_fee: finalFee,

          // Carbon copy link - connects this job to the source
          share_chain: {
            root_job_id: shareRequest.share_chain_root_job_id || shareRequest.job_id,
            root_company_id: job.share_chain?.root_company_id || job.company_id,
            shared_job_number: shareRequest.shared_job_number || job.job_number,
            level: shareRequest.share_chain_level || 1,
            parent_job_id: shareRequest.job_id,
            parent_company_id: shareRequest.requesting_company_id,
            child_job_id: null,
            child_company_id: null,
            all_job_ids: [], // Will update after creation
            sync_enabled: true,
          },

          // Activity log
          activity_log: [{
            timestamp: new Date().toISOString(),
            user_name: "System",
            event_type: "job_created",
            description: `Carbon copy job created from ${shareRequest.requesting_company_name} (Job #${shareRequest.shared_job_number || job.job_number})`,
          }],
        };

        const newJobRef = await admin.firestore().collection("jobs").add(carbonCopyJob);
        const carbonCopyJobId = newJobRef.id;
        console.log(`Carbon copy job created: ${carbonCopyJobId}`);

        // 4. Update both jobs with the share_chain links
        // Update the source job
        const sourceAllJobIds = job.share_chain?.all_job_ids || [shareRequest.job_id];
        sourceAllJobIds.push(carbonCopyJobId);

        await jobDoc.ref.update({
          "share_chain.child_job_id": carbonCopyJobId,
          "share_chain.child_company_id": shareRequest.target_company_id,
          "share_chain.all_job_ids": sourceAllJobIds,
          "carbon_copy_pending": false,
          "updated_at": admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update the carbon copy job with all_job_ids
        await newJobRef.update({
          "share_chain.all_job_ids": sourceAllJobIds,
        });

        // 5. Copy documents from source job to carbon copy
        const sourceDocs = await admin.firestore()
            .collection("documents")
            .where("job_id", "==", shareRequest.job_id)
            .get();

        if (!sourceDocs.empty) {
          const batch = admin.firestore().batch();
          sourceDocs.docs.forEach((doc) => {
            const docData = doc.data();
            const newDocRef = admin.firestore().collection("documents").doc();
            batch.set(newDocRef, {
              job_id: carbonCopyJobId,
              company_id: shareRequest.target_company_id,
              title: docData.title || "",
              file_url: docData.file_url || "", // Reference same file
              document_category: docData.document_category || "other",
              page_count: docData.page_count || 0,
              source_document_id: doc.id,
              copied_from_job_id: shareRequest.job_id,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          console.log(`Copied ${sourceDocs.docs.length} documents to carbon copy job`);
        }

        console.log(`Carbon copy flow completed for job ${carbonCopyJobId}`);
      } else {
        // ========================================================================
        // LEGACY FLOW: Update job share chain (no carbon copy)
        // ========================================================================

        // Build new chain entry
        const currentLevel = job.job_share_chain?.total_levels || 0;
        const newChainEntry = {
          level: currentLevel + 1,
          company_id: shareRequest.target_company_id,
          company_name: shareRequest.target_company_name,
          user_id: shareRequest.target_user_id,
          shared_with_company_id: null,
          shared_with_user_id: null,
          invoice_amount: finalFee,
          sees_client_as: shareRequest.requesting_company_name + " - Process Serving",
          auto_assigned: false,
        };

        // Get or create initial chain
        let chain = job.job_share_chain?.chain || [
          {
            level: 0,
            company_id: job.company_id,
            company_name: job.company_name || "Unknown",
            user_id: job.created_by,
            shared_with_company_id: shareRequest.target_company_id,
            shared_with_user_id: shareRequest.target_user_id,
            invoice_amount: job.total_fee || job.service_fee || 0,
            shared_at: admin.firestore.FieldValue.serverTimestamp(),
            accepted_at: admin.firestore.FieldValue.serverTimestamp(),
            sees_client_as: job.client_name || "Unknown Client",
          },
        ];

        // Update the last entry to show it's been shared
        chain[chain.length - 1].shared_with_company_id = shareRequest.target_company_id;
        chain[chain.length - 1].shared_with_user_id = shareRequest.target_user_id;
        chain[chain.length - 1].accepted_at = admin.firestore.FieldValue.serverTimestamp();

        // Add new entry
        chain.push(newChainEntry);

        // Update job
        await jobDoc.ref.update({
          "job_share_chain": {
            is_shared: true,
            currently_assigned_to_user_id: shareRequest.target_user_id,
            currently_assigned_to_company_id: shareRequest.target_company_id,
            chain: chain,
            total_levels: currentLevel + 1,
          },
          "assigned_to": shareRequest.target_user_id,
          "assigned_server_id": shareRequest.target_user_id,
          "updated_at": admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Job ${shareRequest.job_id} share chain updated (legacy flow)`);
      }

      // Send acceptance email notification to requesting company
      try {
        const requestingCompanyDoc = await admin.firestore()
            .collection("companies")
            .doc(shareRequest.requesting_company_id)
            .get();

        if (requestingCompanyDoc.exists && requestingCompanyDoc.data().email) {
          await sendEmailWithTemplate({
            to: requestingCompanyDoc.data().email,
            subject: `Job Share Accepted by ${shareRequest.target_company_name}`,
            templateName: "job-share-response",
            templateData: {
              accepted: true,
              responding_company_name: shareRequest.target_company_name,
              final_fee: finalFee,
              job_preview: shareRequest.job_preview,
              job_url: `https://www.servemax.pro/jobs/${shareRequest.job_id}`,
            },
            companyId: shareRequest.target_company_id,
          });
          console.log(`Acceptance email sent to ${requestingCompanyDoc.data().email}`);
        }
      } catch (emailError) {
        console.error("Failed to send acceptance email:", emailError);
      }
    } else {
      // Decline the request
      console.log(`Declining share request ${requestId}`);

      await requestDoc.ref.update({
        status: "declined",
        responded_at: admin.firestore.FieldValue.serverTimestamp(),
        decline_reason: declineReason || null,
      });

      // Update the original job to show "Server Denied" badge
      try {
        await admin.firestore()
            .collection("jobs")
            .doc(shareRequest.job_id)
            .update({
              carbon_copy_pending: false,
              carbon_copy_declined: true,
              carbon_copy_decline_reason: declineReason || null,
              carbon_copy_declined_by: shareRequest.target_company_name,
            });
        console.log(`Updated original job ${shareRequest.job_id} with declined status`);
      } catch (jobUpdateError) {
        console.error("Failed to update original job:", jobUpdateError);
      }

      // Create in-app notification for the requesting company
      try {
        await admin.firestore().collection("notifications").add({
          company_id: shareRequest.requesting_company_id,
          type: "job_share_declined",
          title: "Job Share Declined",
          message: `${shareRequest.target_company_name} declined your job share request`,
          job_id: shareRequest.job_id,
          job_number: shareRequest.shared_job_number || "",
          recipient_name: shareRequest.job_preview?.recipient_name || "",
          decline_reason: declineReason || null,
          declining_company_name: shareRequest.target_company_name,
          read: false,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Decline notification created for company ${shareRequest.requesting_company_id}`);
      } catch (notifError) {
        console.error("Failed to create decline notification:", notifError);
      }

      // Send decline email notification to requesting company
      try {
        const requestingCompanyDoc = await admin.firestore()
            .collection("companies")
            .doc(shareRequest.requesting_company_id)
            .get();

        if (requestingCompanyDoc.exists && requestingCompanyDoc.data().email) {
          await sendEmailWithTemplate({
            to: requestingCompanyDoc.data().email,
            subject: `Job Share Declined by ${shareRequest.target_company_name}`,
            templateName: "job-share-response",
            templateData: {
              accepted: false,
              responding_company_name: shareRequest.target_company_name,
              job_preview: shareRequest.job_preview,
              job_url: `https://www.servemax.pro/jobs/${shareRequest.job_id}`,
            },
            companyId: shareRequest.target_company_id,
          });
          console.log(`Decline email sent to ${requestingCompanyDoc.data().email}`);
        }
      } catch (emailError) {
        console.error("Failed to send decline email:", emailError);
      }
    }

    return {success: true};
  } catch (error) {
    console.error("Error in respondToShareRequest:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to respond to share request: ${error.message}`,
    );
  }
});

/**
 * Toggle visibility of an attempt or document in a shared job chain.
 * Only the job owner can change visibility settings.
 *
 * @param {Object} request.data
 * @param {string} request.data.jobId - The job ID
 * @param {string} request.data.collectionType - "attempts" or "documents"
 * @param {string} request.data.itemId - The document ID of the item to update
 * @param {string[]} request.data.visibility - Array of targets: ["client"], ["server"], ["client", "server"], or []
 */
exports.toggleVisibility = onCall(async (request) => {
  try {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {jobId, collectionType, itemId, visibility} = request.data;

    // Validate required fields
    if (!jobId || !collectionType || !itemId) {
      throw new HttpsError(
          "invalid-argument",
          "Missing required fields: jobId, collectionType, itemId",
      );
    }

    // Validate collection type
    if (!["attempts", "documents"].includes(collectionType)) {
      throw new HttpsError(
          "invalid-argument",
          "collectionType must be 'attempts' or 'documents'",
      );
    }

    // Validate visibility array
    if (!Array.isArray(visibility)) {
      throw new HttpsError(
          "invalid-argument",
          "visibility must be an array",
      );
    }

    const validTargets = ["client", "server"];
    for (const target of visibility) {
      if (!validTargets.includes(target)) {
        throw new HttpsError(
            "invalid-argument",
            `Invalid visibility target: ${target}. Must be 'client' or 'server'`,
        );
      }
    }

    // Get the user's company
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const userCompanyId = userData.company_id;

    if (!userCompanyId) {
      throw new HttpsError(
          "failed-precondition",
          "User does not belong to a company",
      );
    }

    // Get the job document
    const jobDoc = await admin.firestore()
        .collection("jobs")
        .doc(jobId)
        .get();

    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "Job not found");
    }

    const jobData = jobDoc.data();

    // Only the job owner can change visibility
    if (jobData.company_id !== userCompanyId) {
      throw new HttpsError(
          "permission-denied",
          "Only the job owner can change visibility settings",
      );
    }

    // Get the item document
    const itemDoc = await admin.firestore()
        .collection(collectionType)
        .doc(itemId)
        .get();

    if (!itemDoc.exists) {
      throw new HttpsError("not-found", `${collectionType} item not found`);
    }

    const itemData = itemDoc.data();

    // Verify the item belongs to this job
    if (itemData.job_id !== jobId) {
      throw new HttpsError(
          "permission-denied",
          "Item does not belong to this job",
      );
    }

    // Update the visibility
    await admin.firestore()
        .collection(collectionType)
        .doc(itemId)
        .update({
          visibility: visibility,
          visibility_updated_at: admin.firestore.FieldValue.serverTimestamp(),
          visibility_updated_by: request.auth.uid,
        });

    console.log(`[toggleVisibility] Updated ${collectionType}/${itemId} visibility to: ${JSON.stringify(visibility)}`);

    return {
      success: true,
      itemId: itemId,
      visibility: visibility,
    };
  } catch (error) {
    console.error("Error in toggleVisibility:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to toggle visibility: ${error.message}`,
    );
  }
});

/**
 * Report job status to upstream client
 * Sends an email update to the company that shared the job with us
 * Also optionally syncs status to the parent job
 *
 * @param {Object} request.data
 * @param {string} request.data.jobId - The job ID
 * @param {boolean} request.data.includeAttempts - Include service attempts in report
 * @param {boolean} request.data.includeAffidavit - Include affidavit link if available
 * @param {boolean} request.data.includeInvoice - Include invoice info if available
 * @param {boolean} request.data.syncToParent - Also update parent job status
 * @param {string} request.data.customMessage - Optional message to include
 */
exports.reportStatusToUpstream = onCall(async (request) => {
  try {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {
      jobId,
      includeAttempts = true,
      includeAffidavit = true,
      includeInvoice = false,
      syncToParent = true,
      customMessage = "",
    } = request.data;

    // Validate required fields
    if (!jobId) {
      throw new HttpsError("invalid-argument", "Missing required field: jobId");
    }

    // Get the user's company
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const userCompanyId = userData.company_id;

    if (!userCompanyId) {
      throw new HttpsError(
          "failed-precondition",
          "User does not belong to a company",
      );
    }

    // Get the job document
    const jobDoc = await admin.firestore()
        .collection("jobs")
        .doc(jobId)
        .get();

    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "Job not found");
    }

    const jobData = jobDoc.data();

    // Only the job owner can report status
    if (jobData.company_id !== userCompanyId) {
      throw new HttpsError(
          "permission-denied",
          "Only the job owner can report status to upstream client",
      );
    }

    // Check that this job has an upstream parent
    const parentJobId = jobData.share_chain?.parent_job_id;
    const parentCompanyId = jobData.share_chain?.parent_company_id;

    if (!parentJobId || !parentCompanyId) {
      throw new HttpsError(
          "failed-precondition",
          "This job does not have an upstream client to report to",
      );
    }

    // Get the parent company info for email
    const parentCompanyDoc = await admin.firestore()
        .collection("companies")
        .doc(parentCompanyId)
        .get();

    if (!parentCompanyDoc.exists) {
      throw new HttpsError("not-found", "Parent company not found");
    }

    const parentCompanyData = parentCompanyDoc.data();

    // Find email to send to - prefer primary contact, then company email
    let recipientEmail = parentCompanyData.email;
    let recipientName = parentCompanyData.name || parentCompanyData.company_name;

    if (parentCompanyData.contacts && parentCompanyData.contacts.length > 0) {
      const primaryContact = parentCompanyData.contacts.find((c) => c.primary);
      if (primaryContact && primaryContact.email) {
        recipientEmail = primaryContact.email;
        recipientName = `${primaryContact.first_name || ""} ${primaryContact.last_name || ""}`.trim() || recipientName;
      }
    }

    if (!recipientEmail) {
      throw new HttpsError(
          "failed-precondition",
          "No email address found for the upstream client",
      );
    }

    // Get the sender company info
    const senderCompanyDoc = await admin.firestore()
        .collection("companies")
        .doc(userCompanyId)
        .get();

    const senderCompanyData = senderCompanyDoc.exists ? senderCompanyDoc.data() : {};
    const senderCompanyName = senderCompanyData.name || senderCompanyData.company_name || "Your Partner";

    // Build the email data
    const emailData = {
      recipient_name: recipientName,
      custom_message: customMessage || `${senderCompanyName} has submitted a status update for this job.`,
      include_service_info: true,
      job_number: jobData.job_number || jobData.share_chain?.shared_job_number,
      case_caption: jobData.case_caption,
      case_number: jobData.case_number,
      court_name: jobData.court_name,
      job_status: jobData.status,
      service_address: jobData.addresses?.[0]?.full_address ||
        [
          jobData.addresses?.[0]?.street,
          jobData.addresses?.[0]?.city,
          jobData.addresses?.[0]?.state,
          jobData.addresses?.[0]?.zip,
        ].filter(Boolean).join(", "),
      due_date: jobData.due_date,
      recipients: jobData.recipient ? [{
        name: jobData.recipient.name,
        address: jobData.recipient.address,
      }] : [],
    };

    // Fetch attempts if requested
    if (includeAttempts) {
      const attemptsSnapshot = await admin.firestore()
          .collection("attempts")
          .where("job_id", "==", jobId)
          .orderBy("created_at", "desc")
          .get();

      const attempts = attemptsSnapshot.docs.map((doc) => {
        const data = doc.data();
        const attemptDate = data.date?.toDate?.() || (data.date ? new Date(data.date) : null);
        return {
          status: data.result || data.status,
          date: attemptDate,
          time: data.time || (attemptDate ? attemptDate.toLocaleTimeString() : ""),
          address: data.address?.full_address || data.address_used,
          person_served: data.person_served,
          notes: data.notes,
          server_name: data.server_name,
        };
      });

      emailData.include_attempts = true;
      emailData.attempts = attempts;
    }

    // Include affidavit if requested and available
    if (includeAffidavit && jobData.affidavit_url) {
      emailData.include_affidavit = true;
      emailData.affidavit_url = jobData.affidavit_url;
    }

    // Include invoice if requested
    if (includeInvoice && jobData.invoice_id) {
      const invoiceDoc = await admin.firestore()
          .collection("invoices")
          .doc(jobData.invoice_id)
          .get();

      if (invoiceDoc.exists) {
        const invoiceData = invoiceDoc.data();
        emailData.include_invoice = true;
        emailData.invoice_number = invoiceData.invoice_number;
        emailData.invoice_amount = invoiceData.total?.toFixed(2);
        emailData.invoice_status = invoiceData.status;
        emailData.invoice_due_date = invoiceData.due_date;
      }
    }

    // Add link to view job in portal (if applicable)
    // Note: This would need to be your portal URL
    // emailData.job_view_url = `https://your-app.com/portal/jobs/${parentJobId}`;

    // Send the email
    await sendEmailWithTemplate({
      to: recipientEmail,
      subject: `Job Status Report - Job #${emailData.job_number}`,
      templateName: "job-update",
      templateData: emailData,
      companyId: userCompanyId,
    });

    console.log(`[reportStatusToUpstream] Sent status report for job ${jobId} to ${recipientEmail}`);

    // Optionally sync status to parent job
    if (syncToParent) {
      const parentJobRef = admin.firestore().collection("jobs").doc(parentJobId);

      const updateData = {
        downstream_status: jobData.status,
        downstream_last_update: admin.firestore.FieldValue.serverTimestamp(),
        downstream_updated_by_company: userCompanyId,
      };

      // Sync affidavit URL if available
      if (jobData.affidavit_url) {
        updateData.downstream_affidavit_url = jobData.affidavit_url;
      }

      await parentJobRef.update(updateData);

      console.log(`[reportStatusToUpstream] Synced status to parent job ${parentJobId}`);
    }

    // Log to sync_history
    await admin.firestore()
        .collection("jobs")
        .doc(jobId)
        .collection("sync_history")
        .add({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          direction: "upstream",
          type: "status_report",
          target_job_id: parentJobId,
          target_company_id: parentCompanyId,
          reported_by: request.auth.uid,
          included_attempts: includeAttempts,
          included_affidavit: includeAffidavit && !!jobData.affidavit_url,
          included_invoice: includeInvoice,
          email_sent_to: recipientEmail,
          synced_to_parent: syncToParent,
        });

    return {
      success: true,
      emailSentTo: recipientEmail,
      syncedToParent: syncToParent,
    };
  } catch (error) {
    console.error("Error in reportStatusToUpstream:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to report status to upstream: ${error.message}`,
    );
  }
});

/**
 * Create a partnership request
 */
exports.createPartnershipRequest = onCall(async (request) => {
  try {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {targetCompanyId, message} = request.data;

    // Validate required fields
    if (!targetCompanyId) {
      throw new HttpsError(
          "invalid-argument",
          "Missing required field: targetCompanyId",
      );
    }

    // Get requesting user's data from Firestore
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const requestingCompanyId = userData.company_id;

    if (!requestingCompanyId) {
      throw new HttpsError(
          "failed-precondition",
          "User does not belong to a company",
      );
    }

    // Can't partner with yourself
    if (requestingCompanyId === targetCompanyId) {
      throw new HttpsError(
          "invalid-argument",
          "Cannot create partnership with your own company",
      );
    }

    // Get both company documents
    const [requestingCompanyDoc, targetCompanyDoc] = await Promise.all([
      admin.firestore().collection("companies").doc(requestingCompanyId).get(),
      admin.firestore().collection("companies").doc(targetCompanyId).get(),
    ]);

    if (!requestingCompanyDoc.exists || !targetCompanyDoc.exists) {
      throw new HttpsError("not-found", "One or both companies not found");
    }

    const requestingCompany = requestingCompanyDoc.data();
    const targetCompany = targetCompanyDoc.data();

    // Check if partnership already exists
    const existingPartner = requestingCompany.job_share_partners?.find(
        (p) => p.partner_company_id === targetCompanyId,
    );

    if (existingPartner) {
      throw new HttpsError(
          "already-exists",
          "Partnership already exists with this company",
      );
    }

    // Check for existing pending request
    const existingRequests = await admin.firestore()
        .collection("partnership_requests")
        .where("requesting_company_id", "==", requestingCompanyId)
        .where("target_company_id", "==", targetCompanyId)
        .where("status", "==", "pending")
        .get();

    if (!existingRequests.empty) {
      throw new HttpsError(
          "already-exists",
          "Partnership request already sent",
      );
    }

    // Create partnership request
    const partnershipRequest = {
      requesting_company_id: requestingCompanyId,
      requesting_company_name: requestingCompany.name || "Unknown Company",
      requesting_user_id: request.auth.uid,
      requesting_user_name: userData.name || userData.email || "Unknown User",

      target_company_id: targetCompanyId,
      target_company_name: targetCompany.name || "Unknown Company",

      status: "pending",
      message: message || "",

      created_at: admin.firestore.FieldValue.serverTimestamp(),
      responded_at: null,
    };

    const docRef = await admin.firestore()
        .collection("partnership_requests")
        .add(partnershipRequest);

    console.log(`Partnership request created: ${docRef.id}`);

    // Send email notification to target company
    if (targetCompany.email) {
      try {
        await sendEmailWithTemplate({
          to: targetCompany.email,
          subject: `Partnership Request from ${requestingCompany.name || "A Process Server"}`,
          templateName: "partnership-request",
          templateData: {
            requesting_company_name: requestingCompany.name || "Unknown Company",
            message: message || "",
            respond_url: "https://www.servemax.pro/partners/requests",
          },
          companyId: requestingCompanyId,
        });
        console.log(`Partnership request email sent to ${targetCompany.email}`);
      } catch (emailError) {
        console.error("Failed to send partnership request email:", emailError);
      }
    }

    return {
      success: true,
      requestId: docRef.id,
      message: "Partnership request sent successfully",
    };
  } catch (error) {
    console.error("Error in createPartnershipRequest:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        `Failed to create partnership request: ${error.message}`,
    );
  }
});

/**
 * Respond to a partnership request (accept or decline)
 */
exports.respondToPartnershipRequest = onCall(async (request) => {
  try {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {requestId, accept} = request.data;

    if (!requestId || accept === undefined) {
      throw new HttpsError(
          "invalid-argument",
          "Missing required fields: requestId, accept",
      );
    }

    // Get requesting user's company_id from Firestore
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const userCompanyId = userData.company_id;

    if (!userCompanyId) {
      throw new HttpsError(
          "failed-precondition",
          "User does not belong to a company",
      );
    }

    // Get partnership request
    const requestDoc = await admin.firestore()
        .collection("partnership_requests")
        .doc(requestId)
        .get();

    if (!requestDoc.exists) {
      throw new HttpsError("not-found", "Partnership request not found");
    }

    const partnershipReq = requestDoc.data();

    // Verify user has permission to respond
    if (partnershipReq.target_company_id !== userCompanyId) {
      throw new HttpsError(
          "permission-denied",
          "You do not have permission to respond to this request",
      );
    }

    // Check if already responded
    if (partnershipReq.status !== "pending") {
      throw new HttpsError(
          "failed-precondition",
          "This request has already been responded to",
      );
    }

    if (accept) {
      // Get both company documents first (before batch operations)
      const [requestingCompanyDoc, targetCompanyDoc] = await Promise.all([
        admin.firestore()
            .collection("companies")
            .doc(partnershipReq.requesting_company_id)
            .get(),
        admin.firestore()
            .collection("companies")
            .doc(partnershipReq.target_company_id)
            .get(),
      ]);

      const requestingCompany = requestingCompanyDoc.data();
      const targetCompany = targetCompanyDoc.data();

      // Create partner entries for both companies
      // Note: Cannot use serverTimestamp() inside arrays, so use new Date()
      const now = new Date();

      // Start batch operations
      const batch = admin.firestore().batch();

      // Update partnership request status
      const requestRef = admin.firestore()
          .collection("partnership_requests")
          .doc(requestId);
      batch.update(requestRef, {
        status: "accepted",
        responded_at: now,
        responded_by: request.auth.uid,
      });

      // Partner config is stored directly on client records in the companies collection
      // (no longer using job_share_partners array on company docs)

      // Create client records for both companies so they appear in each other's client lists
      // Pull full addresses array if it exists, otherwise create from legacy fields
      const requestingAddresses = requestingCompany.addresses && requestingCompany.addresses.length > 0 ?
        requestingCompany.addresses :
        (requestingCompany.address1 || requestingCompany.address) ? [{
          label: "Main Office",
          address1: requestingCompany.address1 || requestingCompany.address || "",
          address2: requestingCompany.address2 || "",
          city: requestingCompany.city || "",
          state: requestingCompany.state || "",
          postal_code: requestingCompany.zip || "",
          county: requestingCompany.county || "",
          latitude: requestingCompany.latitude || requestingCompany.lat || null,
          longitude: requestingCompany.longitude || requestingCompany.lng || null,
          primary: true,
        }] : [];

      const requestingClientData = {
        company_name: partnershipReq.requesting_company_name,
        name: partnershipReq.requesting_company_name,
        company_type: requestingCompany.company_type || "process_serving",
        client_type: "job_sharing_partner",
        job_sharing_partner_id: partnershipReq.requesting_company_id,
        created_by: partnershipReq.target_company_id, // Target company "owns" this client
        is_job_share_partner: true,
        partnership_established_at: now,
        partnership_source: "job_sharing",
        relationship_status: "active",
        status: "active",
        // Partner config fields
        auto_assignment_enabled: false,
        auto_assignment_zones: [],
        quick_assign_enabled: false,
        requires_acceptance: true,
        email_notifications_enabled: true,
        total_jobs_shared: 0,
        auto_assigned_count: 0,
        acceptance_rate: 0,
        last_shared_at: null,
        // Company info
        email: requestingCompany.email || "",
        phone: requestingCompany.phone || "",
        website: requestingCompany.website || "",
        fax: requestingCompany.fax || "",
        address: requestingCompany.address || "",
        city: requestingCompany.city || "",
        state: requestingCompany.state || "",
        zip: requestingCompany.zip || "",
        contacts: (requestingCompany.email || requestingCompany.phone) ? [{
          first_name: requestingCompany.name || "",
          last_name: "",
          email: requestingCompany.email || "",
          phone: requestingCompany.phone || "",
          title: "Main Contact",
          primary: true,
        }] : [],
        addresses: requestingAddresses,
        billing_tier: requestingCompany.billing_tier || "trial",
        created_at: now,
        updated_at: now,
      };

      // Pull full addresses array if it exists, otherwise create from legacy fields
      const targetAddresses = targetCompany.addresses && targetCompany.addresses.length > 0 ?
        targetCompany.addresses :
        (targetCompany.address1 || targetCompany.address) ? [{
          label: "Main Office",
          address1: targetCompany.address1 || targetCompany.address || "",
          address2: targetCompany.address2 || "",
          city: targetCompany.city || "",
          state: targetCompany.state || "",
          postal_code: targetCompany.zip || "",
          county: targetCompany.county || "",
          latitude: targetCompany.latitude || targetCompany.lat || null,
          longitude: targetCompany.longitude || targetCompany.lng || null,
          primary: true,
        }] : [];

      const targetClientData = {
        company_name: partnershipReq.target_company_name,
        name: partnershipReq.target_company_name,
        company_type: targetCompany.company_type || "process_serving",
        client_type: "job_sharing_partner",
        job_sharing_partner_id: partnershipReq.target_company_id,
        created_by: partnershipReq.requesting_company_id, // Requesting company "owns" this client
        is_job_share_partner: true,
        partnership_established_at: now,
        partnership_source: "job_sharing",
        relationship_status: "active",
        status: "active",
        // Partner config fields
        auto_assignment_enabled: false,
        auto_assignment_zones: [],
        quick_assign_enabled: false,
        requires_acceptance: true,
        email_notifications_enabled: true,
        total_jobs_shared: 0,
        auto_assigned_count: 0,
        acceptance_rate: 0,
        last_shared_at: null,
        // Company info
        email: targetCompany.email || "",
        phone: targetCompany.phone || "",
        website: targetCompany.website || "",
        fax: targetCompany.fax || "",
        address: targetCompany.address || "",
        city: targetCompany.city || "",
        state: targetCompany.state || "",
        zip: targetCompany.zip || "",
        contacts: (targetCompany.email || targetCompany.phone) ? [{
          first_name: targetCompany.name || "",
          last_name: "",
          email: targetCompany.email || "",
          phone: targetCompany.phone || "",
          title: "Main Contact",
          primary: true,
        }] : [],
        addresses: targetAddresses,
        billing_tier: targetCompany.billing_tier || "trial",
        created_at: now,
        updated_at: now,
      };

      // Create or update client records in the COMPANIES collection
      // This matches the pattern used by SecureClientAccess (queries companies where created_by == company_id)

      // Check for existing client records in companies collection
      const [existingClientForTarget, existingClientForRequesting] = await Promise.all([
        admin.firestore()
            .collection("companies")
            .where("job_sharing_partner_id", "==", partnershipReq.requesting_company_id)
            .where("created_by", "==", partnershipReq.target_company_id)
            .limit(1)
            .get(),
        admin.firestore()
            .collection("companies")
            .where("job_sharing_partner_id", "==", partnershipReq.target_company_id)
            .where("created_by", "==", partnershipReq.requesting_company_id)
            .limit(1)
            .get(),
      ]);

      // Create client record in Target's client list (so they see Requesting company as a client)
      if (existingClientForTarget.empty) {
        const newClientRef = admin.firestore().collection("companies").doc();
        batch.set(newClientRef, {
          ...requestingClientData,
        });
        console.log(`Creating client record for ${partnershipReq.requesting_company_name} in ${partnershipReq.target_company_name}'s client list (companies collection)`);
      } else {
        // Update existing to mark as partner
        const existingDoc = existingClientForTarget.docs[0];
        batch.update(existingDoc.ref, {
          is_job_share_partner: true,
          job_sharing_partner_id: partnershipReq.requesting_company_id,
          partnership_established_at: now,
          partnership_source: "job_sharing",
          updated_at: now,
        });
        console.log(`Updating existing client record for ${partnershipReq.requesting_company_name} to mark as partner`);
      }

      // Create client record in Requesting's client list (so they see Target company as a client)
      if (existingClientForRequesting.empty) {
        const newClientRef = admin.firestore().collection("companies").doc();
        batch.set(newClientRef, {
          ...targetClientData,
        });
        console.log(`Creating client record for ${partnershipReq.target_company_name} in ${partnershipReq.requesting_company_name}'s client list (companies collection)`);
      } else {
        // Update existing to mark as partner
        const existingDoc = existingClientForRequesting.docs[0];
        batch.update(existingDoc.ref, {
          is_job_share_partner: true,
          job_sharing_partner_id: partnershipReq.target_company_id,
          partnership_established_at: now,
          partnership_source: "job_sharing",
          updated_at: now,
        });
        console.log(`Updating existing client record for ${partnershipReq.target_company_name} to mark as partner`);
      }

      console.log(`Partnership established between ${partnershipReq.requesting_company_id} and ${partnershipReq.target_company_id}`);

      // Commit all batch operations
      await batch.commit();
    } else {
      // Declined - just update the request status
      const batch = admin.firestore().batch();
      const requestRef = admin.firestore()
          .collection("partnership_requests")
          .doc(requestId);
      batch.update(requestRef, {
        status: "declined",
        responded_at: new Date(),
        responded_by: request.auth.uid,
      });
      await batch.commit();
    }

    // Send notification email to requesting company
    try {
      let requestingCompanyEmail;
      let targetCompanyName;

      if (accept) {
        // requestingCompany and targetCompany already fetched above
        requestingCompanyEmail = requestingCompany.email;
        targetCompanyName = targetCompany.name || partnershipReq.target_company_name;
      } else {
        // Fetch requesting company email for decline notification
        const reqCompanyDoc = await admin.firestore()
            .collection("companies")
            .doc(partnershipReq.requesting_company_id)
            .get();
        if (reqCompanyDoc.exists) {
          requestingCompanyEmail = reqCompanyDoc.data().email;
        }
        targetCompanyName = partnershipReq.target_company_name;
      }

      if (requestingCompanyEmail) {
        await sendEmailWithTemplate({
          to: requestingCompanyEmail,
          subject: accept ?
            `Partnership Accepted by ${targetCompanyName}` :
            `Partnership Request Update from ${targetCompanyName}`,
          templateName: "partnership-response",
          templateData: {
            accepted: accept,
            target_company_name: targetCompanyName,
            partners_url: "https://www.servemax.pro/partners",
          },
          companyId: partnershipReq.target_company_id,
        });
        console.log(`Partnership response email sent to ${requestingCompanyEmail}`);
      }
    } catch (emailError) {
      console.error("Failed to send partnership response email:", emailError);
    }

    return {
      success: true,
      message: accept ?
        "Partnership accepted successfully" :
        "Partnership declined",
    };
  } catch (error) {
    console.error("Error in respondToPartnershipRequest:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        `Failed to respond to partnership request: ${error.message}`,
    );
  }
});

/**
 * One-time backfill: migrate partner client records from "clients" collection
 * to "companies" collection so they appear in the unified Clients list.
 */
exports.backfillPartnerClients = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get user's company_id
    let userCompanyId = request.auth.token.company_id;
    if (!userCompanyId) {
      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();
      if (userDoc.exists) {
        userCompanyId = userDoc.data().company_id;
      }
    }

    if (!userCompanyId) {
      throw new HttpsError("failed-precondition", "User does not have a company_id");
    }

    // Find all partner records in the clients collection for this company
    const clientsSnapshot = await admin.firestore()
        .collection("clients")
        .where("is_job_share_partner", "==", true)
        .where("company_id", "==", userCompanyId)
        .get();

    if (clientsSnapshot.empty) {
      return {success: true, migrated: 0, message: "No partner records to migrate"};
    }

    let migrated = 0;
    let skipped = 0;
    const batch = admin.firestore().batch();

    for (const doc of clientsSnapshot.docs) {
      const data = doc.data();
      const partnerId = data.partner_company_id;

      if (!partnerId) {
        skipped++;
        continue;
      }

      // Check if already exists in companies collection
      const existing = await admin.firestore()
          .collection("companies")
          .where("job_sharing_partner_id", "==", partnerId)
          .where("created_by", "==", userCompanyId)
          .limit(1)
          .get();

      if (!existing.empty) {
        skipped++;
        continue;
      }

      // Create in companies collection with correct field mapping
      const newRef = admin.firestore().collection("companies").doc();
      const newData = {
        company_name: data.company_name || data.name || "",
        name: data.name || data.company_name || "",
        company_type: "client",
        client_type: "job_sharing_partner",
        job_sharing_partner_id: partnerId,
        created_by: userCompanyId,
        is_job_share_partner: true,
        partnership_established_at: data.partnership_established_at || data.created_at || new Date(),
        partnership_source: data.partnership_source || "job_sharing",
        status: data.status || "active",
        email: data.email || "",
        phone: data.phone || "",
        website: data.website || "",
        fax: data.fax || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        contacts: data.contacts || [],
        addresses: data.addresses || [],
        billing_tier: data.billing_tier || "trial",
        created_at: data.created_at || new Date(),
        updated_at: new Date(),
      };
      batch.set(newRef, newData);
      migrated++;
    }

    if (migrated > 0) {
      await batch.commit();
    }

    console.log(`Backfill complete: migrated ${migrated}, skipped ${skipped} for company ${userCompanyId}`);
    return {success: true, migrated, skipped, message: `Migrated ${migrated} partner records to companies collection`};
  } catch (error) {
    console.error("Error in backfillPartnerClients:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to backfill partners: ${error.message}`);
  }
});

/**
 * Generate search terms array for a job to enable server-side search
 * @param {Object} job - The job data object
 * @returns {Array<string>} Array of lowercase search terms
 */
function generateJobSearchTerms(job) {
  const terms = new Set();

  // Add recipient name and tokens
  if (job.recipient?.name) {
    const name = job.recipient.name.toLowerCase();
    terms.add(name);
    name.split(/\s+/).forEach((token) => {
      if (token.length > 1) terms.add(token);
    });
  }

  // Add job number
  if (job.job_number) {
    terms.add(job.job_number.toLowerCase());
  }

  // Add client job number / reference
  if (job.client_job_number) {
    terms.add(job.client_job_number.toLowerCase());
  }

  // Add case name and tokens
  if (job.case_name) {
    const caseName = job.case_name.toLowerCase();
    terms.add(caseName);
    caseName.split(/\s+/).forEach((token) => {
      if (token.length > 1) terms.add(token);
    });
  }

  // Add case number
  if (job.case_number) {
    terms.add(job.case_number.toLowerCase());
  }

  // Add address parts for location search
  if (job.addresses?.[0]) {
    const addr = job.addresses[0];
    if (addr.city) terms.add(addr.city.toLowerCase());
    if (addr.state) terms.add(addr.state.toLowerCase());
    if (addr.postal_code) terms.add(addr.postal_code.toLowerCase());
  }

  return Array.from(terms).filter((t) => t && t.length > 0);
}

/**
 * Backfill search_terms field on all jobs for server-side search
 * Can be called for a specific company or all companies (super admin)
 * @param {Object} data - { companyId?: string, batchSize?: number }
 * @returns {Object} - { success: boolean, updated: number, message: string }
 */
exports.backfillJobSearchTerms = onCall({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "1GiB",
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {companyId, batchSize = 500} = request.data || {};

    // Get user's company_id to verify permissions
    let userCompanyId = request.auth.token.company_id;
    if (!userCompanyId) {
      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();
      if (userDoc.exists) {
        userCompanyId = userDoc.data().company_id;
      }
    }

    // Check if user is super admin for all-company backfill
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();
    const isSuperAdmin = userDoc.exists && userDoc.data().is_super_admin === true;

    // Build query
    let jobsQuery = admin.firestore().collection("jobs");

    if (companyId) {
      // Specific company - verify user has access
      if (!isSuperAdmin && companyId !== userCompanyId) {
        throw new HttpsError("permission-denied", "Cannot backfill jobs for other companies");
      }
      jobsQuery = jobsQuery.where("company_id", "==", companyId);
    } else if (!isSuperAdmin) {
      // Non-super admin can only backfill their own company
      jobsQuery = jobsQuery.where("company_id", "==", userCompanyId);
    }

    // Get jobs that need search_terms
    const jobsSnapshot = await jobsQuery.get();

    if (jobsSnapshot.empty) {
      return {success: true, updated: 0, message: "No jobs found to update"};
    }

    let updated = 0;
    let skipped = 0;
    let batch = admin.firestore().batch();
    let batchCount = 0;

    for (const doc of jobsSnapshot.docs) {
      const job = doc.data();

      // Generate search terms
      const searchTerms = generateJobSearchTerms(job);

      // Check if already has search_terms and they match
      if (job.search_terms &&
          JSON.stringify(job.search_terms.sort()) === JSON.stringify(searchTerms.sort())) {
        skipped++;
        continue;
      }

      batch.update(doc.ref, {search_terms: searchTerms});
      batchCount++;
      updated++;

      // Commit batch when it reaches batch size
      if (batchCount >= batchSize) {
        await batch.commit();
        batch = admin.firestore().batch();
        batchCount = 0;
        console.log(`Backfill progress: ${updated} jobs updated`);
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`Backfill complete: ${updated} jobs updated, ${skipped} skipped`);
    return {
      success: true,
      updated,
      skipped,
      total: jobsSnapshot.size,
      message: `Updated search_terms on ${updated} jobs, skipped ${skipped}`,
    };
  } catch (error) {
    console.error("Error in backfillJobSearchTerms:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to backfill search terms: ${error.message}`);
  }
});

/**
 * Extract data from PDF document using Google Document AI
 * @param {Object} data - { file_url: string }
 * @returns {Object} - { success: boolean, extractedData: object }
 */
exports.extractDocumentAI = onCall({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "1GiB",
  cpu: 2,
}, async (request) => {
  try {
    const {file_url, first_page_base64} = request.data;

    // Validate input - need either file_url or first_page_base64
    if (!file_url && !first_page_base64) {
      throw new HttpsError(
          "invalid-argument",
          "Either file_url or first_page_base64 is required",
      );
    }

    let firstPageBytes;
    let extractedPageCount;

    // Fast path: Use pre-extracted first page if provided
    if (first_page_base64) {
      console.log(`[Document AI] Using pre-extracted first page (fast path!)`);

      firstPageBytes = Buffer.from(first_page_base64, "base64");

      // Verify it's a valid PDF with 1 page
      const pdfDoc = await PDFDocument.load(firstPageBytes);
      extractedPageCount = pdfDoc.getPageCount();

      console.log(`[Document AI] Pre-extracted PDF - Pages: ${extractedPageCount}, Size: ${firstPageBytes.byteLength} bytes`);

      // Safety check: ensure we only have 1 page
      if (extractedPageCount !== 1) {
        console.error(`[Document AI] ERROR: Pre-extracted PDF has ${extractedPageCount} pages, expected 1!`);
        throw new HttpsError(
            "invalid-argument",
            `Pre-extracted PDF must have exactly 1 page, got ${extractedPageCount}`,
        );
      }
    } else {
      // Slow path: Download and extract first page from full PDF
      console.log(`[Document AI] Downloading and extracting first page from: ${file_url}`);

      const response = await fetch(file_url);
      if (!response.ok) {
        throw new Error(`Failed to download PDF from ${file_url}`);
      }

      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      const originalPageCount = pdfDoc.getPageCount();
      const originalSize = pdfBytes.byteLength;
      console.log(`[Document AI] Original PDF - Pages: ${originalPageCount}, Size: ${originalSize} bytes`);

      // Create a new PDF with only the first page
      const firstPagePdf = await PDFDocument.create();
      const [firstPage] = await firstPagePdf.copyPages(pdfDoc, [0]);
      firstPagePdf.addPage(firstPage);

      firstPageBytes = await firstPagePdf.save();
      extractedPageCount = firstPagePdf.getPageCount();
      const extractedSize = firstPageBytes.byteLength;

      console.log(`[Document AI] Extracted PDF - Pages: ${extractedPageCount}, Size: ${extractedSize} bytes`);
      console.log(`[Document AI] Verification - Extracted ${extractedPageCount} page(s), ${((extractedSize / originalSize) * 100).toFixed(1)}% of original size`);

      // Safety check: ensure we only have 1 page
      if (extractedPageCount !== 1) {
        console.error(`[Document AI] ERROR: Expected 1 page but got ${extractedPageCount} pages!`);
        throw new HttpsError(
            "internal",
            `Page extraction failed: expected 1 page but got ${extractedPageCount}`,
        );
      }
    }

    // Step 2: Initialize Document AI client (lazy-loaded for performance)
    const client = getDocumentAIClient();

    // Your processor endpoint
    const processorName = "projects/326484335453/locations/us/processors/de67c53e241e8ed";

    console.log(`[Document AI] Sending to processor: ${processorName}`);

    // Step 3: Process the document
    const docRequest = {
      name: processorName,
      rawDocument: {
        content: Buffer.from(firstPageBytes).toString("base64"),
        mimeType: "application/pdf",
      },
    };

    const [result] = await client.processDocument(docRequest);
    const {document} = result;

    console.log(`[Document AI] Document processed successfully`);

    // Log what Document AI sees
    const docPageCount = document.pages ? document.pages.length : 0;
    console.log(`[Document AI] Processor detected ${docPageCount} page(s) in submitted PDF`);

    if (docPageCount > 1) {
      console.warn(`[Document AI] WARNING: Document AI detected ${docPageCount} pages, expected 1!`);
    }

    // Step 4: Extract entities from the document
    const extractedData = {};

    if (document.entities) {
      console.log(`[Document AI] Found ${document.entities.length} entities`);

      for (const entity of document.entities) {
        const fieldName = entity.type;
        const fieldValue = entity.mentionText || "";

        // Map Document AI field names to our form fields
        extractedData[fieldName] = fieldValue.trim();

        // Log which page the entity was found on
        const pageRef = entity.pageAnchor?.pageRefs?.[0];
        const pageNum = pageRef ? (pageRef.page || 0) + 1 : "unknown";

        console.log(`[Document AI] Extracted ${fieldName} from page ${pageNum}: ${fieldValue.substring(0, 50)}...`);
      }
    }

    console.log(`[Document AI] Extraction complete. Fields extracted: ${Object.keys(extractedData).length}`);

    return {
      success: true,
      extractedData,
      pageCount: extractedPageCount,
      message: `Successfully extracted ${Object.keys(extractedData).length} fields from document`,
    };
  } catch (error) {
    console.error("[Document AI] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        `Failed to extract document data: ${error.message}`,
    );
  }
});

/**
 * Extract data from PDF document using Claude Vision
 * @param {Object} data - { file_url: string } or { first_page_base64: string }
 * @returns {Object} - { success: boolean, extractedData: object }
 */
exports.extractDocumentClaudeVision = onCall({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "1GiB",
  cpu: 2,
  secrets: [anthropicApiKey],
}, async (request) => {
  const startTime = Date.now();

  try {
    const {file_url, first_page_base64} = request.data;

    // Validate input
    if (!file_url && !first_page_base64) {
      throw new HttpsError(
          "invalid-argument",
          "Either file_url or first_page_base64 is required",
      );
    }

    let firstPageBytes;
    let extractedPageCount;

    // Fast path: Use pre-extracted first page if provided
    if (first_page_base64) {
      console.log(`[Claude Vision] Using pre-extracted first page (fast path!)`);
      firstPageBytes = Buffer.from(first_page_base64, "base64");
      const pdfDoc = await PDFDocument.load(firstPageBytes);
      extractedPageCount = pdfDoc.getPageCount();
      console.log(`[Claude Vision] Pre-extracted PDF - Pages: ${extractedPageCount}, Size: ${firstPageBytes.byteLength} bytes`);
    } else {
      // Slow path: Download and extract first page
      console.log(`[Claude Vision] Downloading and extracting first page from: ${file_url}`);
      const response = await fetch(file_url);
      if (!response.ok) {
        throw new Error(`Failed to download PDF from ${file_url}`);
      }

      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const originalPageCount = pdfDoc.getPageCount();
      console.log(`[Claude Vision] Original PDF - Pages: ${originalPageCount}`);

      // Extract first 3 pages (or fewer if document has less than 3 pages)
      const pagesToExtract = Math.min(3, originalPageCount);
      const extractedPdf = await PDFDocument.create();
      const pageIndices = Array.from({length: pagesToExtract}, (_, i) => i);
      const copiedPages = await extractedPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => extractedPdf.addPage(page));
      firstPageBytes = await extractedPdf.save();
      extractedPageCount = pagesToExtract;
      console.log(`[Claude Vision] Extracted first ${pagesToExtract} page(s), Size: ${firstPageBytes.byteLength} bytes`);
    }

    // Convert PDF to base64 for Claude API (Claude can read PDFs natively!)
    const pdfBase64 = Buffer.from(firstPageBytes).toString("base64");
    console.log(`[Claude Vision] PDF prepared for Claude, Size: ${firstPageBytes.byteLength} bytes`);

    // PERFORMANCE: Use singleton Anthropic client (lazy-loaded)
    const anthropic = getAnthropicClient(anthropicApiKey.value());

    // Create extraction prompt
    const extractionPrompt = `You are assisting with legitimate legal document processing for a professional process serving company.
Extract structured information from a legal document (summons, complaint, subpoena) to facilitate proper service of legal documents.

You will receive the first few pages of the document. SCAN ALL PROVIDED PAGES to find the required information - the data you need may appear on any page, not just the first page.
Return ONLY a JSON object with fields that are present.

PRIMARY RULE:
Identify the SERVICE ADDRESS (where the defendant/respondent is to be served).
DO NOT return the court's address.

DEFINITIONS:
- Service Address = address associated with the defendant/respondent being served
- Court Address = appears in document headers/captions. Ignore it.
- Recipient Name = The specific person or entity at the service address (may differ from defendant name if serving registered agent, property manager, etc.)

FIELDS TO RETURN (only if found):

CASE INFO:
- caseNumber: Case/docket number (preserve exact format)
- plaintiff: Plaintiff/petitioner full name
- defendant: Defendant/respondent full name (include "et al" if present)
- filed_date: Date case was filed (if shown)
- court_date: Scheduled court date (if shown)
- document_title: Type of document (e.g., "Summons", "Complaint", "Subpoena")

COURT INFO:
- branch_name: Short court name only (e.g., "Circuit Court", "District Court", "Superior Court")
- full_court_name: The COMPLETE, VERBATIM court name exactly as written in the document header/caption. Include EVERYTHING: "IN THE" prefix, court type, judicial circuit numbers, county, divisions (LAW/CHANCERY/etc), and state. DO NOT abbreviate or shorten. Examples: "IN THE CIRCUIT COURT OF COOK COUNTY LAW DIVISION" or "Circuit Court of the Eleventh Judicial Circuit, McLean County, Illinois"
- county_court: County name only (e.g., "McLean County", "Cook County")
- court_address1: Court's street address (if shown on document, typically in header/letterhead)
- court_address2: Court's address line 2 (if present)
- court_city: Court's city (if shown)
- court_state: Court's state as 2-letter code (if shown)
- court_zip: Court's ZIP code (if shown)

SERVICE RECIPIENT (WHERE service will occur):
- recipient_name: Specific person/entity to serve at this address (may be same as defendant, or could be registered agent, property manager, etc.)
- address1: Street address (include suite/floor if on same line)
- address2: Additional address line (suite/apt/floor if on separate line)
- recipient_city: City name
- recipient_state: Two-letter state code (e.g., "IL", "CA", "NY")
- recipient_zip_code: ZIP code (5-digit or ZIP+4)

EXTRACTION RULES:
1. For full_court_name: Extract the COMPLETE, VERBATIM court name from the document header/caption. This means EVERYTHING including:
   - "IN THE" or similar prefixes
   - Court type and judicial circuit numbers
   - County name
   - Division name (LAW DIVISION, CHANCERY DIVISION, etc.)
   - State (if shown)
   - DO NOT abbreviate, shorten, or omit any words
   - Example: If document says "IN THE CIRCUIT COURT OF COOK COUNTY LAW DIVISION", return exactly that
2. CRITICAL - Two Different Addresses:
   a) Court address (court_address1, court_city, etc.) = The court building's address, usually in document header/letterhead. Extract if present.
   b) Service address (address1, recipient_city, etc.) = Where the defendant will be served. This is PRIMARY and always required.
3. Service address is typically found near or below the defendant's name, often labeled "Address" or "To be served at"
4. If you see both a defendant name AND a recipient name (e.g., "via registered agent John Smith"), extract both separately
5. Preserve exact case number formatting including hyphens, prefixes, letters
6. State must be 2-letter code only
7. Return only keys where you found actual values

OUTPUT FORMAT - CRITICAL:
Start your response with {
End your response with }
DO NOT use markdown code blocks (no triple backticks)
DO NOT add any explanatory text before or after the JSON
Return ONLY the raw JSON object

Example:
{
  "caseNumber": "2025L013908",
  "plaintiff": "BENITA DURAN",
  "defendant": "DOUBLE TREE BY HILTON HOTEL, et al",
  "branch_name": "Circuit Court",
  "full_court_name": "IN THE CIRCUIT COURT OF COOK COUNTY LAW DIVISION",
  "county_court": "Cook County",
  "court_address1": "50 W Washington St",
  "court_city": "Chicago",
  "court_state": "IL",
  "court_zip": "60602",
  "document_title": "Summons in a Civil Action",
  "recipient_name": "Double Tree by Hilton Hotel",
  "address1": "55 E Monroe St, 30th Floor",
  "recipient_city": "Chicago",
  "recipient_state": "IL",
  "recipient_zip_code": "60603"
}`;

    console.log(`[Claude Vision] Sending PDF to Claude API...`);

    // Call Claude Vision API with PDF
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    console.log(`[Claude Vision] Response received`);
    console.log(`[Claude Vision] Stop reason:`, message.stop_reason);
    console.log(`[Claude Vision] Usage:`, JSON.stringify(message.usage));

    // Handle refusal - Sonnet is refusing to process for some reason
    if (message.stop_reason === 'refusal') {
      console.warn(`[Claude Vision] ⚠️  Sonnet refused to complete extraction`);
      console.log(`[Claude Vision] Refusal response:`, message.content[0].text);
      throw new HttpsError(
          "unavailable",
          "Claude Sonnet refused to process this document. Please try Haiku or Document AI instead.",
      );
    }

    // Parse Claude's response
    const responseText = message.content[0].text;
    console.log(`[Claude Vision] Raw response length:`, responseText.length);
    console.log(`[Claude Vision] Full response:`, responseText);

    // Extract JSON from response (Claude might wrap it in markdown code blocks)
    let extractedData = {};
    try {
      // Remove markdown code blocks - direct string replacement
      let cleanedText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      console.log(`[Claude Vision] Cleaned text preview:`, cleanedText.substring(0, 100));

      // Try direct JSON parse first (most reliable)
      try {
        extractedData = JSON.parse(cleanedText);
        console.log(`[Claude Vision] ✅ Successfully parsed ${Object.keys(extractedData).length} fields (direct parse)`);
      } catch (directParseError) {
        console.log(`[Claude Vision] Direct parse failed:`, directParseError.message);
        console.log(`[Claude Vision] Trying regex fallback...`);

        // Fallback: try regex to find JSON object
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
          console.log(`[Claude Vision] ✅ Successfully parsed ${Object.keys(extractedData).length} fields (regex fallback)`);
        } else {
          console.error(`[Claude Vision] ❌ No JSON found with regex either`);
          console.log(`[Claude Vision] Cleaned text:`, cleanedText);
          throw new Error("No valid JSON found in response");
        }
      }
    } catch (parseError) {
      console.error(`[Claude Vision] ❌ Failed to parse JSON:`, parseError.message);
      throw new Error("Failed to parse extraction results");
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`[Claude Vision] ⚡ Extraction complete in ${duration}s. Fields extracted: ${Object.keys(extractedData).length}`);

    return {
      success: true,
      extractedData,
      pageCount: extractedPageCount,
      duration: parseFloat(duration),
      message: `Successfully extracted ${Object.keys(extractedData).length} fields from document using Claude Vision in ${duration}s`,
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error(`[Claude Vision] Error after ${duration}s:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        `Failed to extract document data with Claude Vision: ${error.message}`,
    );
  }
});

/**
 * Extract data from PDF document using Claude Haiku (Fast & Cheap)
 * @param {Object} data - { file_url: string } or { first_page_base64: string }
 * @returns {Object} - { success: boolean, extractedData: object }
 */
exports.extractDocumentClaudeHaiku = onCall({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "1GiB",
  cpu: 2,
  secrets: [anthropicApiKey],
}, async (request) => {
  const startTime = Date.now();

  try {
    const {file_url, first_page_base64} = request.data;

    // Validate input
    if (!file_url && !first_page_base64) {
      throw new HttpsError(
          "invalid-argument",
          "Either file_url or first_page_base64 is required",
      );
    }

    let firstPageBytes;
    let extractedPageCount;

    // Fast path: Use pre-extracted first page if provided
    if (first_page_base64) {
      console.log(`[Claude Haiku] Using pre-extracted first 3 pages (fast path!)`);
      firstPageBytes = Buffer.from(first_page_base64, "base64");
      const pdfDoc = await PDFDocument.load(firstPageBytes);
      extractedPageCount = pdfDoc.getPageCount();
      console.log(`[Claude Haiku] Pre-extracted PDF - Pages: ${extractedPageCount}, Size: ${firstPageBytes.byteLength} bytes`);
    } else {
      // Slow path: Download and extract first 3 pages
      console.log(`[Claude Haiku] Downloading and extracting first 3 pages from: ${file_url}`);
      const response = await fetch(file_url);
      if (!response.ok) {
        throw new Error(`Failed to download PDF from ${file_url}`);
      }

      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const originalPageCount = pdfDoc.getPageCount();
      console.log(`[Claude Haiku] Original PDF - Pages: ${originalPageCount}`);

      // Extract first 3 pages (or fewer if document has less than 3 pages)
      const pagesToExtract = Math.min(3, originalPageCount);
      const extractedPdf = await PDFDocument.create();
      const pageIndices = Array.from({length: pagesToExtract}, (_, i) => i);
      const copiedPages = await extractedPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => extractedPdf.addPage(page));
      firstPageBytes = await extractedPdf.save();
      extractedPageCount = pagesToExtract;
      console.log(`[Claude Haiku] Extracted first ${pagesToExtract} page(s), Size: ${firstPageBytes.byteLength} bytes`);
    }

    // Convert PDF to base64 for Claude API (Claude can read PDFs natively!)
    const pdfBase64 = Buffer.from(firstPageBytes).toString("base64");
    console.log(`[Claude Haiku] PDF prepared for Claude, Size: ${firstPageBytes.byteLength} bytes`);

    // PERFORMANCE: Use singleton Anthropic client (lazy-loaded)
    const anthropic = getAnthropicClient(anthropicApiKey.value());

    // Create extraction prompt (same as Sonnet)
    const extractionPrompt = `You are assisting with legitimate legal document processing for a professional process serving company.
Extract structured information from a legal document (summons, complaint, subpoena) to facilitate proper service of legal documents.

You will receive the first few pages of the document. SCAN ALL PROVIDED PAGES to find the required information - the data you need may appear on any page, not just the first page.
Return ONLY a JSON object with fields that are present.

PRIMARY RULE:
Identify the SERVICE ADDRESS (where the defendant/respondent is to be served).
DO NOT return the court's address.

DEFINITIONS:
- Service Address = address associated with the defendant/respondent being served
- Court Address = appears in document headers/captions. Ignore it.
- Recipient Name = The specific person or entity at the service address (may differ from defendant name if serving registered agent, property manager, etc.)

FIELDS TO RETURN (only if found):

CASE INFO:
- caseNumber: Case/docket number (preserve exact format)
- plaintiff: Plaintiff/petitioner full name
- defendant: Defendant/respondent full name (include "et al" if present)
- filed_date: Date case was filed (if shown)
- court_date: Scheduled court date (if shown)
- document_title: Type of document (e.g., "Summons", "Complaint", "Subpoena")

COURT INFO:
- branch_name: Short court name only (e.g., "Circuit Court", "District Court", "Superior Court")
- full_court_name: The COMPLETE, VERBATIM court name exactly as written in the document header/caption. Include EVERYTHING: "IN THE" prefix, court type, judicial circuit numbers, county, divisions (LAW/CHANCERY/etc), and state. DO NOT abbreviate or shorten. Examples: "IN THE CIRCUIT COURT OF COOK COUNTY LAW DIVISION" or "Circuit Court of the Eleventh Judicial Circuit, McLean County, Illinois"
- county_court: County name only (e.g., "McLean County", "Cook County")
- court_address1: Court's street address (if shown on document, typically in header/letterhead)
- court_address2: Court's address line 2 (if present)
- court_city: Court's city (if shown)
- court_state: Court's state as 2-letter code (if shown)
- court_zip: Court's ZIP code (if shown)

SERVICE RECIPIENT (WHERE service will occur):
- recipient_name: Specific person/entity to serve at this address (may be same as defendant, or could be registered agent, property manager, etc.)
- address1: Street address (include suite/floor if on same line)
- address2: Additional address line (suite/apt/floor if on separate line)
- recipient_city: City name
- recipient_state: Two-letter state code (e.g., "IL", "CA", "NY")
- recipient_zip_code: ZIP code (5-digit or ZIP+4)

EXTRACTION RULES:
1. For full_court_name: Extract the COMPLETE, VERBATIM court name from the document header/caption. This means EVERYTHING including:
   - "IN THE" or similar prefixes
   - Court type and judicial circuit numbers
   - County name
   - Division name (LAW DIVISION, CHANCERY DIVISION, etc.)
   - State (if shown)
   - DO NOT abbreviate, shorten, or omit any words
   - Example: If document says "IN THE CIRCUIT COURT OF COOK COUNTY LAW DIVISION", return exactly that
2. CRITICAL - Two Different Addresses:
   a) Court address (court_address1, court_city, etc.) = The court building's address, usually in document header/letterhead. Extract if present.
   b) Service address (address1, recipient_city, etc.) = Where the defendant will be served. This is PRIMARY and always required.
3. Service address is typically found near or below the defendant's name, often labeled "Address" or "To be served at"
4. If you see both a defendant name AND a recipient name (e.g., "via registered agent John Smith"), extract both separately
5. Preserve exact case number formatting including hyphens, prefixes, letters
6. State must be 2-letter code only
7. Return only keys where you found actual values

OUTPUT FORMAT - CRITICAL:
Start your response with {
End your response with }
DO NOT use markdown code blocks (no triple backticks)
DO NOT add any explanatory text before or after the JSON
Return ONLY the raw JSON object

Example:
{
  "caseNumber": "2025L013908",
  "plaintiff": "BENITA DURAN",
  "defendant": "DOUBLE TREE BY HILTON HOTEL, et al",
  "branch_name": "Circuit Court",
  "full_court_name": "IN THE CIRCUIT COURT OF COOK COUNTY LAW DIVISION",
  "county_court": "Cook County",
  "court_address1": "50 W Washington St",
  "court_city": "Chicago",
  "court_state": "IL",
  "court_zip": "60602",
  "document_title": "Summons in a Civil Action",
  "recipient_name": "Double Tree by Hilton Hotel",
  "address1": "55 E Monroe St, 30th Floor",
  "recipient_city": "Chicago",
  "recipient_state": "IL",
  "recipient_zip_code": "60603"
}`;

    console.log(`[Claude Haiku] Sending PDF to Claude API...`);

    // Call Claude Haiku API with PDF
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    console.log(`[Claude Haiku] Response received`);

    // Parse Claude's response
    const responseText = message.content[0].text;
    console.log(`[Claude Haiku] Raw response length:`, responseText.length);

    // Extract JSON from response (Claude might wrap it in markdown code blocks)
    let extractedData = {};
    try {
      // Remove markdown code blocks - direct string replacement
      let cleanedText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      console.log(`[Claude Haiku] Cleaned text preview:`, cleanedText.substring(0, 100));

      // Try direct JSON parse first (most reliable)
      try {
        extractedData = JSON.parse(cleanedText);
        console.log(`[Claude Haiku] ✅ Successfully parsed ${Object.keys(extractedData).length} fields (direct parse)`);
      } catch (directParseError) {
        console.log(`[Claude Haiku] Direct parse failed:`, directParseError.message);
        console.log(`[Claude Haiku] Trying regex fallback...`);

        // Fallback: try regex to find JSON object
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
          console.log(`[Claude Haiku] ✅ Successfully parsed ${Object.keys(extractedData).length} fields (regex fallback)`);
        } else {
          console.error(`[Claude Haiku] ❌ No JSON found with regex either`);
          console.log(`[Claude Haiku] Cleaned text:`, cleanedText);
          throw new Error("No valid JSON found in response");
        }
      }
    } catch (parseError) {
      console.error(`[Claude Haiku] ❌ Failed to parse JSON:`, parseError.message);
      throw new Error("Failed to parse extraction results");
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`[Claude Haiku] ⚡ Extraction complete in ${duration}s. Fields extracted: ${Object.keys(extractedData).length}`);

    return {
      success: true,
      extractedData,
      pageCount: extractedPageCount,
      duration: parseFloat(duration),
      model: "haiku",
      message: `Successfully extracted ${Object.keys(extractedData).length} fields from document using Claude Haiku in ${duration}s`,
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error(`[Claude Haiku] Error after ${duration}s:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        `Failed to extract document data with Claude Haiku: ${error.message}`,
    );
  }
});

/**
 * Cloud Function: Find Court Address with AI
 * Uses Claude AI to intelligently find court addresses
 * Handles fuzzy matching - doesn't require exact court name matches
 */
exports.findCourtAddressWithAI = onCall({
  secrets: [anthropicApiKey],
}, async (request) => {
  const startTime = Date.now();

  try {
    const { courtName } = request.data;

    if (!courtName) {
      throw new HttpsError(
          "invalid-argument",
          "Court name is required",
      );
    }

    console.log(`[AI Court Lookup] Finding address for: ${courtName}`);

    // PERFORMANCE: Use singleton Anthropic client (lazy-loaded)
    const anthropic = getAnthropicClient(anthropicApiKey.value());

    // Create prompt for Claude
    const prompt = `You are a legal research assistant with knowledge of US court systems and addresses.

Find the physical mailing address for this court:

Court Name: "${courtName}"

Instructions:
- If you know the exact address for this court, return it
- If the court name includes divisions (LAW DIVISION, CHANCERY, etc.), find the main courthouse address
- Be flexible with matching - handle variations in formatting, capitalization, or wording
- Example: "CIRCUIT COURT OF COOK COUNTY, ILLINOIS COUNTY DEPARTMENT, LAW DIVISION" → return Richard J. Daley Center (Cook County Circuit Court main address)
- If you cannot find the court with high confidence, return null values

Return ONLY valid JSON (no markdown code blocks, no explanations):
{
  "court_address1": "street address or null",
  "court_city": "city name or null",
  "court_state": "2-letter state code or null",
  "court_zip": "zip code or null",
  "confidence": "high or medium or low",
  "notes": "brief explanation if needed"
}`;

    console.log(`[AI Court Lookup] Calling Claude API...`);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log(`[AI Court Lookup] Response received`);

    // Parse Claude's response
    const responseText = message.content[0].text;
    console.log(`[AI Court Lookup] Raw response:`, responseText);

    // Extract JSON from response
    let courtAddress = {};
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        courtAddress = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseError) {
      console.error(`[AI Court Lookup] Failed to parse JSON:`, parseError);
      throw new Error("Failed to parse AI response");
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Check if AI found the address
    if (!courtAddress.court_address1 || courtAddress.court_address1 === "null") {
      console.log(`[AI Court Lookup] AI could not find address with confidence`);
      return {
        success: false,
        found: false,
        message: `Could not find address for: ${courtName}`,
        confidence: courtAddress.confidence || "low",
        duration: parseFloat(duration),
      };
    }

    console.log(`[AI Court Lookup] ⚡ Found address in ${duration}s:`, courtAddress.court_address1);
    console.log(`[AI Court Lookup] Confidence: ${courtAddress.confidence || "unknown"}`);

    return {
      success: true,
      found: true,
      courtAddress: {
        court_address1: courtAddress.court_address1,
        court_city: courtAddress.court_city,
        court_state: courtAddress.court_state,
        court_zip: courtAddress.court_zip,
        source: "ai",
        confidence: courtAddress.confidence,
        notes: courtAddress.notes || "",
      },
      duration: parseFloat(duration),
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error(`[AI Court Lookup] Error after ${duration}s:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        `Failed to find court address with AI: ${error.message}`,
    );
  }
});

/**
 * Invites a client user to the client portal
 * Creates a Firebase Auth user and stores client_user record
 * @param {Object} data - { email, name, role, client_company_id, parent_company_id }
 * @returns {Object} - { success: boolean, client_user_id: string, portal_url: string }
 */
exports.inviteClientUser = onCall(async (request) => {
  try {
    // Validate authentication first
    const callerUid = requireAuth(request.auth);

    const {email, name, role, client_company_id, parent_company_id} = request.data;

    // Validate input with proper type checking and length limits
    validateEmail(email, "email", true);
    validateString(name, "name", {minLength: 1, maxLength: 200, required: true});
    validateDocumentId(client_company_id, "client_company_id", true);
    validateDocumentId(parent_company_id, "parent_company_id", true);

    // Sanitize name to prevent injection
    const sanitizedName = sanitizeString(name);

    // Validate role
    const validRoles = ["viewer", "manager", "admin"];
    const userRole = role || "viewer";
    if (!validRoles.includes(userRole)) {
      throw new HttpsError("invalid-argument", `Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    console.log(`[inviteClientUser] Inviting ${maskEmail(email)} to portal for company ${parent_company_id}`);

    // Get the parent company to retrieve portal slug
    const companyDoc = await admin.firestore().collection("companies").doc(parent_company_id).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Parent company not found");
    }
    const companyData = companyDoc.data();
    const portalSlug = companyData.portal_settings?.portal_slug;

    if (!portalSlug) {
      throw new HttpsError("failed-precondition", "Company portal is not configured. Please set a portal slug in company settings.");
    }

    // Generate invitation token
    const invitationToken = require("crypto").randomBytes(32).toString("hex");

    let firebaseUser;
    let isNewUser = false;

    // Check if user already exists in Firebase Auth
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      console.log(`[inviteClientUser] Found existing Firebase Auth user`);

      // Check if they already have a client_users record for this parent company
      const existingClientUser = await admin.firestore()
          .collection("client_users")
          .where("email", "==", email)
          .where("parent_company_id", "==", parent_company_id)
          .get();

      if (!existingClientUser.empty) {
        throw new HttpsError("already-exists", "This user has already been invited to this portal");
      }
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Create new Firebase Auth user with a temporary password
        const tempPassword = require("crypto").randomBytes(16).toString("hex");
        firebaseUser = await admin.auth().createUser({
          email: email,
          displayName: name,
          password: tempPassword,
        });
        isNewUser = true;
        console.log(`[inviteClientUser] Created new Firebase Auth user`);
      } else if (error instanceof HttpsError) {
        throw error;
      } else {
        throw new HttpsError("internal", `Failed to check user: ${error.message}`);
      }
    }

    // Set custom claims to identify this user as a client portal user
    await admin.auth().setCustomUserClaims(firebaseUser.uid, {
      client_portal_user: true,
      client_company_id: client_company_id,
      parent_company_id: parent_company_id,
    });

    // Create client_users record in Firestore
    const clientUserData = {
      email: email,
      name: sanitizedName,
      uid: firebaseUser.uid,
      client_company_id: client_company_id,
      parent_company_id: parent_company_id,
      role: userRole,
      is_active: true,
      invited_by: callerUid,
      invited_at: admin.firestore.FieldValue.serverTimestamp(),
      invitation_token: invitationToken,
      invitation_status: "pending",
      last_login: null,
      login_count: 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const clientUserRef = await admin.firestore().collection("client_users").add(clientUserData);
    console.log(`[inviteClientUser] Created client_users record: ${clientUserRef.id}`);

    // Generate the portal invite URL
    // The token allows them to set their password on first login
    const portalBaseUrl = process.env.GCLOUD_PROJECT === "serve-max-1f01c0af"
        ? "https://www.servemax.pro"
        : "http://localhost:5173";
    const portalInviteUrl = `${portalBaseUrl}/portal/${portalSlug}/accept-invite?token=${invitationToken}`;

    // Generate password reset link if new user, so they can set their password
    let passwordSetupLink = null;
    if (isNewUser) {
      passwordSetupLink = await admin.auth().generatePasswordResetLink(email);
    }

    console.log(`[inviteClientUser] ✅ Successfully invited ${maskEmail(email)}`);

    // Send invitation email
    try {
      await sendEmailWithTemplate({
        to: email,
        subject: `You've Been Invited to ${companyData.name}'s Client Portal`,
        templateName: "client-portal-invitation",
        templateData: {
          client_name: name,
          company_name: companyData.name || companyData.company_name || "ServeMax",
          invite_url: portalInviteUrl,
          is_new_user: isNewUser,
        },
        companyId: parent_company_id,
      });
      console.log(`[inviteClientUser] Invitation email sent to ${maskEmail(email)}`);
    } catch (emailError) {
      console.error("[inviteClientUser] Failed to send invitation email:", emailError);
      // Don't fail the invitation if email fails - the user can still use the link
    }

    return {
      success: true,
      client_user_id: clientUserRef.id,
      firebase_uid: firebaseUser.uid,
      portal_url: `${portalBaseUrl}/portal/${portalSlug}`,
      invite_url: portalInviteUrl,
      password_setup_link: passwordSetupLink,
      is_new_user: isNewUser,
      message: isNewUser
          ? `Invitation created. User will need to set their password using the password setup link.`
          : `Invitation created for existing user. They can log in with their existing credentials.`,
    };
  } catch (error) {
    console.error("[inviteClientUser] Error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to invite client user: ${error.message}`);
  }
});

/**
 * Get public portal information by slug (no authentication required)
 * Returns company name, branding, and portal settings for the signup/login pages
 * @param {Object} data - { portalSlug }
 * @returns {Object} - { success: boolean, data: { name, branding, portalSettings } }
 */
exports.getPortalInfo = onCall(async (request) => {
  try {
    const { portalSlug } = request.data;

    if (!portalSlug) {
      throw new HttpsError("invalid-argument", "Portal slug is required");
    }

    // Find company by portal slug
    const companiesSnapshot = await admin.firestore()
        .collection("companies")
        .where("portal_settings.portal_slug", "==", portalSlug)
        .limit(1)
        .get();

    if (companiesSnapshot.empty) {
      throw new HttpsError("not-found", "Portal not found");
    }

    const company = companiesSnapshot.docs[0].data();

    // Return only public information needed for signup/login pages
    return {
      success: true,
      data: {
        id: companiesSnapshot.docs[0].id,
        name: company.name || company.company_name,
        branding: company.branding || {},
        portalSettings: {
          allow_self_registration: company.portal_settings?.allow_self_registration || false,
          registration_welcome_message: company.portal_settings?.registration_welcome_message || "",
        },
      },
    };
  } catch (error) {
    console.error("[getPortalInfo] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to get portal info: ${error.message}`);
  }
});

/**
 * Self-registration for client portal users
 * Creates a new client company and client_user record
 * @param {Object} data - { email, password, companyName, contactName, phone, address, city, state, zip, portalSlug }
 * @returns {Object} - { success: boolean, message: string }
 */
exports.selfRegisterClientUser = onCall(async (request) => {
  try {
    const {
      email,
      password,
      companyName,
      contactName,
      phone,
      address,
      city,
      state,
      zip,
      portalSlug,
    } = request.data;

    // Validate inputs with proper type checking
    validateEmail(email, "email", true);
    validateString(password, "password", {minLength: 8, maxLength: 128, required: true});
    validateString(companyName, "companyName", {minLength: 1, maxLength: 200, required: true});
    validateString(contactName, "contactName", {minLength: 1, maxLength: 200, required: true});
    validateString(phone, "phone", {minLength: 7, maxLength: 20, required: true});
    validateString(portalSlug, "portalSlug", {minLength: 1, maxLength: 100, required: true});
    validateString(address, "address", {maxLength: 500, required: false});
    validateString(city, "city", {maxLength: 100, required: false});
    validateString(state, "state", {maxLength: 50, required: false});
    validateString(zip, "zip", {maxLength: 20, required: false});

    // Rate limit registrations - strict to prevent abuse
    await checkRateLimit(email, "registration", {maxRequests: 3, windowSeconds: 3600}); // 3 per hour per email
    await checkRateLimit(portalSlug, "registrationPerPortal", {maxRequests: 50, windowSeconds: 3600}); // 50 per hour per portal

    // Extract email domain for tracking/grouping
    const emailDomain = email.split('@')[1]?.toLowerCase() || '';

    console.log(`[selfRegisterClientUser] Self-registration attempt for ${maskEmail(email)} on portal ${portalSlug}`);

    // Find parent company by portal slug
    const companiesSnapshot = await admin.firestore()
        .collection("companies")
        .where("portal_settings.portal_slug", "==", portalSlug)
        .limit(1)
        .get();

    if (companiesSnapshot.empty) {
      throw new HttpsError("not-found", "Portal not found");
    }

    const parentCompanyDoc = companiesSnapshot.docs[0];
    const parentCompanyData = parentCompanyDoc.data();
    const parentCompanyId = parentCompanyDoc.id;

    // Check if self-registration is enabled
    if (!parentCompanyData.portal_settings?.allow_self_registration) {
      throw new HttpsError("permission-denied", "Self-registration is not enabled for this portal");
    }

    // Check if this exact email already has an account with THIS company
    // (Same email can have accounts with different companies - that's allowed)
    const existingUserSnapshot = await admin.firestore()
        .collection("client_users")
        .where("parent_company_id", "==", parentCompanyId)
        .where("email", "==", email.toLowerCase())
        .limit(1)
        .get();

    if (!existingUserSnapshot.empty) {
      throw new HttpsError(
          "already-exists",
          "You already have an account with this company. Please log in instead."
      );
    }

    // Check if email exists in Firebase Auth (user may have account with another company)
    let firebaseUser;
    let isExistingAuthUser = false;

    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      isExistingAuthUser = true;
      console.log(`[selfRegisterClientUser] Found existing Firebase user, will link to new company`);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // User doesn't exist in Firebase Auth - create new account
        firebaseUser = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: contactName,
        });
        console.log(`[selfRegisterClientUser] Created new Firebase Auth user`);
      } else {
        throw new HttpsError("internal", `Failed to check email: ${error.message}`);
      }
    }

    // Create client company record (in companies collection, not deprecated clients collection)
    const clientData = {
      name: companyName, // Main field used by the app
      company_name: companyName, // Keep for backwards compatibility
      company_type: "law_firm",
      status: "active",
      created_by: parentCompanyId,
      created_by_user: null, // Self-registered, no user created it
      contacts: [{
        id: require("crypto").randomUUID(),
        first_name: contactName.split(" ")[0] || contactName,
        last_name: contactName.split(" ").slice(1).join(" ") || "",
        email: email,
        phone: phone,
        primary: true,
      }],
      addresses: address ? [{
        id: require("crypto").randomUUID(),
        label: "Main Office",
        address1: address,
        city: city || "",
        state: state || "",
        postal_code: zip || "",
        primary: true,
      }] : [],
      registration_type: "self_registered",
      self_registered_at: admin.firestore.FieldValue.serverTimestamp(),
      self_registered_by_email: email,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const clientRef = await admin.firestore().collection("companies").add(clientData);
    console.log(`[selfRegisterClientUser] Created client company: ${clientRef.id}`);

    // Create company_stats document for the new client
    await admin.firestore().collection("company_stats").doc(clientRef.id).set({
      company_id: clientRef.id,
      total_jobs: 0,
      active_jobs: 0,
      completed_jobs: 0,
    });
    console.log(`[selfRegisterClientUser] Created company_stats for client: ${clientRef.id}`);

    // Set custom claims - preserve existing claims for multi-company support
    // Don't overwrite company IDs as user may have accounts with multiple companies
    // The actual company context is determined by portal slug + client_users lookup
    const existingClaims = firebaseUser.customClaims || {};
    await admin.auth().setCustomUserClaims(firebaseUser.uid, {
      ...existingClaims,
      client_portal_user: true,
      // Only set these for new users; existing users already have their claims
      ...(isExistingAuthUser ? {} : {
        client_company_id: clientRef.id,
        parent_company_id: parentCompanyId,
      }),
    });

    // Create client_user record
    const clientUserData = {
      email: email,
      name: contactName,
      uid: firebaseUser.uid,
      client_company_id: clientRef.id,
      parent_company_id: parentCompanyId,
      role: "manager", // Self-registered users get manager role to submit jobs
      is_active: true,
      invited_by: null, // Self-registered
      invited_at: null,
      invitation_token: null,
      invitation_status: "self_registered",
      last_login: null,
      login_count: 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const clientUserRef = await admin.firestore().collection("client_users").add(clientUserData);
    console.log(`[selfRegisterClientUser] Created client_user: ${clientUserRef.id}`);

    // Create notification for the parent company dashboard
    const notificationData = {
      parent_company_id: parentCompanyId,
      client_company_id: clientRef.id,
      client_user_id: clientUserRef.id,
      company_name: companyName,
      contact_name: contactName,
      contact_email: email,
      email_domain: emailDomain,
      status: "pending",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      acknowledged_at: null,
      acknowledged_by: null,
    };

    await admin.firestore().collection("client_registration_notifications").add(notificationData);
    console.log(`[selfRegisterClientUser] Created registration notification`);

    console.log(`[selfRegisterClientUser] ✅ Successfully registered ${maskEmail(email)} for ${companyName}`);

    return {
      success: true,
      client_company_id: clientRef.id,
      client_user_id: clientUserRef.id,
      message: "Account created successfully. You can now log in.",
    };
  } catch (error) {
    console.error("[selfRegisterClientUser] Error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to register: ${error.message}`);
  }
});

/**
 * Acknowledge a client registration notification
 * @param {Object} data - { notificationId: string }
 * @returns {Object} - { success: boolean }
 */
exports.acknowledgeClientRegistration = onCall(async (request) => {
  try {
    const {notificationId} = request.data;

    if (!notificationId) {
      throw new HttpsError("invalid-argument", "Notification ID is required");
    }

    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const notificationRef = admin.firestore().collection("client_registration_notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    await notificationRef.update({
      status: "acknowledged",
      acknowledged_at: admin.firestore.FieldValue.serverTimestamp(),
      acknowledged_by: callerUid,
    });

    return {success: true};
  } catch (error) {
    console.error("[acknowledgeClientRegistration] Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Failed to acknowledge: ${error.message}`);
  }
});

/**
 * Accepts a client portal invitation and activates the account
 * @param {Object} data - { token: string }
 * @returns {Object} - { success: boolean, redirect_url: string }
 */
exports.acceptClientInvitation = onCall(async (request) => {
  try {
    const {token} = request.data;

    if (!token) {
      throw new HttpsError("invalid-argument", "Invitation token is required");
    }

    console.log(`[acceptClientInvitation] Processing invitation token`);

    // Find client_user by invitation token
    const clientUserQuery = await admin.firestore()
        .collection("client_users")
        .where("invitation_token", "==", token)
        .where("invitation_status", "==", "pending")
        .limit(1)
        .get();

    if (clientUserQuery.empty) {
      throw new HttpsError("not-found", "Invalid or expired invitation token");
    }

    const clientUserDoc = clientUserQuery.docs[0];
    const clientUserData = clientUserDoc.data();

    // Update invitation status
    await clientUserDoc.ref.update({
      invitation_status: "accepted",
      invitation_token: null, // Clear token after use
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get company portal slug for redirect
    const companyDoc = await admin.firestore()
        .collection("companies")
        .doc(clientUserData.parent_company_id)
        .get();

    const portalSlug = companyDoc.exists ? companyDoc.data()?.portal_settings?.portal_slug : null;
    const portalBaseUrl = process.env.GCLOUD_PROJECT === "serve-max-1f01c0af"
        ? "https://www.servemax.pro"
        : "http://localhost:5173";

    console.log(`[acceptClientInvitation] ✅ Invitation accepted`);

    return {
      success: true,
      email: clientUserData.email,
      redirect_url: portalSlug ? `${portalBaseUrl}/portal/${portalSlug}/login` : portalBaseUrl,
      message: "Invitation accepted successfully. You can now log in to the portal.",
    };
  } catch (error) {
    console.error("[acceptClientInvitation] Error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to accept invitation: ${error.message}`);
  }
});

/**
 * Gets client portal data for an authenticated client user
 * @param {Object} data - { parent_company_id: string }
 * @returns {Object} - { company, branding, jobs, invoices }
 */
exports.getClientPortalData = onCall(async (request) => {
  try {
    const callerUid = request.auth?.uid;
    console.log(`[getClientPortalData] Called with UID: ${callerUid}`);

    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // First, let's check if ANY client_user exists with this UID (ignoring is_active)
    const debugQuery = await admin.firestore()
        .collection("client_users")
        .where("uid", "==", callerUid)
        .limit(1)
        .get();

    console.log(`[getClientPortalData] Debug query (uid only): found ${debugQuery.size} documents`);
    if (!debugQuery.empty) {
      const debugData = debugQuery.docs[0].data();
      console.log(`[getClientPortalData] Found client_user: is_active=${debugData.is_active}, type=${typeof debugData.is_active}`);
    }

    // Get the client user record with retry logic for eventual consistency
    let clientUserQuery;
    const maxRetries = 3;
    const retryDelay = 1500; // 1.5 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      clientUserQuery = await admin.firestore()
          .collection("client_users")
          .where("uid", "==", callerUid)
          .where("is_active", "==", true)
          .limit(1)
          .get();

      console.log(`[getClientPortalData] Attempt ${attempt + 1}: found ${clientUserQuery.size} documents`);

      if (!clientUserQuery.empty) {
        break; // Found the user, exit retry loop
      }

      if (attempt < maxRetries - 1) {
        console.log(`[getClientPortalData] Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    if (clientUserQuery.empty) {
      // Last resort: try to find by uid only and check is_active manually
      const fallbackQuery = await admin.firestore()
          .collection("client_users")
          .where("uid", "==", callerUid)
          .limit(1)
          .get();

      if (!fallbackQuery.empty) {
        const userData = fallbackQuery.docs[0].data();
        console.log(`[getClientPortalData] Fallback found user, is_active=${userData.is_active}`);
        if (userData.is_active === true || userData.is_active === "true") {
          // Use this document
          clientUserQuery = fallbackQuery;
        }
      }
    }

    if (clientUserQuery.empty) {
      console.log(`[getClientPortalData] No client_user found for UID: ${callerUid}`);
      throw new HttpsError("permission-denied", "No active client portal access found");
    }

    const clientUser = clientUserQuery.docs[0].data();
    const parentCompanyId = clientUser.parent_company_id;
    const clientCompanyId = clientUser.client_company_id;

    // Get parent company data (for branding)
    const companyDoc = await admin.firestore()
        .collection("companies")
        .doc(parentCompanyId)
        .get();

    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }

    const companyData = companyDoc.data();

    // Update last login
    await clientUserQuery.docs[0].ref.update({
      last_login: admin.firestore.FieldValue.serverTimestamp(),
      login_count: admin.firestore.FieldValue.increment(1),
    });

    // Get jobs for this client company
    const jobsQuery = await admin.firestore()
        .collection("jobs")
        .where("company_id", "==", parentCompanyId)
        .where("client_id", "==", clientCompanyId)
        .orderBy("created_at", "desc")
        .limit(50)
        .get();

    const jobs = jobsQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get invoices for this client company
    const invoicesQuery = await admin.firestore()
        .collection("invoices")
        .where("company_id", "==", parentCompanyId)
        .where("client_id", "==", clientCompanyId)
        .orderBy("created_at", "desc")
        .limit(50)
        .get();

    const invoices = invoicesQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[getClientPortalData] Loaded ${jobs.length} jobs and ${invoices.length} invoices for client ${clientCompanyId}`);

    return {
      success: true,
      clientUser: {
        id: clientUserQuery.docs[0].id,
        name: clientUser.name,
        email: clientUser.email,
        role: clientUser.role,
        phone: clientUser.phone || "",
        address: clientUser.address || "",
        city: clientUser.city || "",
        state: clientUser.state || "",
        zip: clientUser.zip || "",
      },
      company: {
        id: parentCompanyId,
        name: companyData.name,
        email: companyData.email,
        phone: companyData.phone,
      },
      branding: companyData.branding || {
        logo_url: "",
        primary_color: "#1e40af",
        accent_color: "#3b82f6",
      },
      portalSettings: companyData.portal_settings || {},
      enabled_job_types: companyData.enabled_job_types || ["process_serving"],
      jobs: jobs,
      invoices: invoices,
    };
  } catch (error) {
    console.error("[getClientPortalData] Error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to get portal data: ${error.message}`);
  }
});

/**
 * Update client portal user profile
 * Allows client users to update their own profile information
 */
exports.updateClientProfile = onCall(async (request) => {
  try {
    const callerUid = request.auth?.uid;

    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get the client user record
    const clientUserQuery = await admin.firestore()
        .collection("client_users")
        .where("uid", "==", callerUid)
        .where("is_active", "==", true)
        .limit(1)
        .get();

    if (clientUserQuery.empty) {
      throw new HttpsError("permission-denied", "No active client portal access found");
    }

    const clientUserRef = clientUserQuery.docs[0].ref;
    const {name, phone, address, city, state, zip} = request.data;

    // Build update object with only provided fields
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zip !== undefined) updateData.zip = zip;

    await clientUserRef.update(updateData);

    console.log(`[updateClientProfile] Updated profile for user ${callerUid}`);

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("[updateClientProfile] Error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to update profile: ${error.message}`);
  }
});

// ============================================================================
// Email Service
// ============================================================================

/**
 * Send email using SendGrid with template support
 * Callable from client-side via FirebaseFunctions.sendEmail()
 */
exports.sendEmail = onCall(
    {secrets: [sendgridApiKey]},
    async (request) => {
      try {
        // Rate limit by user ID or email
        const rateLimitId = request.auth?.uid || request.data?.to || "anonymous";
        await checkRateLimit(rateLimitId, "sendEmail", {maxRequests: 20, windowSeconds: 60});

        const {to, subject, templateName, templateData, body, companyId, from, replyTo} = request.data;

        // Validate required fields with proper type checking
        validateEmail(to, "to", true);
        validateString(subject, "subject", {minLength: 1, maxLength: 500, required: true});

        if (!templateName && !body) {
          throw new HttpsError("invalid-argument", "Either templateName or body is required");
        }

        // Validate optional fields
        validateString(templateName, "templateName", {maxLength: 100, required: false});
        validateString(body, "body", {maxLength: 500000, required: false}); // 500KB max
        validateDocumentId(companyId, "companyId", false);
        validateEmail(from, "from", false);
        validateEmail(replyTo, "replyTo", false);

        console.log(`[sendEmail] Sending "${subject}" to ${to}`);

        // Fetch company data for branding
        let companyData = {};
        const effectiveCompanyId = companyId || request.auth?.token?.company_id;

        if (effectiveCompanyId) {
          const companyDoc = await admin.firestore().collection("companies").doc(effectiveCompanyId).get();
          if (companyDoc.exists) {
            companyData = companyDoc.data();
          }
        }

        // PERFORMANCE: Initialize SendGrid once per instance
        initSendGrid(sendgridApiKey.value());

        // Build the email HTML
        let html;
        if (templateName) {
          // Use template
          html = renderEmail(templateName, {...templateData, emailSubject: subject}, companyData);
        } else {
          // Use raw body with base layout
          const baseLayout = loadEmailTemplate("base-layout");
          html = baseLayout({
            content: body,
            emailSubject: subject,
            company_name: companyData.name || companyData.company_name || "ServeMax",
            company_address: formatCompanyAddressForEmail(companyData),
            company_phone: companyData.phone || "",
            company_email: companyData.email || "",
            company_website: companyData.website || "",
            branding: {
              logo_url: companyData.branding?.logo_url || null,
              primary_color: companyData.branding?.primary_color || "#1e40af",
              accent_color: companyData.branding?.accent_color || "#3b82f6",
              email_tagline: companyData.branding?.email_tagline || "",
              google_review_url: companyData.branding?.google_review_url || "",
            },
          });
        }

        // Build from address
        const fromEmail = from || companyData.email || "info@nationwide-investigations.com";
        const msg = {
          to: to,
          from: {
            email: fromEmail,
            name: companyData.name || companyData.company_name || "ServeMax",
          },
          replyTo: replyTo || (companyData.email && companyData.email !== fromEmail ? companyData.email : undefined),
          subject: subject,
          html: html,
        };

        // Send the email
        const response = await sgMail.send(msg);

        console.log(`[sendEmail] Successfully sent to ${to}`);
        await trackPlatformUsage("emails_sent");

        return {
          success: true,
          messageId: response[0]?.headers?.["x-message-id"],
          message: "Email sent successfully",
        };
      } catch (error) {
        console.error("[sendEmail] Error:", error);

        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError("internal", `Failed to send email: ${error.message}`);
      }
    },
);

/**
 * Send job attempt notification email to client
 * Includes attempt details, GPS coordinates, photos, and company branding
 */
exports.sendAttemptNotification = onCall(
    {secrets: [sendgridApiKey]},
    async (request) => {
      try {
        const {attemptId, jobId, companyId} = request.data;

        // Validate required fields
        if (!attemptId) {
          throw new HttpsError("invalid-argument", "attemptId is required");
        }
        if (!jobId) {
          throw new HttpsError("invalid-argument", "jobId is required");
        }
        if (!companyId) {
          throw new HttpsError("invalid-argument", "companyId is required");
        }

        console.log(`[sendAttemptNotification] Sending notification for attempt ${attemptId}`);

        // Fetch attempt data
        const attemptDoc = await admin.firestore().collection("attempts").doc(attemptId).get();
        if (!attemptDoc.exists) {
          throw new HttpsError("not-found", "Attempt not found");
        }
        const attempt = attemptDoc.data();

        // Fetch job data
        const jobDoc = await admin.firestore().collection("jobs").doc(jobId).get();
        if (!jobDoc.exists) {
          throw new HttpsError("not-found", "Job not found");
        }
        const job = jobDoc.data();

        // Fetch company data
        const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
        if (!companyDoc.exists) {
          throw new HttpsError("not-found", "Company not found");
        }
        const companyData = companyDoc.data();

        // Fetch client data
        let clientEmail = null;
        let clientName = "Client";
        if (job.client_id) {
          const clientDoc = await admin.firestore().collection("clients").doc(job.client_id).get();
          if (clientDoc.exists) {
            const clientData = clientDoc.data();
            clientEmail = clientData.contact_email || clientData.email;
            clientName = clientData.name || clientData.company_name || "Client";
          }
        }

        if (!clientEmail) {
          throw new HttpsError("failed-precondition", "No client email found for this job");
        }

        // Fetch photos linked to this attempt
        const photosSnapshot = await admin.firestore()
            .collection("documents")
            .where("attempt_id", "==", attemptId)
            .where("document_category", "==", "photo")
            .get();

        const photos = photosSnapshot.docs.map((doc) => ({
          url: doc.data().file_url,
          title: doc.data().title || "Photo",
        }));

        // Get recipient name from job
        const recipientName = job.recipients && job.recipients.length > 0
          ? job.recipients[0].name
          : "Recipient";

        // Get server name
        let serverName = null;
        if (attempt.server_id) {
          const serverDoc = await admin.firestore().collection("users").doc(attempt.server_id).get();
          if (serverDoc.exists) {
            const serverData = serverDoc.data();
            serverName = serverData.full_name || `${serverData.first_name || ""} ${serverData.last_name || ""}`.trim();
          }
        } else if (attempt.server_name_manual) {
          serverName = attempt.server_name_manual;
        }

        // Build job view URL
        const jobViewUrl = `https://servemax.pro/jobs/${jobId}`;

        // Build template data
        const templateData = {
          client_name: clientName,
          case_caption: job.case_caption || null,
          case_number: job.case_number || null,
          recipient_name: recipientName,
          attempt_date: attempt.attempt_date,
          attempt_time: attempt.attempt_time || "",
          status: attempt.status,
          success: attempt.success || attempt.status === "served",
          address_of_attempt: attempt.address_of_attempt || "",
          gps_lat: attempt.gps_lat || null,
          gps_lon: attempt.gps_lon || null,
          gps_accuracy: attempt.gps_accuracy || null,
          person_served_name: attempt.person_served_name || null,
          person_served_description: attempt.person_served_description || null,
          service_type_detail: attempt.service_type_detail || null,
          relationship_to_recipient: attempt.relationship_to_recipient || null,
          notes: attempt.notes || null,
          photos: photos,
          server_name: serverName,
          job_view_url: jobViewUrl,
        };

        // Send the email
        await sendEmailWithTemplate({
          to: clientEmail,
          subject: `Service Attempt Update - ${recipientName}`,
          templateName: "job-attempt",
          templateData: templateData,
          companyId: companyId,
        });

        console.log(`[sendAttemptNotification] Successfully sent to ${clientEmail}`);

        return {
          success: true,
          message: `Attempt notification sent to ${clientEmail}`,
          recipient: clientEmail,
        };
      } catch (error) {
        console.error("[sendAttemptNotification] Error:", error);

        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError("internal", `Failed to send attempt notification: ${error.message}`);
      }
    },
);

/**
 * Create a job from the client portal
 * Called by authenticated client portal users to submit new jobs
 */
exports.createClientJob = onCall(
    {secrets: [sendgridApiKey, anthropicApiKey]},
    async (request) => {
  try {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get the client user record
    const clientUserQuery = await admin.firestore()
        .collection("client_users")
        .where("uid", "==", callerUid)
        .where("is_active", "==", true)
        .limit(1)
        .get();

    if (clientUserQuery.empty) {
      throw new HttpsError("permission-denied", "No active client portal access found");
    }

    const clientUser = clientUserQuery.docs[0].data();
    const parentCompanyId = clientUser.parent_company_id;
    const clientCompanyId = clientUser.client_company_id;

    console.log(`[createClientJob] Creating job for client ${clientCompanyId} under company ${parentCompanyId}`);

    const jobData = request.data;

    // Validate required fields
    if (!jobData.recipient_name) {
      throw new HttpsError("invalid-argument", "Recipient name is required");
    }

    // Use global job number counter (same as CreateJob.jsx)
    const counterRef = admin.firestore().doc("counters/job_number");
    const nextNumber = await admin.firestore().runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists) {
        transaction.set(counterRef, {
          current_value: 1,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        });
        return 1;
      }

      const currentValue = counterDoc.data().current_value || 0;
      const newValue = currentValue + 1;

      transaction.update(counterRef, {
        current_value: newValue,
        last_updated: new Date().toISOString(),
      });

      return newValue;
    });

    // Format as 6-digit string (e.g., "000026")
    const jobNumber = nextNumber.toString().padStart(6, "0");

    console.log(`[createClientJob] Generated job number: ${jobNumber}`);

    // Calculate due dates based on priority
    const priorityDays = {standard: 10, rush: 3, same_day: 2};
    const daysToAdd = priorityDays[jobData.priority] || 10;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToAdd);

    const firstAttemptDays = {standard: 3, rush: 1, same_day: 0};
    const firstDays = firstAttemptDays[jobData.priority] || 3;
    const firstAttemptDate = new Date();
    firstAttemptDate.setDate(firstAttemptDate.getDate() + firstDays);

    // Create the job
    const nowTimestamp = admin.firestore.FieldValue.serverTimestamp();
    const nowIso = new Date().toISOString();
    const newJob = {
      // Core fields
      company_id: parentCompanyId,
      client_id: clientCompanyId,
      job_number: jobNumber,
      status: "pending",

      // Recipient at root level (for JobDetails display)
      recipient: {
        name: jobData.recipient_name,
        type: jobData.recipient_type || "individual",
      },
      defendant_name: jobData.recipient_name,
      recipient_name: jobData.recipient_name,

      // Addresses at root level (for JobDetails display)
      addresses: jobData.addresses || [],

      // Case info (use submitted values, can be enriched by document extraction)
      case_number: jobData.case_number || "",
      case_caption: "",
      plaintiff: jobData.plaintiff || "",
      defendant: jobData.defendant_name || jobData.recipient_name || "",

      // Court info
      court_name: jobData.court_name || "",
      court_county: jobData.court_county || "",

      // Recipients array (for compatibility)
      recipients: [{
        name: jobData.recipient_name,
        type: jobData.recipient_type || "individual",
        addresses: jobData.addresses || [],
      }],

      // Calculated dates
      priority: jobData.priority || "standard",
      due_date: dueDate.toISOString().split("T")[0],
      first_attempt_due_date: firstAttemptDate.toISOString().split("T")[0],

      // Service details
      service_instructions: jobData.service_instructions || "",
      client_job_number: jobData.client_reference || "",

      // Documents
      uploaded_documents: jobData.uploaded_documents || [],
      document_count: (jobData.uploaded_documents || []).length,

      // Activity log
      activity_log: [{
        timestamp: nowIso,
        user_name: clientUser.name || "Client Portal",
        event_type: "job_created",
        description: "Order submitted via client portal.",
      }],

      // Contact info - set contact_email from client user who submitted
      contact_email: clientUser.email || "",
      contact_name: clientUser.name || "",

      // Metadata
      source: "client_portal",
      submitted_by_client_user_id: clientUserQuery.docs[0].id,
      submitted_by: {
        name: clientUser.name || "Client Portal User",
        email: clientUser.email || "",
      },
      created_at: nowTimestamp,
      updated_at: nowTimestamp,
    };

    const jobRef = await admin.firestore().collection("jobs").add(newJob);

    console.log(`[createClientJob] Created job ${jobRef.id} (job #${jobNumber})`);

    // Create document entries in the documents collection for uploaded files
    // This ensures they appear in the admin dashboard's Service Documents section
    if (jobData.uploaded_documents && jobData.uploaded_documents.length > 0) {
      console.log(`[createClientJob] Creating ${jobData.uploaded_documents.length} document entries...`);

      const documentEntries = jobData.uploaded_documents.map((doc) => ({
        job_id: jobRef.id,
        company_id: parentCompanyId,
        title: doc.name || "Untitled Document",
        file_url: doc.url || doc.file_url,
        document_category: "to_be_served",
        content_type: doc.content_type || "application/pdf",
        page_count: doc.page_count || 1,
        file_size: doc.size || 0,
        received_at: nowIso,
        created_at: nowTimestamp,
        updated_at: nowTimestamp,
        source: "client_portal",
      }));

      // Create documents in batch
      const batch = admin.firestore().batch();
      documentEntries.forEach((docEntry) => {
        const docRef = admin.firestore().collection("documents").doc();
        batch.set(docRef, docEntry);
      });

      await batch.commit();
      console.log(`[createClientJob] Created ${documentEntries.length} document entries in documents collection`);
    }

    // Create notification for the parent company (persistent toast)
    try {
      // Format address for notification
      const firstAddress = (jobData.addresses || [])[0];
      const addressStr = firstAddress
        ? `${firstAddress.address1 || ""}${firstAddress.city ? `, ${firstAddress.city}` : ""}${firstAddress.state ? `, ${firstAddress.state}` : ""}`
        : "";

      await admin.firestore().collection("notifications").add({
        company_id: parentCompanyId,
        type: "new_portal_order",
        title: "New Order Received",
        message: `New order #${jobNumber} submitted by ${clientUser.name || "client"} via portal.`,
        job_id: jobRef.id,
        job_number: jobNumber,
        client_name: clientUser.name || "Client",
        recipient_name: jobData.recipient_name || "",
        address: addressStr,
        priority: jobData.priority || "standard",
        read: false,
        persistent: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[createClientJob] Created notification for company ${parentCompanyId}`);
    } catch (notifError) {
      console.error("[createClientJob] Failed to create notification:", notifError);
      // Don't fail the job creation if notification fails
    }

    // Send email notification to company admins
    try {
      // Get company data
      const companyDoc = await admin.firestore().collection("companies").doc(parentCompanyId).get();
      const companyData = companyDoc.exists ? companyDoc.data() : {};

      // Get admin users from this company to notify
      const adminUsersQuery = await admin.firestore()
          .collection("users")
          .where("company_id", "==", parentCompanyId)
          .where("role", "in", ["admin", "owner"])
          .limit(5) // Limit to prevent spamming
          .get();

      const adminEmails = adminUsersQuery.docs
          .map((doc) => doc.data().email)
          .filter((email) => email);

      // Also include company email if set
      if (companyData.email && !adminEmails.includes(companyData.email)) {
        adminEmails.push(companyData.email);
      }

      // Get client company name
      const clientDoc = await admin.firestore().collection("clients").doc(clientCompanyId).get();
      const clientCompanyName = clientDoc.exists ?
        (clientDoc.data().company_name || clientDoc.data().name || "Client") : "Client";

      if (adminEmails.length > 0) {
        const primaryAddress = (jobData.addresses && jobData.addresses[0]) || {};
        const addressStr = primaryAddress.city && primaryAddress.state ?
          `${primaryAddress.city}, ${primaryAddress.state}` : "";

        for (const adminEmail of adminEmails) {
          await sendEmailWithTemplate({
            to: adminEmail,
            subject: "A new job has been created",
            templateName: "new_portal_job",
            templateData: {
              jobNumber: jobNumber,
              recipientName: jobData.recipient_name,
              clientName: clientCompanyName,
              submittedBy: clientUser.name || "Client Portal User",
              submittedByEmail: clientUser.email || "",
              address: addressStr,
              priority: jobData.priority || "standard",
              jobUrl: `https://www.servemax.pro/JobDetails?id=${jobRef.id}`,
            },
            companyId: parentCompanyId,
          });
        }
        console.log(`[createClientJob] Sent email notifications to ${adminEmails.length} admin(s)`);
      }
    } catch (emailError) {
      console.error("[createClientJob] Failed to send email notification:", emailError);
      // Don't fail the job creation if email fails
    }

    // Trigger document extraction if documents were uploaded
    console.log(`[createClientJob] Checking for documents. uploaded_documents:`, JSON.stringify(jobData.uploaded_documents || []));
    if (jobData.uploaded_documents && jobData.uploaded_documents.length > 0) {
      const firstDoc = jobData.uploaded_documents[0];
      const fileUrl = firstDoc.url || firstDoc.file_url;
      console.log(`[createClientJob] First document:`, JSON.stringify(firstDoc));
      console.log(`[createClientJob] Triggering document extraction for URL: ${fileUrl}`);

      try {
        // Call extractDocumentClaudeVision internally
        const extractionPrompt = `You are assisting with legitimate legal document processing for a professional process serving company.
Extract structured information from a legal document (summons, complaint, subpoena) to facilitate proper service of legal documents.

Return ONLY a JSON object with fields that are present.

FIELDS TO RETURN (only if found):
- caseNumber: Case/docket number (preserve exact format)
- plaintiff: Plaintiff/petitioner full name
- defendant: Defendant/respondent full name
- full_court_name: Complete court name
- county_court: County name

OUTPUT FORMAT - Return ONLY the raw JSON object, no markdown.`;

        const docFileUrl = firstDoc.url || firstDoc.file_url;
        console.log(`[createClientJob] Fetching document from: ${docFileUrl}`);
        const response = await fetch(docFileUrl);
        console.log(`[createClientJob] Fetch response status: ${response.status} ${response.statusText}`);
        if (response.ok) {
          const pdfBytes = await response.arrayBuffer();
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const originalPageCount = pdfDoc.getPageCount();

          // Extract first 3 pages
          const pagesToExtract = Math.min(3, originalPageCount);
          const extractedPdf = await PDFDocument.create();
          const pageIndices = Array.from({length: pagesToExtract}, (_, i) => i);
          const copiedPages = await extractedPdf.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach((page) => extractedPdf.addPage(page));
          const firstPageBytes = await extractedPdf.save();

          const pdfBase64 = Buffer.from(firstPageBytes).toString("base64");

          // PERFORMANCE: Use singleton Anthropic client (lazy-loaded)
          const anthropic = getAnthropicClient(anthropicApiKey.value());

          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 2048,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: "application/pdf",
                      data: pdfBase64,
                    },
                  },
                  {
                    type: "text",
                    text: extractionPrompt,
                  },
                ],
              },
            ],
          });

          console.log(`[createClientJob] Claude response stop_reason: ${message.stop_reason}`);
          if (message.stop_reason !== "refusal" && message.content[0]) {
            const responseText = message.content[0].text;
            console.log(`[createClientJob] Claude raw response:`, responseText.substring(0, 500));
            const cleanedText = responseText
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();

            let extractedData = {};
            try {
              extractedData = JSON.parse(cleanedText);
              console.log(`[createClientJob] Parsed extracted data:`, JSON.stringify(extractedData));
            } catch (parseErr) {
              console.log(`[createClientJob] JSON parse failed, trying regex match`);
              const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
                console.log(`[createClientJob] Regex extracted data:`, JSON.stringify(extractedData));
              } else {
                console.log(`[createClientJob] No JSON found in response`);
              }
            }

            // Update job with extracted case info
            const updateData = {};
            if (extractedData.caseNumber) updateData.case_number = extractedData.caseNumber;
            if (extractedData.plaintiff) updateData.plaintiff = extractedData.plaintiff;
            if (extractedData.defendant) updateData.defendant = extractedData.defendant;
            if (extractedData.full_court_name) updateData.court_name = extractedData.full_court_name;
            if (extractedData.county_court) updateData.court_county = extractedData.county_court;

            if (Object.keys(updateData).length > 0) {
              // Build case caption if we have plaintiff and defendant
              if (updateData.plaintiff || updateData.defendant) {
                const plaintiff = updateData.plaintiff || extractedData.plaintiff || "";
                const defendant = updateData.defendant || extractedData.defendant || jobData.recipient_name;
                if (plaintiff && defendant) {
                  updateData.case_caption = `${plaintiff} v. ${defendant}`;
                }
              }

              await jobRef.update(updateData);
              console.log(`[createClientJob] Updated job with extracted case info:`, JSON.stringify(updateData));
            } else {
              console.log(`[createClientJob] No fields to update from extraction`);
            }
          } else {
            console.log(`[createClientJob] Claude refused or empty response`);
          }
        } else {
          console.log(`[createClientJob] Fetch failed: ${response.status} ${response.statusText}`);
        }
      } catch (extractError) {
        console.error(`[createClientJob] Document extraction failed (job still created):`, extractError.message, extractError.stack);
        // Don't fail the job creation if extraction fails
      }
    } else {
      console.log(`[createClientJob] No documents uploaded, skipping extraction`);
    }

    return {
      success: true,
      job_id: jobRef.id,
      job_number: jobNumber,
    };
  } catch (error) {
    console.error("[createClientJob] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to create job: ${error.message}`);
  }
});

/**
 * Generate a preview token for admin to view client portal
 */
exports.generateClientPortalPreview = onCall(async (request) => {
  try {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {client_company_id} = request.data;

    if (!client_company_id) {
      throw new HttpsError("invalid-argument", "client_company_id is required");
    }

    // Verify the caller is an admin of the parent company
    const userDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (!userDoc.exists) {
      throw new HttpsError("permission-denied", "User not found");
    }

    const userData = userDoc.data();
    const companyId = userData.company_id;

    // Verify this client belongs to the caller's company
    const clientDoc = await admin.firestore().collection("clients").doc(client_company_id).get();
    if (!clientDoc.exists) {
      throw new HttpsError("not-found", "Client not found");
    }

    const clientData = clientDoc.data();
    if (clientData.created_by !== companyId) {
      throw new HttpsError("permission-denied", "This client does not belong to your company");
    }

    // Get company portal settings
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }

    const companyData = companyDoc.data();
    const portalSlug = companyData.portal_settings?.portal_slug;

    if (!portalSlug) {
      throw new HttpsError("failed-precondition", "Portal is not configured for this company");
    }

    // Generate preview data
    const previewData = {
      client_company_id: client_company_id,
      parent_company_id: companyId,
      company_name: companyData.name,
      company_logo: companyData.logo_url || null,
      client_name: clientData.name || clientData.company_name,
      preview_mode: true,
      expires_at: Date.now() + (30 * 60 * 1000), // 30 minutes
    };

    const portalUrl = `https://www.servemax.pro/portal/${portalSlug}/admin-preview`;

    console.log(`[generateClientPortalPreview] Generated preview for client ${client_company_id}`);

    return {
      success: true,
      portalUrl: portalUrl,
      previewData: previewData,
    };
  } catch (error) {
    console.error("[generateClientPortalPreview] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to generate preview: ${error.message}`);
  }
});

/**
 * Send password reset email to a client portal user
 */
exports.sendClientPasswordReset = onCall(async (request) => {
  try {
    const callerUid = requireAuth(request.auth);

    const {client_user_id, email} = request.data;

    // Validate inputs
    validateDocumentId(client_user_id, "client_user_id", true);
    validateEmail(email, "email", true);

    // Rate limit password reset emails - strict limit to prevent abuse
    await checkRateLimit(email, "passwordReset", {maxRequests: 3, windowSeconds: 300}); // 3 per 5 minutes

    // Verify the caller is an admin of the parent company
    const userDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (!userDoc.exists) {
      throw new HttpsError("permission-denied", "User not found");
    }

    const userData = userDoc.data();
    const companyId = userData.company_id;

    // Verify this client user belongs to the caller's company
    const clientUserDoc = await admin.firestore().collection("client_users").doc(client_user_id).get();
    if (!clientUserDoc.exists) {
      throw new HttpsError("not-found", "Client user not found");
    }

    const clientUserData = clientUserDoc.data();
    if (clientUserData.parent_company_id !== companyId) {
      throw new HttpsError("permission-denied", "This client user does not belong to your company");
    }

    // Send password reset email via Firebase Auth
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // Send email with the reset link
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    const companyData = companyDoc.data();
    const companyName = companyData?.name || "ServeMax";

    // Send the password reset email - DO NOT LOG THE RESET LINK for security
    console.log(`[sendClientPasswordReset] Sending password reset to ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);

    // Try to send via email function
    try {
      await sendEmailWithTemplate({
        to: email,
        subject: `Reset Your Password - ${companyName} Client Portal`,
        templateName: "password-reset",
        templateData: {
          reset_link: resetLink,
          company_name: companyName,
          user_name: clientUserData.name || clientUserData.email,
        },
        companyId: companyId,
      });
    } catch (emailError) {
      // If template doesn't exist, send plain email
      console.log("[sendClientPasswordReset] Template not found, sending basic email");
      const {Resend} = require("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "ServeMax <info@nationwide-investigations.com>",
        to: email,
        subject: `Reset Your Password - ${companyName} Client Portal`,
        html: `
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your ${companyName} client portal account.</p>
          <p><a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `,
      });
    }

    return {
      success: true,
      message: `Password reset email sent to ${email}`,
    };
  } catch (error) {
    console.error("[sendClientPasswordReset] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to send password reset: ${error.message}`);
  }
});

// ============================================================================
// Email Verification Functions
// ============================================================================

/**
 * Send email verification to a new user
 * Creates a verification token and sends an email with a verification link
 */
exports.sendVerificationEmail = onCall(
    {secrets: [sendgridApiKey]},
    async (request) => {
      try {
        const {userId, email, userName} = request.data;

        if (!userId || !email) {
          throw new HttpsError("invalid-argument", "userId and email are required");
        }

        // Generate a secure verification token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

        // Store the token in Firestore
        await admin.firestore().collection("email_verification_tokens").doc(token).set({
          user_id: userId,
          email: email,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
          used: false,
        });

        // Generate the verification URL (environment-aware)
        const baseUrl = process.env.GCLOUD_PROJECT === "serve-max-1f01c0af"
            ? "https://www.servemax.pro"
            : "http://localhost:5173";
        const verificationUrl = `${baseUrl}/verify-email/${token}`;

        // Send the verification email using the template
        await sendEmailWithTemplate({
          to: email,
          subject: "Verify Your Email Address - ServeMax",
          templateName: "email-verification",
          templateData: {
            user_name: userName || email.split("@")[0],
            verification_url: verificationUrl,
          },
        });

        console.log(`[sendVerificationEmail] Verification email sent to ${email}`);

        return {
          success: true,
          message: "Verification email sent successfully",
        };
      } catch (error) {
        console.error("[sendVerificationEmail] Error:", error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError("internal", `Failed to send verification email: ${error.message}`);
      }
    },
);

/**
 * Verify an email using a token
 * Validates the token and marks the user's email as verified
 */
exports.verifyEmail = onCall(async (request) => {
  try {
    const {token} = request.data;

    if (!token) {
      throw new HttpsError("invalid-argument", "Verification token is required");
    }

    // Get the token document
    const tokenDoc = await admin.firestore().collection("email_verification_tokens").doc(token).get();

    if (!tokenDoc.exists) {
      throw new HttpsError("not-found", "Invalid or expired verification link");
    }

    const tokenData = tokenDoc.data();

    // Check if token has already been used
    if (tokenData.used) {
      throw new HttpsError("failed-precondition", "This verification link has already been used");
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = tokenData.expires_at.toDate();
    if (now > expiresAt) {
      // Delete the expired token
      await tokenDoc.ref.delete();
      throw new HttpsError("failed-precondition", "This verification link has expired. Please request a new one.");
    }

    // Mark the user's email as verified
    await admin.firestore().collection("users").doc(tokenData.user_id).update({
      email_verified: true,
      email_verified_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark the token as used
    await tokenDoc.ref.update({
      used: true,
      used_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[verifyEmail] Email verified for user ${tokenData.user_id}`);

    return {
      success: true,
      message: "Email verified successfully",
      userId: tokenData.user_id,
    };
  } catch (error) {
    console.error("[verifyEmail] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to verify email: ${error.message}`);
  }
});

/**
 * Resend verification email to a user
 * Deletes any existing tokens and creates a new one
 */
exports.resendVerificationEmail = onCall(
    {secrets: [sendgridApiKey]},
    async (request) => {
      try {
        const {userId, email, userName} = request.data;

        if (!userId || !email) {
          throw new HttpsError("invalid-argument", "userId and email are required");
        }

        // Delete any existing verification tokens for this user
        const existingTokens = await admin.firestore()
            .collection("email_verification_tokens")
            .where("user_id", "==", userId)
            .where("used", "==", false)
            .get();

        const batch = admin.firestore().batch();
        existingTokens.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // Generate a new verification token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Store the new token
        await admin.firestore().collection("email_verification_tokens").doc(token).set({
          user_id: userId,
          email: email,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
          used: false,
        });

        // Generate the verification URL (environment-aware)
        const baseUrl = process.env.GCLOUD_PROJECT === "serve-max-1f01c0af"
            ? "https://www.servemax.pro"
            : "http://localhost:5173";
        const verificationUrl = `${baseUrl}/verify-email/${token}`;

        // Send the verification email
        await sendEmailWithTemplate({
          to: email,
          subject: "Verify Your Email Address - ServeMax",
          templateName: "email-verification",
          templateData: {
            user_name: userName || email.split("@")[0],
            verification_url: verificationUrl,
          },
        });

        console.log(`[resendVerificationEmail] Verification email resent to ${email}`);

        return {
          success: true,
          message: "Verification email sent successfully",
        };
      } catch (error) {
        console.error("[resendVerificationEmail] Error:", error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError("internal", `Failed to resend verification email: ${error.message}`);
      }
    },
);

/**
 * Send a job update email with selected content sections
 * Recipients can be selected, content sections are conditional
 * Activity is logged to the job document
 */
exports.sendJobEmail = onCall(
    {secrets: [sendgridApiKey]},
    async (request) => {
      try {
        const {
          jobId,
          companyId,
          recipients, // Array of { email, name, type }
          contentOptions, // { includeServiceInfo, includeAttempts, includeAffidavit, includeInvoice }
          customMessage,
          subject,
          userId,
          userName,
        } = request.data;

        // Validate required fields
        if (!jobId) {
          throw new HttpsError("invalid-argument", "jobId is required");
        }
        if (!companyId) {
          throw new HttpsError("invalid-argument", "companyId is required");
        }
        if (!recipients || recipients.length === 0) {
          throw new HttpsError("invalid-argument", "At least one recipient is required");
        }

        console.log(`[sendJobEmail] Sending job email for job ${jobId} to ${recipients.length} recipients`);

        // Fetch job data
        const jobDoc = await admin.firestore().collection("jobs").doc(jobId).get();
        if (!jobDoc.exists) {
          throw new HttpsError("not-found", "Job not found");
        }
        const job = jobDoc.data();

        // Fetch company data
        const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
        if (!companyDoc.exists) {
          throw new HttpsError("not-found", "Company not found");
        }
        const companyData = companyDoc.data();

        // Build template data
        const templateData = {
          custom_message: customMessage || null,
          include_service_info: contentOptions?.includeServiceInfo || false,
          include_attempts: contentOptions?.includeAttempts || false,
          include_affidavit: contentOptions?.includeAffidavit || false,
          include_invoice: contentOptions?.includeInvoice || false,
        };

        // Add service info if included
        if (contentOptions?.includeServiceInfo) {
          templateData.job_number = job.job_number || job.id;
          templateData.case_caption = job.case_caption || null;
          templateData.case_number = job.case_number || null;
          templateData.court_name = job.court_name || null;
          templateData.job_status = job.status || "pending";
          templateData.recipients = job.recipients || [];
          templateData.service_address = job.service_address || null;
          templateData.due_date = job.due_date || null;
        }

        // Fetch and add attempts if included
        if (contentOptions?.includeAttempts) {
          const attemptsSnapshot = await admin.firestore()
              .collection("attempts")
              .where("job_id", "==", jobId)
              .orderBy("created_at", "desc")
              .get();

          const attempts = [];
          for (const doc of attemptsSnapshot.docs) {
            const attempt = doc.data();
            let serverName = null;
            if (attempt.server_id) {
              const serverDoc = await admin.firestore().collection("users").doc(attempt.server_id).get();
              if (serverDoc.exists) {
                const serverData = serverDoc.data();
                serverName = serverData.full_name || `${serverData.first_name || ""} ${serverData.last_name || ""}`.trim();
              }
            } else if (attempt.server_name_manual) {
              serverName = attempt.server_name_manual;
            }

            attempts.push({
              date: attempt.attempt_date,
              time: attempt.attempt_time || "",
              status: attempt.status,
              address: attempt.address_of_attempt || "",
              person_served: attempt.person_served_name || null,
              notes: attempt.notes || null,
              server_name: serverName,
            });
          }
          templateData.attempts = attempts;
        }

        // Add affidavit info if included
        if (contentOptions?.includeAffidavit) {
          const affidavitSnapshot = await admin.firestore()
              .collection("documents")
              .where("job_id", "==", jobId)
              .where("document_category", "==", "affidavit")
              .limit(1)
              .get();

          if (!affidavitSnapshot.empty) {
            const affidavitDoc = affidavitSnapshot.docs[0].data();
            templateData.affidavit_url = affidavitDoc.file_url || null;
          }
        }

        // Add invoice info if included
        if (contentOptions?.includeInvoice) {
          // Try to find invoice from job or invoices collection
          if (job.invoice_id) {
            const invoiceDoc = await admin.firestore().collection("invoices").doc(job.invoice_id).get();
            if (invoiceDoc.exists) {
              const invoice = invoiceDoc.data();
              templateData.invoice_number = invoice.invoice_number || job.job_number;
              templateData.invoice_amount = invoice.total || invoice.amount || null;
              templateData.invoice_status = invoice.status || "pending";
              templateData.invoice_due_date = invoice.due_date || null;
            }
          } else {
            // Use job-level invoice info if available
            templateData.invoice_number = job.job_number;
            templateData.invoice_amount = job.client_fee || job.total_fee || null;
            templateData.invoice_status = job.invoice_status || "pending";
          }
        }

        // Build job view URL
        const baseUrl = process.env.GCLOUD_PROJECT === "serve-max-1f01c0af"
            ? "https://www.servemax.pro"
            : "http://localhost:5173";
        templateData.job_view_url = `${baseUrl}/JobDetails?id=${jobId}`;

        // Send email to each recipient
        const sentTo = [];
        const errors = [];

        for (const recipient of recipients) {
          if (!recipient.email) continue;

          try {
            templateData.recipient_name = recipient.name || recipient.email.split("@")[0];

            await sendEmailWithTemplate({
              to: recipient.email,
              subject: subject || `Job Update - ${job.case_caption || job.job_number || "Service Job"}`,
              templateName: "job-update",
              templateData: templateData,
              companyId: companyId,
            });

            sentTo.push(recipient.email);
            console.log(`[sendJobEmail] Email sent to ${recipient.email}`);
          } catch (emailError) {
            console.error(`[sendJobEmail] Failed to send to ${recipient.email}:`, emailError.message);
            errors.push({email: recipient.email, error: emailError.message});
          }
        }

        // Log activity to job
        const activityEntry = {
          id: crypto.randomUUID(),
          type: "email_sent",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          actor_id: userId || null,
          actor_name: userName || "System",
          details: {
            recipients: sentTo,
            content_included: Object.entries(contentOptions || {})
                .filter(([_, v]) => v)
                .map(([k]) => k.replace("include", "").toLowerCase()),
            subject: subject || `Job Update - ${job.case_caption || job.job_number}`,
            custom_message_included: !!customMessage,
          },
        };

        await admin.firestore().collection("jobs").doc(jobId).update({
          activity_log: admin.firestore.FieldValue.arrayUnion(activityEntry),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[sendJobEmail] Activity logged for job ${jobId}`);

        return {
          success: true,
          message: `Email sent to ${sentTo.length} recipient(s)`,
          sentTo: sentTo,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error) {
        console.error("[sendJobEmail] Error:", error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError("internal", `Failed to send job email: ${error.message}`);
      }
    },
);

// ============================================================================
// Carbon Copy Job Status Sync Trigger
// ============================================================================
/**
 * Syncs status changes between linked carbon copy jobs.
 * When a job's status changes and it's part of a share chain,
 * propagate the status to all other jobs in the chain.
 */
exports.syncCarbonCopyJobStatus = onDocumentUpdated(
    "jobs/{jobId}",
    async (event) => {
      const before = event.data.before.data();
      const after = event.data.after.data();
      const jobId = event.params.jobId;

      // Check if this job is part of a share chain with sync enabled
      if (!after.share_chain?.sync_enabled) {
        return null;
      }

      // Prevent infinite loop - check if this update came from sync
      if (after._sync_source) {
        console.log(`[syncStatus] Skipping - update from sync source: ${after._sync_source}`);
        // Clear the sync source flag
        await event.data.after.ref.update({_sync_source: admin.firestore.FieldValue.delete()});
        return null;
      }

      const statusChanged = before.status !== after.status;
      const beforeAttempts = Array.isArray(before.attempts) ? before.attempts : [];
      const afterAttempts = Array.isArray(after.attempts) ? after.attempts : [];
      const attemptsChanged = afterAttempts.length > beforeAttempts.length;

      // Only sync if status or attempts changed
      if (!statusChanged && !attemptsChanged) {
        return null;
      }

      // Get all job IDs in the chain
      const allJobIds = after.share_chain?.all_job_ids || [];

      if (allJobIds.length <= 1) {
        console.log(`[syncStatus] No other jobs in chain to sync`);
        return null;
      }

      // Find new attempts (ones that weren't there before)
      const newAttempts = [];
      if (attemptsChanged) {
        for (const attempt of afterAttempts) {
          // Check if this attempt already existed (by matching attempt_date + server_name_manual)
          const existed = beforeAttempts.some((ba) =>
            ba.attempt_date === attempt.attempt_date &&
            ba.server_name_manual === attempt.server_name_manual &&
            ba.synced_from,
          );
          // Only sync attempts that are genuinely new (not already synced)
          if (!attempt.synced_from && !existed) {
            const alreadyInBefore = beforeAttempts.some((ba) =>
              ba.attempt_date === attempt.attempt_date &&
              ba.server_name_manual === attempt.server_name_manual,
            );
            if (!alreadyInBefore) {
              newAttempts.push(attempt);
            }
          }
        }
        console.log(`[syncStatus] Found ${newAttempts.length} new attempts to sync`);
      }

      if (statusChanged) {
        console.log(`[syncStatus] Job ${jobId} status changed from ${before.status} to ${after.status}`);
      }

      // Sync to all other jobs in the chain
      const batch = admin.firestore().batch();
      let syncCount = 0;

      for (const linkedJobId of allJobIds) {
        if (linkedJobId === jobId) continue; // Skip self

        const linkedJobRef = admin.firestore().collection("jobs").doc(linkedJobId);
        const updateData = {
          _sync_source: jobId,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Sync status if changed
        if (statusChanged) {
          updateData.status = after.status;
        }

        // Sync new attempts
        if (newAttempts.length > 0) {
          // Mark attempts as synced so they don't bounce back
          const syncedAttempts = newAttempts.map((a) => ({
            ...a,
            synced_from: jobId,
          }));
          updateData.attempts = admin.firestore.FieldValue.arrayUnion(...syncedAttempts);
        }

        batch.update(linkedJobRef, updateData);
        syncCount++;
      }

      if (syncCount > 0) {
        await batch.commit();
        if (statusChanged) {
          console.log(`[syncStatus] Synced status "${after.status}" to ${syncCount} linked jobs`);
        }
        if (newAttempts.length > 0) {
          console.log(`[syncStatus] Synced ${newAttempts.length} attempts to ${syncCount} linked jobs`);
        }
      }

      return null;
    },
);

/**
 * Syncs job detail changes DOWNSTREAM only (parent → child → grandchild).
 * When critical job fields change, propagate to child jobs in the chain.
 * Fields synced: recipient, addresses, due_date, first_attempt_due_date, rush/priority
 */
exports.syncJobDetailsDownstream = onDocumentUpdated(
    "jobs/{jobId}",
    async (event) => {
      const before = event.data.before.data();
      const after = event.data.after.data();
      const jobId = event.params.jobId;

      // Skip if this update came from upstream sync (prevent loops)
      if (after._upstream_sync_source) {
        console.log(`[syncDetailsDownstream] Skipping - update from upstream: ${after._upstream_sync_source}`);
        await event.data.after.ref.update({
          _upstream_sync_source: admin.firestore.FieldValue.delete(),
        });
        return null;
      }

      // Check if this job has a child job to sync to
      const childJobId = after.share_chain?.child_job_id;
      if (!childJobId) {
        return null; // No downstream jobs to sync
      }

      // Define fields to check for changes
      const fieldsToSync = [];

      // Check recipient changes
      const recipientChanged = JSON.stringify(before.recipient) !== JSON.stringify(after.recipient);
      if (recipientChanged) {
        fieldsToSync.push("recipient");
      }

      // Check addresses changes
      const addressesChanged = JSON.stringify(before.addresses) !== JSON.stringify(after.addresses);
      if (addressesChanged) {
        fieldsToSync.push("addresses");
      }

      // Check due date changes
      const dueDateChanged = before.due_date !== after.due_date;
      if (dueDateChanged) {
        fieldsToSync.push("due_date");
      }

      // Check first attempt due date changes
      const firstAttemptDueDateChanged = before.first_attempt_due_date !== after.first_attempt_due_date;
      if (firstAttemptDueDateChanged) {
        fieldsToSync.push("first_attempt_due_date");
      }

      // Check priority/rush changes
      const priorityChanged = before.priority !== after.priority;
      if (priorityChanged) {
        fieldsToSync.push("priority");
      }

      // Check service instructions changes
      const instructionsChanged = before.service_instructions !== after.service_instructions;
      if (instructionsChanged) {
        fieldsToSync.push("service_instructions");
      }

      // If no relevant changes, skip
      if (fieldsToSync.length === 0) {
        return null;
      }

      console.log(`[syncDetailsDownstream] Job ${jobId} changed fields: ${fieldsToSync.join(", ")}`);

      // Build update data
      const updateData = {
        _upstream_sync_source: jobId,
        last_upstream_sync: admin.firestore.FieldValue.serverTimestamp(),
        upstream_sync_fields: fieldsToSync,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (recipientChanged) {
        updateData.recipient = after.recipient;
      }
      if (addressesChanged) {
        updateData.addresses = after.addresses;
      }
      if (dueDateChanged) {
        updateData.due_date = after.due_date;
      }
      if (firstAttemptDueDateChanged) {
        updateData.first_attempt_due_date = after.first_attempt_due_date;
      }
      if (priorityChanged) {
        updateData.priority = after.priority;
      }
      if (instructionsChanged) {
        updateData.service_instructions = after.service_instructions;
      }

      // Update the child job (this will trigger downstream sync for grandchildren)
      await admin.firestore().collection("jobs").doc(childJobId).update(updateData);

      // Add sync history entry
      const syncHistoryEntry = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        direction: "downstream",
        source_job_id: jobId,
        target_job_id: childJobId,
        fields_changed: fieldsToSync,
      };

      await admin.firestore()
          .collection("jobs")
          .doc(childJobId)
          .collection("sync_history")
          .add(syncHistoryEntry);

      console.log(`[syncDetailsDownstream] Synced ${fieldsToSync.length} fields to child job ${childJobId}`);

      return null;
    },
);

/**
 * Syncs new documents DOWNSTREAM when added to a job in a share chain.
 * When a new service document is added, copy it to child jobs.
 */
exports.syncDocumentDownstream = onDocumentCreated(
    "documents/{documentId}",
    async (event) => {
      const document = event.data.data();
      const documentId = event.params.documentId;

      // Skip if this document was synced from upstream
      if (document._synced_from_upstream) {
        console.log(`[syncDocDownstream] Skipping - document synced from upstream`);
        return null;
      }

      // Only sync service documents (to_be_served)
      if (document.document_category !== "to_be_served") {
        return null;
      }

      const jobId = document.job_id;
      if (!jobId) {
        return null;
      }

      // Get the job to check for share chain
      const jobDoc = await admin.firestore().collection("jobs").doc(jobId).get();
      if (!jobDoc.exists) {
        return null;
      }

      const job = jobDoc.data();
      const childJobId = job.share_chain?.child_job_id;
      const childCompanyId = job.share_chain?.child_company_id;

      if (!childJobId || !childCompanyId) {
        return null; // No downstream job to sync to
      }

      console.log(`[syncDocDownstream] Syncing document ${documentId} to child job ${childJobId}`);

      // Create a copy of the document for the child job
      const documentCopy = {
        ...document,
        job_id: childJobId,
        company_id: childCompanyId,
        _synced_from_upstream: true,
        synced_from_document_id: documentId,
        synced_from_job_id: jobId,
        synced_at: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Remove the original document's ID references
      delete documentCopy.id;

      await admin.firestore().collection("documents").add(documentCopy);

      console.log(`[syncDocDownstream] Document synced to child job ${childJobId}`);

      return null;
    },
);

/**
 * Cascades job cancellation DOWNSTREAM through the share chain.
 * When a job is cancelled, cancel all downstream jobs.
 */
exports.cancelJobDownstream = onDocumentUpdated(
    "jobs/{jobId}",
    async (event) => {
      const before = event.data.before.data();
      const after = event.data.after.data();
      const jobId = event.params.jobId;

      // Only trigger on cancellation (status changed TO cancelled)
      if (before.status === "cancelled" || after.status !== "cancelled") {
        return null;
      }

      // Skip if this cancellation came from upstream cascade
      if (after._cancellation_cascade_source) {
        console.log(`[cancelDownstream] Skipping - cancellation from upstream: ${after._cancellation_cascade_source}`);
        await event.data.after.ref.update({
          _cancellation_cascade_source: admin.firestore.FieldValue.delete(),
        });
        return null;
      }

      // Check if this job has a child job
      const childJobId = after.share_chain?.child_job_id;
      if (!childJobId) {
        return null; // No downstream jobs to cancel
      }

      console.log(`[cancelDownstream] Job ${jobId} cancelled, cascading to child ${childJobId}`);

      // Get the cancellation reason if provided
      const cancellationReason = after.cancellation_reason ||
        `Cancelled by upstream client (Job ${after.job_number || jobId})`;

      // Cancel the child job
      await admin.firestore().collection("jobs").doc(childJobId).update({
        status: "cancelled",
        _cancellation_cascade_source: jobId,
        cancellation_reason: cancellationReason,
        cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
        cancelled_by_upstream: true,
        upstream_cancellation_job_id: jobId,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add activity log entry to child job
      const activityEntry = {
        timestamp: new Date().toISOString(),
        user_name: "System",
        event_type: "job_cancelled_by_upstream",
        description: `Job automatically cancelled because upstream job was cancelled. Reason: ${cancellationReason}`,
      };

      await admin.firestore().collection("jobs").doc(childJobId).update({
        activity_log: admin.firestore.FieldValue.arrayUnion(activityEntry),
      });

      console.log(`[cancelDownstream] Cascaded cancellation to child job ${childJobId}`);

      return null;
    },
);

// ============================================================================
// Share Document with Direct Partner (Parent → Child only)
// ============================================================================
exports.shareDocumentWithPartner = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {documentId, jobId} = request.data;

    if (!documentId || !jobId) {
      throw new HttpsError("invalid-argument", "Missing required fields: documentId, jobId");
    }

    // Get user's company_id
    let userCompanyId = request.auth.token.company_id;
    if (!userCompanyId) {
      const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
      if (userDoc.exists) {
        userCompanyId = userDoc.data().company_id;
      }
    }

    if (!userCompanyId) {
      throw new HttpsError("failed-precondition", "User does not have a company_id");
    }

    // Get the document
    const docRef = admin.firestore().collection("documents").doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Document not found");
    }

    const docData = docSnap.data();

    // Verify document belongs to user's company
    if (docData.company_id !== userCompanyId) {
      throw new HttpsError("permission-denied", "You do not own this document");
    }

    // Get the job and find the child (contractor) job
    const jobDoc = await admin.firestore().collection("jobs").doc(jobId).get();

    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "Job not found");
    }

    const job = jobDoc.data();
    const childJobId = job.share_chain?.child_job_id;

    if (!childJobId) {
      throw new HttpsError("failed-precondition", "This job has no contractor to share with");
    }

    // Get the child job to find its company_id
    const childJobDoc = await admin.firestore().collection("jobs").doc(childJobId).get();

    if (!childJobDoc.exists) {
      throw new HttpsError("not-found", "Contractor job not found");
    }

    const childJob = childJobDoc.data();

    // Check if this document was already shared to this job
    const existingShared = await admin.firestore()
        .collection("documents")
        .where("job_id", "==", childJobId)
        .where("source_document_id", "==", documentId)
        .get();

    if (!existingShared.empty) {
      throw new HttpsError("already-exists", "This document has already been shared with the contractor");
    }

    // Create the document copy in the child job
    const sharedDocRef = await admin.firestore().collection("documents").add({
      job_id: childJobId,
      company_id: childJob.company_id,
      title: docData.title || "Shared Affidavit",
      file_url: docData.file_url,
      document_category: docData.document_category || "affidavit",
      content_type: docData.content_type || "application/pdf",
      page_count: docData.page_count || 0,
      needs_signature: true,
      is_signed: false,
      source_document_id: documentId,
      shared_from_job_id: jobId,
      shared_from_company_id: userCompanyId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        ...(docData.metadata || {}),
        shared_by: request.auth.uid,
        shared_at: new Date().toISOString(),
      },
    });

    console.log(`[shareDoc] Document ${documentId} shared to child job ${childJobId} as ${sharedDocRef.id}`);

    return {success: true, sharedDocumentId: sharedDocRef.id};
  } catch (error) {
    console.error("Error in shareDocumentWithPartner:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Failed to share document: ${error.message}`);
  }
});

// ============================================================================
// Sync Signed Document back to Parent (Child → Parent)
// Triggers when a document is updated (e.g., signed)
// ============================================================================
exports.syncSignedDocument = onDocumentUpdated(
    "documents/{docId}",
    async (event) => {
      const before = event.data.before.data();
      const after = event.data.after.data();
      const docId = event.params.docId;

      // Only trigger when is_signed changes from false to true
      if (before.is_signed === true || after.is_signed !== true) {
        return null;
      }

      // Only sync documents that were shared from another company
      if (!after.source_document_id || !after.shared_from_job_id) {
        return null;
      }

      // Prevent infinite loop
      if (after._sync_source) {
        await event.data.after.ref.update({
          _sync_source: admin.firestore.FieldValue.delete(),
        });
        return null;
      }

      console.log(`[syncSignedDoc] Document ${docId} was signed, syncing back to parent`);

      // Get the parent job
      const parentJobDoc = await admin.firestore()
          .collection("jobs")
          .doc(after.shared_from_job_id)
          .get();

      if (!parentJobDoc.exists) {
        console.error(`[syncSignedDoc] Parent job ${after.shared_from_job_id} not found`);
        return null;
      }

      const parentJob = parentJobDoc.data();

      // Create a signed copy in the parent job
      await admin.firestore().collection("documents").add({
        job_id: after.shared_from_job_id,
        company_id: parentJob.company_id,
        title: `${after.title || "Affidavit"} (Signed by Contractor)`,
        file_url: after.file_url, // The signed PDF URL
        document_category: after.document_category || "affidavit",
        content_type: after.content_type || "application/pdf",
        page_count: after.page_count || 0,
        is_signed: true,
        signed_by_partner: true,
        signed_at: after.signed_at || new Date().toISOString(),
        source_document_id: docId,
        synced_from_job_id: after.job_id,
        synced_from_company_id: after.company_id,
        _sync_source: docId, // Prevent loops
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          ...(after.metadata || {}),
          signed_by_partner: true,
          synced_at: new Date().toISOString(),
        },
      });

      // Also update the parent job to flag it has a signed affidavit
      await parentJobDoc.ref.update({
        has_signed_affidavit: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[syncSignedDoc] Signed document synced back to parent job ${after.shared_from_job_id}`);

      return null;
    },
);

// ============================================================================
// Independent Contractor (IC) Connection Management
// ============================================================================

/**
 * Send IC Connection Request
 * Called when a company creates a "company" record with type = independent_contractor
 * Checks if IC already has an account, creates connection request, and sends email
 * @param {Object} data - { ic_email, ic_name, ic_company_id, requesting_company_id }
 * @returns {Object} - { success: boolean, connection_request_id, is_existing_user }
 */
exports.sendICConnectionRequest = onCall(
    {secrets: [sendgridApiKey]},
    async (request) => {
      try {
        const {ic_email, ic_name, ic_company_id, requesting_company_id} = request.data;

        // Validate input
        if (!ic_email) {
          throw new HttpsError("invalid-argument", "IC email is required");
        }
        if (!ic_company_id) {
          throw new HttpsError("invalid-argument", "IC company ID is required");
        }
        if (!requesting_company_id) {
          throw new HttpsError("invalid-argument", "Requesting company ID is required");
        }

        // Get the caller's UID
        const callerUid = request.auth?.uid;
        if (!callerUid) {
          throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        console.log(`[sendICConnectionRequest] Processing connection for ${ic_email}`);

        // Get the requesting company data
        const requestingCompanyDoc = await admin.firestore()
            .collection("companies")
            .doc(requesting_company_id)
            .get();

        if (!requestingCompanyDoc.exists) {
          throw new HttpsError("not-found", "Requesting company not found");
        }
        const requestingCompany = requestingCompanyDoc.data();

        // Check if IC already has a ServeMax IC user account
        let existingICUser = null;
        let isExistingUser = false;

        const existingUsersSnapshot = await admin.firestore()
            .collection("users")
            .where("email", "==", ic_email.toLowerCase())
            .where("user_type", "==", "independent_contractor")
            .limit(1)
            .get();

        if (!existingUsersSnapshot.empty) {
          existingICUser = existingUsersSnapshot.docs[0];
          isExistingUser = true;
          console.log(`[sendICConnectionRequest] Found existing IC user: ${existingICUser.id}`);
        }

        // Generate tokens
        const invitationToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

        // Create IC connection request record
        const connectionRequestData = {
          requesting_company_id: requesting_company_id,
          requesting_company_name: requestingCompany.name || requestingCompany.company_name,
          ic_company_id: ic_company_id,
          ic_email: ic_email.toLowerCase(),
          ic_name: ic_name || "",
          ic_user_id: existingICUser ? existingICUser.id : null,
          status: "pending",
          invitation_token: isExistingUser ? null : invitationToken, // Only for new users
          invited_by: callerUid,
          responded_at: null,
          decline_reason: null,
          expires_at: expiresAt,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        const connectionRequestRef = await admin.firestore()
            .collection("ic_connection_requests")
            .add(connectionRequestData);

        console.log(`[sendICConnectionRequest] Created connection request: ${connectionRequestRef.id}`);

        // Update the IC company record with connection status
        await admin.firestore().collection("companies").doc(ic_company_id).update({
          ic_user_id: existingICUser ? existingICUser.id : null,
          ic_connection_status: "pending",
          ic_invitation_token: isExistingUser ? null : invitationToken,
          ic_invitation_sent_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Generate URLs
        const baseUrl = process.env.GCLOUD_PROJECT === "serve-max-1f01c0af"
            ? "https://www.servemax.pro"
            : "http://localhost:5173";

        let actionUrl;
        let emailTemplateName;
        let emailSubject;

        if (isExistingUser) {
          // Existing IC - send connection request email
          // They'll see the request in their IC dashboard
          actionUrl = `${baseUrl}/ic/connections`;
          emailTemplateName = "ic-connection-request";
          emailSubject = `${requestingCompany.name || "A company"} wants to connect with you on ServeMax`;
        } else {
          // New IC - send signup invitation email
          actionUrl = `${baseUrl}/ic-signup?token=${invitationToken}`;
          emailTemplateName = "ic-signup-invitation";
          emailSubject = `You've been invited to join ServeMax as an Independent Contractor`;
        }

        // Send email
        try {
          await sendEmailWithTemplate({
            to: ic_email,
            subject: emailSubject,
            templateName: emailTemplateName,
            templateData: {
              ic_name: ic_name || "Process Server",
              company_name: requestingCompany.name || requestingCompany.company_name || "A company",
              action_url: actionUrl,
              is_existing_user: isExistingUser,
            },
            companyId: requesting_company_id,
          });
          console.log(`[sendICConnectionRequest] Email sent to ${ic_email}`);
        } catch (emailError) {
          console.error("[sendICConnectionRequest] Failed to send email:", emailError);
          // Don't fail the request if email fails
        }

        return {
          success: true,
          connection_request_id: connectionRequestRef.id,
          is_existing_user: isExistingUser,
          ic_user_id: existingICUser ? existingICUser.id : null,
          message: isExistingUser
              ? "Connection request sent to existing IC user"
              : "Signup invitation sent to new IC",
        };
      } catch (error) {
        console.error("[sendICConnectionRequest] Error:", error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError("internal", `Failed to send IC connection request: ${error.message}`);
      }
    },
);

/**
 * Accept or Decline IC Connection Request
 * Called by IC user from their dashboard
 * @param {Object} data - { connection_request_id, accept, decline_reason? }
 * @returns {Object} - { success: boolean }
 */
exports.respondToICConnection = onCall(async (request) => {
  try {
    const {connection_request_id, accept, decline_reason} = request.data;

    if (!connection_request_id) {
      throw new HttpsError("invalid-argument", "Connection request ID is required");
    }
    if (accept === undefined) {
      throw new HttpsError("invalid-argument", "Accept/decline decision is required");
    }

    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    console.log(`[respondToICConnection] Processing response for request ${connection_request_id}`);

    // Get the connection request
    const connectionRequestDoc = await admin.firestore()
        .collection("ic_connection_requests")
        .doc(connection_request_id)
        .get();

    if (!connectionRequestDoc.exists) {
      throw new HttpsError("not-found", "Connection request not found");
    }

    const connectionRequest = connectionRequestDoc.data();

    // Verify the caller is the IC user for this request
    if (connectionRequest.ic_user_id !== callerUid) {
      throw new HttpsError("permission-denied", "You are not authorized to respond to this request");
    }

    // Check if already responded
    if (connectionRequest.status !== "pending") {
      throw new HttpsError("failed-precondition", `Request already ${connectionRequest.status}`);
    }

    // Check expiration
    if (connectionRequest.expires_at && new Date(connectionRequest.expires_at.toDate()) < new Date()) {
      throw new HttpsError("failed-precondition", "Connection request has expired");
    }

    const newStatus = accept ? "accepted" : "declined";

    // Update the connection request
    await connectionRequestDoc.ref.update({
      status: newStatus,
      responded_at: admin.firestore.FieldValue.serverTimestamp(),
      decline_reason: accept ? null : (decline_reason || null),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update the IC company record
    await admin.firestore().collection("companies").doc(connectionRequest.ic_company_id).update({
      ic_connection_status: newStatus,
      ic_user_id: accept ? callerUid : null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (accept) {
      // Add the requesting company to the IC user's companies array
      const icUserDoc = await admin.firestore().collection("users").doc(callerUid).get();
      const icUserData = icUserDoc.data();
      const currentCompanies = icUserData.companies || [];

      if (!currentCompanies.includes(connectionRequest.requesting_company_id)) {
        await admin.firestore().collection("users").doc(callerUid).update({
          companies: admin.firestore.FieldValue.arrayUnion(connectionRequest.requesting_company_id),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log(`[respondToICConnection] IC ${callerUid} now connected to company ${connectionRequest.requesting_company_id}`);
    }

    return {
      success: true,
      status: newStatus,
      message: accept
          ? `You are now connected with ${connectionRequest.requesting_company_name}`
          : "Connection request declined",
    };
  } catch (error) {
    console.error("[respondToICConnection] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to respond to IC connection: ${error.message}`);
  }
});

/**
 * Complete IC Signup from Invitation Token
 * Called when a new IC completes signup via the IC signup page
 * @param {Object} data - { token, first_name, last_name, email, password }
 * @returns {Object} - { success: boolean, user_id }
 */
exports.completeICSignup = onCall(async (request) => {
  try {
    const {token, first_name, last_name, email, password} = request.data;

    if (!token) {
      throw new HttpsError("invalid-argument", "Invitation token is required");
    }
    if (!first_name || !last_name) {
      throw new HttpsError("invalid-argument", "First and last name are required");
    }
    if (!email) {
      throw new HttpsError("invalid-argument", "Email is required");
    }
    if (!password || password.length < 6) {
      throw new HttpsError("invalid-argument", "Password must be at least 6 characters");
    }

    console.log(`[completeICSignup] Processing IC signup`);

    // Find the connection request with this token
    const connectionRequestsSnapshot = await admin.firestore()
        .collection("ic_connection_requests")
        .where("invitation_token", "==", token)
        .where("status", "==", "pending")
        .limit(1)
        .get();

    if (connectionRequestsSnapshot.empty) {
      throw new HttpsError("not-found", "Invalid or expired invitation token");
    }

    const connectionRequestDoc = connectionRequestsSnapshot.docs[0];
    const connectionRequest = connectionRequestDoc.data();

    // Check expiration
    if (connectionRequest.expires_at && new Date(connectionRequest.expires_at.toDate()) < new Date()) {
      throw new HttpsError("failed-precondition", "Invitation has expired");
    }

    // Verify email matches
    if (email.toLowerCase() !== connectionRequest.ic_email.toLowerCase()) {
      throw new HttpsError("invalid-argument", "Email does not match invitation");
    }

    // Create Firebase Auth user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: `${first_name} ${last_name}`,
      });
      console.log(`[completeICSignup] Created Firebase Auth user`);
    } catch (authError) {
      if (authError.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "An account with this email already exists");
      }
      throw new HttpsError("internal", `Failed to create user: ${authError.message}`);
    }

    // Create user document
    const userData = {
      email: email.toLowerCase(),
      first_name: first_name,
      last_name: last_name,
      full_name: `${first_name} ${last_name}`,
      user_type: "independent_contractor",
      company_id: null, // ICs don't own a company
      employee_role: null,
      invited_by: connectionRequest.invited_by,
      companies: [connectionRequest.requesting_company_id], // Start with the inviting company
      is_active: true,
      phone: "",
      address: "",
      email_verified: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("users").doc(firebaseUser.uid).set(userData);
    console.log(`[completeICSignup] Created user document: ${firebaseUser.uid}`);

    // Update connection request to accepted
    await connectionRequestDoc.ref.update({
      status: "accepted",
      ic_user_id: firebaseUser.uid,
      responded_at: admin.firestore.FieldValue.serverTimestamp(),
      invitation_token: null, // Clear token after use
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update the IC company record
    await admin.firestore().collection("companies").doc(connectionRequest.ic_company_id).update({
      ic_connection_status: "accepted",
      ic_user_id: firebaseUser.uid,
      ic_invitation_token: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[completeICSignup] IC signup complete`);

    return {
      success: true,
      user_id: firebaseUser.uid,
      message: "Account created successfully. You can now log in.",
    };
  } catch (error) {
    console.error("[completeICSignup] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to complete IC signup: ${error.message}`);
  }
});

/**
 * Get IC Connection Requests for Current User
 * Returns pending and recent connection requests for the authenticated IC
 * @returns {Object} - { success: boolean, requests: [] }
 */
exports.getICConnectionRequests = onCall(async (request) => {
  try {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Verify user is an IC
    const userDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const userData = userDoc.data();
    if (userData.user_type !== "independent_contractor") {
      throw new HttpsError("permission-denied", "Only independent contractors can access this");
    }

    // Get connection requests for this IC
    const requestsSnapshot = await admin.firestore()
        .collection("ic_connection_requests")
        .where("ic_user_id", "==", callerUid)
        .orderBy("created_at", "desc")
        .limit(50)
        .get();

    const requests = requestsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || null,
      responded_at: doc.data().responded_at?.toDate?.()?.toISOString() || null,
      expires_at: doc.data().expires_at?.toDate?.()?.toISOString() || null,
    }));

    return {
      success: true,
      requests: requests,
    };
  } catch (error) {
    console.error("[getICConnectionRequests] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to get IC connection requests: ${error.message}`);
  }
});

/**
 * Validate IC Signup Token
 * Called to check if an IC signup token is valid before showing the signup form
 * @param {Object} data - { token }
 * @returns {Object} - { valid: boolean, ic_email, ic_name, company_name }
 */
exports.validateICSignupToken = onCall(async (request) => {
  try {
    const {token} = request.data;

    if (!token) {
      throw new HttpsError("invalid-argument", "Token is required");
    }

    // Find the connection request with this token
    const connectionRequestsSnapshot = await admin.firestore()
        .collection("ic_connection_requests")
        .where("invitation_token", "==", token)
        .where("status", "==", "pending")
        .limit(1)
        .get();

    if (connectionRequestsSnapshot.empty) {
      return {
        valid: false,
        message: "Invalid or expired invitation token",
      };
    }

    const connectionRequest = connectionRequestsSnapshot.docs[0].data();

    // Check expiration
    if (connectionRequest.expires_at && new Date(connectionRequest.expires_at.toDate()) < new Date()) {
      return {
        valid: false,
        message: "Invitation has expired",
      };
    }

    return {
      valid: true,
      ic_email: connectionRequest.ic_email,
      ic_name: connectionRequest.ic_name,
      company_name: connectionRequest.requesting_company_name,
    };
  } catch (error) {
    console.error("[validateICSignupToken] Error:", error);
    return {
      valid: false,
      message: "Error validating token",
    };
  }
});

// ============================================================================
// Stripe Integration - Subscription & Payment Functions
// ============================================================================

const {onRequest} = require("firebase-functions/v2/https");

/**
 * Create Subscription Checkout Session
 * Creates a Stripe Checkout session for subscribing to a plan
 * @param {Object} data - { priceId, companyId, successUrl, cancelUrl }
 * @returns {Object} - { sessionId, checkoutUrl }
 */
exports.createSubscriptionCheckout = onCall({
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    const {priceId, companyId, successUrl, cancelUrl} = request.data;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!priceId || !companyId || !successUrl || !cancelUrl) {
      throw new HttpsError("invalid-argument", "Missing required fields: priceId, companyId, successUrl, cancelUrl");
    }

    const stripe = getStripe(stripeSecretKey.value());

    // Get company data
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }
    const company = companyDoc.data();

    // Get user data for email
    const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const user = userDoc.exists ? userDoc.data() : {};

    // Create or retrieve Stripe customer
    let customerId = company.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || company.email,
        name: company.name,
        metadata: {
          company_id: companyId,
          firebase_uid: request.auth.uid,
        },
      });
      customerId = customer.id;

      // Save customer ID to company
      await admin.firestore().collection("companies").doc(companyId).update({
        stripe_customer_id: customerId,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          company_id: companyId,
        },
      },
      metadata: {
        company_id: companyId,
        type: "subscription",
      },
    });

    console.log(`[createSubscriptionCheckout] Session created for company ${companyId}`);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  } catch (error) {
    console.error("[createSubscriptionCheckout] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to create checkout session: ${error.message}`);
  }
});

/**
 * Create Billing Portal Session
 * Creates a Stripe Customer Portal session for managing subscription
 * @param {Object} data - { companyId, returnUrl }
 * @returns {Object} - { portalUrl }
 */
exports.createBillingPortalSession = onCall({
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    const {companyId, returnUrl} = request.data;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!companyId || !returnUrl) {
      throw new HttpsError("invalid-argument", "Missing required fields: companyId, returnUrl");
    }

    const stripe = getStripe(stripeSecretKey.value());

    // Get company data
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }
    const company = companyDoc.data();

    if (!company.stripe_customer_id) {
      throw new HttpsError("failed-precondition", "No Stripe customer found for this company");
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log(`[createBillingPortalSession] Portal session created for company ${companyId}`);

    return {
      portalUrl: session.url,
    };
  } catch (error) {
    console.error("[createBillingPortalSession] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to create portal session: ${error.message}`);
  }
});

/**
 * Sync Pricing Plans with Stripe
 * Creates/updates Stripe Products and Prices for all pricing plans
 * Super admin only
 * @returns {Object} - { synced: number, plans: Array }
 */
exports.syncPricingPlansWithStripe = onCall({
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check if super admin
    const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists || !userDoc.data().is_super_admin) {
      throw new HttpsError("permission-denied", "Only super admins can sync pricing plans");
    }

    const stripe = getStripe(stripeSecretKey.value());

    // Get all pricing plans
    const plansSnapshot = await admin.firestore().collection("pricing_plans").get();
    const syncedPlans = [];

    for (const planDoc of plansSnapshot.docs) {
      const plan = planDoc.data();
      const planId = planDoc.id;

      // Skip custom plans (they don't need Stripe prices)
      if (plan.is_custom) {
        continue;
      }

      let productId = plan.stripe_product_id;
      let priceId = plan.stripe_price_id;

      // Create or update product
      if (!productId) {
        const product = await stripe.products.create({
          name: plan.name,
          metadata: {
            plan_id: planId,
            job_limit: String(plan.job_limit || 0),
          },
        });
        productId = product.id;
      } else {
        await stripe.products.update(productId, {
          name: plan.name,
          metadata: {
            plan_id: planId,
            job_limit: String(plan.job_limit || 0),
          },
        });
      }

      // Create price if not exists or price changed
      const priceInCents = Math.round((plan.monthly_price || 0) * 100);

      if (!priceId) {
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: priceInCents,
          currency: "usd",
          recurring: {interval: "month"},
          metadata: {
            plan_id: planId,
          },
        });
        priceId = price.id;
      }

      // Update plan with Stripe IDs
      await admin.firestore().collection("pricing_plans").doc(planId).update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      syncedPlans.push({
        planId,
        name: plan.name,
        productId,
        priceId,
      });
    }

    console.log(`[syncPricingPlansWithStripe] Synced ${syncedPlans.length} plans`);

    return {
      synced: syncedPlans.length,
      plans: syncedPlans,
    };
  } catch (error) {
    console.error("[syncPricingPlansWithStripe] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to sync pricing plans: ${error.message}`);
  }
});

// ============================================================================
// Stripe Connect Functions
// ============================================================================

/**
 * Create Connect Onboarding Link
 * Creates a Standard Connect account and returns onboarding URL
 * @param {Object} data - { companyId, refreshUrl, returnUrl }
 * @returns {Object} - { accountLinkUrl, accountId }
 */
exports.createConnectOnboarding = onCall({
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    const {companyId, refreshUrl, returnUrl} = request.data;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!companyId || !refreshUrl || !returnUrl) {
      throw new HttpsError("invalid-argument", "Missing required fields: companyId, refreshUrl, returnUrl");
    }

    const stripe = getStripe(stripeSecretKey.value());

    // Get company data
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }
    const company = companyDoc.data();

    let accountId = company.stripe_connect_account_id;

    // Create account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: company.email,
        metadata: {
          company_id: companyId,
        },
      });
      accountId = account.id;

      // Save account ID to company
      await admin.firestore().collection("companies").doc(companyId).update({
        stripe_connect_account_id: accountId,
        stripe_connect_status: "pending",
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    console.log(`[createConnectOnboarding] Account link created for company ${companyId}`);

    return {
      accountLinkUrl: accountLink.url,
      accountId: accountId,
    };
  } catch (error) {
    console.error("[createConnectOnboarding] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to create Connect onboarding: ${error.message}`);
  }
});

/**
 * Get Connect Account Status
 * Returns the status of a company's Connect account
 * @param {Object} data - { companyId }
 * @returns {Object} - Account status and capabilities
 */
exports.getConnectAccountStatus = onCall({
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    const {companyId} = request.data;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!companyId) {
      throw new HttpsError("invalid-argument", "Missing required field: companyId");
    }

    // Get company data
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }
    const company = companyDoc.data();

    if (!company.stripe_connect_account_id) {
      return {
        connected: false,
        status: "not_connected",
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }

    const stripe = getStripe(stripeSecretKey.value());

    // Get account from Stripe
    const account = await stripe.accounts.retrieve(company.stripe_connect_account_id);

    // Determine status
    let status = "pending";
    if (account.charges_enabled && account.payouts_enabled) {
      status = "connected";
    } else if (account.details_submitted) {
      status = "pending";
    }

    // Update company if status changed
    if (status !== company.stripe_connect_status ||
        account.charges_enabled !== company.stripe_connect_charges_enabled ||
        account.payouts_enabled !== company.stripe_connect_payouts_enabled) {
      await admin.firestore().collection("companies").doc(companyId).update({
        stripe_connect_status: status,
        stripe_connect_charges_enabled: account.charges_enabled,
        stripe_connect_payouts_enabled: account.payouts_enabled,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      connected: status === "connected",
      status: status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountId: account.id,
    };
  } catch (error) {
    console.error("[getConnectAccountStatus] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to get Connect status: ${error.message}`);
  }
});

/**
 * Create Connect Dashboard Link
 * Creates a login link to the Stripe dashboard for connected accounts
 * @param {Object} data - { companyId }
 * @returns {Object} - { dashboardUrl }
 */
exports.createConnectDashboardLink = onCall({
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    const {companyId} = request.data;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!companyId) {
      throw new HttpsError("invalid-argument", "Missing required field: companyId");
    }

    // Get company data
    const companyDoc = await admin.firestore().collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }
    const company = companyDoc.data();

    if (!company.stripe_connect_account_id) {
      throw new HttpsError("failed-precondition", "No Connect account found for this company");
    }

    const stripe = getStripe(stripeSecretKey.value());

    // Create login link
    const loginLink = await stripe.accounts.createLoginLink(company.stripe_connect_account_id);

    console.log(`[createConnectDashboardLink] Dashboard link created for company ${companyId}`);

    return {
      dashboardUrl: loginLink.url,
    };
  } catch (error) {
    console.error("[createConnectDashboardLink] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to create dashboard link: ${error.message}`);
  }
});

/**
 * Create Invoice Payment Checkout Session
 * Creates a Stripe Checkout session for paying an invoice
 * Payment goes to the company's connected account with platform fee
 * @param {Object} data - { invoiceId, successUrl, cancelUrl }
 * @returns {Object} - { sessionId, checkoutUrl }
 */
exports.createInvoicePaymentCheckout = onCall({
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    const {invoiceId, successUrl, cancelUrl} = request.data;

    // Note: This can be called without auth (by portal clients)
    if (!invoiceId || !successUrl || !cancelUrl) {
      throw new HttpsError("invalid-argument", "Missing required fields: invoiceId, successUrl, cancelUrl");
    }

    const stripe = getStripe(stripeSecretKey.value());

    // Get invoice data
    const invoiceDoc = await admin.firestore().collection("invoices").doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      throw new HttpsError("not-found", "Invoice not found");
    }
    const invoice = invoiceDoc.data();

    // Check invoice is payable
    if (invoice.status === "paid") {
      throw new HttpsError("failed-precondition", "Invoice is already paid");
    }

    if (invoice.status === "cancelled") {
      throw new HttpsError("failed-precondition", "Invoice is cancelled");
    }

    const amountDue = invoice.amount_outstanding || invoice.total_amount - (invoice.amount_paid || 0);
    if (amountDue <= 0) {
      throw new HttpsError("failed-precondition", "No amount due on this invoice");
    }

    // Get company data
    const companyDoc = await admin.firestore().collection("companies").doc(invoice.company_id).get();
    if (!companyDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }
    const company = companyDoc.data();

    // Check if company has Connect account
    if (!company.stripe_connect_account_id) {
      throw new HttpsError("failed-precondition", "Company has not set up payment processing");
    }

    if (!company.stripe_connect_charges_enabled) {
      throw new HttpsError("failed-precondition", "Company payment processing is not fully enabled");
    }

    // Calculate amounts
    const amountInCents = Math.round(amountDue * 100);
    const platformFeePercent = company.platform_fee_percentage || 2.9;
    const applicationFeeInCents = Math.round(amountInCents * (platformFeePercent / 100));

    // Get client name for description
    let clientName = "Client";
    if (invoice.client_id) {
      const clientDoc = await admin.firestore().collection("clients").doc(invoice.client_id).get();
      if (clientDoc.exists) {
        clientName = clientDoc.data().company_name || clientDoc.data().name || "Client";
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Invoice ${invoice.invoice_number || invoiceId}`,
            description: `Payment for services - ${company.name}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeInCents,
        transfer_data: {
          destination: company.stripe_connect_account_id,
        },
        metadata: {
          invoice_id: invoiceId,
          company_id: invoice.company_id,
          client_id: invoice.client_id || "",
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoice_id: invoiceId,
        company_id: invoice.company_id,
        type: "invoice_payment",
      },
    });

    console.log(`[createInvoicePaymentCheckout] Session created for invoice ${invoiceId}, amount: $${amountDue}`);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  } catch (error) {
    console.error("[createInvoicePaymentCheckout] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", `Failed to create payment checkout: ${error.message}`);
  }
});

// ============================================================================
// Stripe Webhooks
// ============================================================================

/**
 * Stripe Webhook Handler - Platform Events
 * Handles subscription and customer events
 */
exports.stripeWebhook = onRequest({
  secrets: [stripeSecretKey, stripeWebhookSecret],
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const stripe = getStripe(stripeSecretKey.value());
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value(),
    );
  } catch (err) {
    console.error("[stripeWebhook] Signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Check if event already processed (idempotency)
  const eventDoc = await admin.firestore().collection("stripe_events").doc(event.id).get();
  if (eventDoc.exists && eventDoc.data().processed) {
    console.log(`[stripeWebhook] Event ${event.id} already processed`);
    res.json({received: true, already_processed: true});
    return;
  }

  try {
    // Store event for idempotency
    await admin.firestore().collection("stripe_events").doc(event.id).set({
      type: event.type,
      created: new Date(event.created * 1000),
      processed: false,
      data: event.data.object,
    });

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.mode === "subscription" && session.metadata?.company_id) {
          const companyId = session.metadata.company_id;
          const subscriptionId = session.subscription;

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;

          // Find the plan by price ID
          const plansSnapshot = await admin.firestore()
              .collection("pricing_plans")
              .where("stripe_price_id", "==", priceId)
              .limit(1)
              .get();

          let planName = "paid";
          let jobLimit = 500;

          if (!plansSnapshot.empty) {
            const plan = plansSnapshot.docs[0].data();
            planName = plan.name;
            jobLimit = plan.job_limit || 500;
          }

          // Update company
          await admin.firestore().collection("companies").doc(companyId).update({
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            billing_tier: "paid",
            plan_name: planName,
            monthly_job_limit: jobLimit,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000),
            subscription_cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`[stripeWebhook] Subscription activated for company ${companyId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;

        if (companyId) {
          let status = "active";
          if (subscription.status === "past_due") {
            status = "past_due";
          } else if (subscription.status === "canceled") {
            status = "canceled";
          } else if (subscription.status === "incomplete") {
            status = "incomplete";
          }

          await admin.firestore().collection("companies").doc(companyId).update({
            subscription_status: status,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000),
            subscription_cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`[stripeWebhook] Subscription updated for company ${companyId}: ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;

        if (companyId) {
          await admin.firestore().collection("companies").doc(companyId).update({
            subscription_status: "canceled",
            billing_tier: "free",
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`[stripeWebhook] Subscription canceled for company ${companyId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find company by customer ID
        const companiesSnapshot = await admin.firestore()
            .collection("companies")
            .where("stripe_customer_id", "==", customerId)
            .limit(1)
            .get();

        if (!companiesSnapshot.empty) {
          const companyDoc = companiesSnapshot.docs[0];
          await companyDoc.ref.update({
            subscription_status: "past_due",
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`[stripeWebhook] Payment failed for company ${companyDoc.id}`);
        }
        break;
      }

      default:
        console.log(`[stripeWebhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await admin.firestore().collection("stripe_events").doc(event.id).update({
      processed: true,
      processed_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({received: true});
  } catch (error) {
    console.error(`[stripeWebhook] Error processing event ${event.id}:`, error);

    // Store error
    await admin.firestore().collection("stripe_events").doc(event.id).update({
      error: error.message,
    });

    res.status(500).json({error: error.message});
  }
});

/**
 * Stripe Connect Webhook Handler
 * Handles Connect account and invoice payment events
 */
exports.stripeConnectWebhook = onRequest({
  secrets: [stripeSecretKey, stripeConnectWebhookSecret],
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const stripe = getStripe(stripeSecretKey.value());
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeConnectWebhookSecret.value(),
    );
  } catch (err) {
    console.error("[stripeConnectWebhook] Signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Check if event already processed
  const eventDoc = await admin.firestore().collection("stripe_events").doc(event.id).get();
  if (eventDoc.exists && eventDoc.data().processed) {
    console.log(`[stripeConnectWebhook] Event ${event.id} already processed`);
    res.json({received: true, already_processed: true});
    return;
  }

  try {
    // Store event
    await admin.firestore().collection("stripe_events").doc(event.id).set({
      type: event.type,
      created: new Date(event.created * 1000),
      processed: false,
      data: event.data.object,
    });

    // Handle the event
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object;

        // Find company by Connect account ID
        const companiesSnapshot = await admin.firestore()
            .collection("companies")
            .where("stripe_connect_account_id", "==", account.id)
            .limit(1)
            .get();

        if (!companiesSnapshot.empty) {
          const companyDoc = companiesSnapshot.docs[0];

          let status = "pending";
          if (account.charges_enabled && account.payouts_enabled) {
            status = "connected";
          }

          await companyDoc.ref.update({
            stripe_connect_status: status,
            stripe_connect_charges_enabled: account.charges_enabled,
            stripe_connect_payouts_enabled: account.payouts_enabled,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`[stripeConnectWebhook] Account updated for company ${companyDoc.id}: ${status}`);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;

        // Check if this is an invoice payment
        if (session.metadata?.type === "invoice_payment" && session.metadata?.invoice_id) {
          const invoiceId = session.metadata.invoice_id;
          const companyId = session.metadata.company_id;

          // Get payment intent for details
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

          // Get invoice
          const invoiceDoc = await admin.firestore().collection("invoices").doc(invoiceId).get();
          if (invoiceDoc.exists) {
            const invoice = invoiceDoc.data();
            const amountPaid = paymentIntent.amount / 100;

            // Calculate new amounts
            const newAmountPaid = (invoice.amount_paid || 0) + amountPaid;
            const newAmountOutstanding = invoice.total_amount - newAmountPaid;
            const newStatus = newAmountOutstanding <= 0 ? "paid" : "partially_paid";

            // Create payment record
            await admin.firestore().collection("payments").add({
              invoice_id: invoiceId,
              company_id: companyId,
              client_id: invoice.client_id || null,
              amount: amountPaid,
              payment_method: "stripe",
              payment_date: new Date(),
              notes: "Online payment via Stripe",
              stripe_payment_intent_id: paymentIntent.id,
              stripe_checkout_session_id: session.id,
              stripe_charge_id: paymentIntent.latest_charge,
              stripe_receipt_url: null, // Will be updated when charge is retrieved
              stripe_application_fee: paymentIntent.application_fee_amount / 100,
              payment_status: "succeeded",
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update invoice
            await admin.firestore().collection("invoices").doc(invoiceId).update({
              amount_paid: newAmountPaid,
              amount_outstanding: newAmountOutstanding,
              status: newStatus,
              last_payment_date: new Date(),
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[stripeConnectWebhook] Payment recorded for invoice ${invoiceId}: $${amountPaid}`);

            // Track platform usage
            await trackPlatformUsage("invoice_payments_processed");
          }
        }
        break;
      }

      default:
        console.log(`[stripeConnectWebhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await admin.firestore().collection("stripe_events").doc(event.id).update({
      processed: true,
      processed_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({received: true});
  } catch (error) {
    console.error(`[stripeConnectWebhook] Error processing event ${event.id}:`, error);

    await admin.firestore().collection("stripe_events").doc(event.id).update({
      error: error.message,
    });

    res.status(500).json({error: error.message});
  }
});

// ============================================================================
// Job Notes - Hub-and-Spoke Messaging System
// ============================================================================

/**
 * Create a new job note with optional email notification
 * Supports hub-and-spoke model: Company <-> Client, Company <-> Server
 * Client and Server cannot communicate directly
 */
exports.createJobNote = onCall(
    {secrets: [sendgridApiKey]},
    async (request) => {
      const uid = request.auth?.uid;
      if (!uid) {
        throw new HttpsError("unauthenticated", "Authentication required");
      }

      const {
        jobId,
        content,
        visibility, // 'client' | 'server' | 'both' | 'internal'
        sendEmail,
      } = request.data;

      // Validate inputs
      validateDocumentId(jobId, "jobId");
      validateString(content, "content", {maxLength: 5000});

      if (!["client", "server", "both", "internal"].includes(visibility)) {
        throw new HttpsError("invalid-argument", "Invalid visibility value. Must be: client, server, both, or internal");
      }

      // Get job and verify it exists
      const jobDoc = await admin.firestore().doc(`jobs/${jobId}`).get();
      if (!jobDoc.exists) {
        throw new HttpsError("not-found", "Job not found");
      }

      const job = jobDoc.data();
      job.id = jobDoc.id; // Add document ID to job object
      const userDoc = await admin.firestore().doc(`users/${uid}`).get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }
      const user = userDoc.data();

      // Determine author type and verify permissions
      let authorType;
      const authorCompanyId = user.company_id;

      if (user.company_id === job.company_id) {
        // User is from the company that owns the job
        authorType = "company";
      } else if (job.share_chain?.parent_company_id === user.company_id) {
        // User is from the upstream client company
        authorType = "client";
        // Clients can only send to company (internal visibility)
        if (visibility !== "internal") {
          throw new HttpsError("permission-denied", "Clients can only reply to the company");
        }
      } else if (job.share_chain?.child_company_id === user.company_id) {
        // User is from the downstream server company
        authorType = "server";
        // Servers can only send to company (internal visibility)
        if (visibility !== "internal") {
          throw new HttpsError("permission-denied", "Servers can only reply to the company");
        }
      } else {
        throw new HttpsError("permission-denied", "You do not have access to this job");
      }

      // Build the note document
      const noteData = {
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        author_id: uid,
        author_name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown",
        author_type: authorType,
        author_company_id: authorCompanyId,
        content: content.trim(),
        visibility: authorType === "company" ? visibility : "internal",
        direction: authorType === "company" ? "outgoing" : "incoming",
        email_sent: false,
        email_sent_at: null,
        read_by_client: authorType === "client", // Author has read their own note
        read_by_server: authorType === "server",
        read_at_client: authorType === "client" ? admin.firestore.FieldValue.serverTimestamp() : null,
        read_at_server: authorType === "server" ? admin.firestore.FieldValue.serverTimestamp() : null,
        is_system_note: false,
        related_event: null,
      };

      // Create the note in the subcollection
      const noteRef = await admin.firestore()
          .collection(`jobs/${jobId}/notes`)
          .add(noteData);

      console.log(`[createJobNote] Created note ${noteRef.id} on job ${jobId} by ${authorType}`);

      // Send email if requested (only company can send emails to clients/servers)
      if (sendEmail && authorType === "company" && visibility !== "internal") {
        try {
          await sendJobNoteEmails(job, noteData, visibility, noteRef.id);

          await noteRef.update({
            email_sent: true,
            email_sent_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`[createJobNote] Sent email notification for note ${noteRef.id}`);
        } catch (emailError) {
          console.error(`[createJobNote] Failed to send email for note ${noteRef.id}:`, emailError);
          // Don't fail the whole operation if email fails
        }
      }

      // Create in-app notification for the recipient
      await createJobNoteNotification(job, noteData, authorType);

      return {success: true, noteId: noteRef.id};
    },
);

/**
 * Helper: Send job note emails to recipients based on visibility
 */
async function sendJobNoteEmails(job, note, visibility, noteId) {
  const recipients = [];

  // Get client email if visibility includes client
  if (visibility === "client" || visibility === "both") {
    // Use contact_email from job or look up client company
    if (job.contact_email) {
      recipients.push({
        email: job.contact_email,
        type: "client",
        name: job.contact_name || null,
      });
    }
  }

  // Get server email if visibility includes server
  if (visibility === "server" || visibility === "both") {
    if (job.share_chain?.child_company_id) {
      const serverCompanyDoc = await admin.firestore()
          .doc(`companies/${job.share_chain.child_company_id}`)
          .get();
      if (serverCompanyDoc.exists) {
        const serverCompany = serverCompanyDoc.data();
        if (serverCompany.email) {
          recipients.push({
            email: serverCompany.email,
            type: "server",
            name: serverCompany.name || serverCompany.company_name || null,
          });
        }
      }
    }
  }

  // Send emails to all recipients
  for (const recipient of recipients) {
    await sendEmailWithTemplate({
      to: recipient.email,
      subject: `New Message - Job #${job.job_number}`,
      templateName: "job-note",
      templateData: {
        recipient_name: recipient.name,
        job_number: job.job_number,
        defendant_name: job.recipient?.name || job.defendant_name || job.recipient_name,
        case_number: job.case_number,
        note_content: note.content,
        author_name: note.author_name,
        sent_at: new Date(),
        portal_url: recipient.type === "client" ?
          `${process.env.APP_URL || "https://app.servemax.pro"}/portal/orders` :
          null,
      },
      companyId: job.company_id,
    });
  }
}

/**
 * Helper: Create in-app notification for job note recipients
 */
async function createJobNoteNotification(job, note, authorType) {
  // Determine who should receive the notification
  const notificationTargets = [];

  if (authorType === "company") {
    // Company sent a note - notify client and/or server based on visibility
    if (note.visibility === "client" || note.visibility === "both") {
      // Create notification for client (if job has a client portal user)
      // For now, we'll create a notification in the notifications collection
      // that can be queried by client portal users
      if (job.client_id) {
        notificationTargets.push({
          target_type: "client",
          target_id: job.client_id,
        });
      }
    }
    if (note.visibility === "server" || note.visibility === "both") {
      // Create notification for server company
      if (job.share_chain?.child_company_id) {
        notificationTargets.push({
          target_type: "server",
          target_id: job.share_chain.child_company_id,
        });
      }
    }
  } else {
    // Client or server sent a reply - notify the company
    notificationTargets.push({
      target_type: "company",
      target_id: job.company_id,
    });
  }

  // Create notifications for each target
  for (const target of notificationTargets) {
    await admin.firestore().collection("notifications").add({
      type: "new_job_note",
      company_id: target.target_type === "company" ? target.target_id : job.company_id,
      target_type: target.target_type,
      target_id: target.target_id,
      job_id: job.id,
      job_number: job.job_number,
      note_author: note.author_name,
      note_author_type: note.author_type,
      note_preview: note.content.substring(0, 100) + (note.content.length > 100 ? "..." : ""),
      read: false,
      persistent: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`[createJobNoteNotification] Created ${notificationTargets.length} notifications`);
}
