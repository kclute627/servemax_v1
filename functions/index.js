const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {PDFDocument, rgb, StandardFonts} = require("pdf-lib");
const {Client} = require("@googlemaps/google-maps-services-js");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const Handlebars = require("handlebars");
const {format} = require("date-fns");

admin.initializeApp();

// Define the Google Maps API key as a secret
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");

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

        const client = new Client({});
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

        const client = new Client({});
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
}

// Register helpers once at startup
registerHandlebarsHelpers();

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
 * Inject signature image and date into rendered HTML for PDF generation
 * @param {string} html - Rendered HTML content
 * @param {object} signatureData - Signature data with signature_data, signed_date, position, size
 * @returns {string} - HTML with injected signature
 */
function injectSignatureIntoHTML(html, signatureData) {
  if (!signatureData || !signatureData.signature_data) {
    return html;
  }

  console.log("[injectSignatureIntoHTML] Injecting signature into PDF HTML");
  console.log("  Signature data present:", !!signatureData.signature_data);
  console.log("  Signed date:", signatureData.signed_date);
  console.log("  Position:", signatureData.position);
  console.log("  Size:", signatureData.size);

  // Format the signed date
  let formattedDate = "";
  if (signatureData.signed_date) {
    try {
      const dateObj = new Date(signatureData.signed_date);
      formattedDate = format(dateObj, "MM/dd/yyyy");
      console.log("  Formatted date:", formattedDate);
    } catch (err) {
      console.error("  Error formatting date:", err);
    }
  }

  // Get signature position and size (use defaults if not provided)
  const position = signatureData.position || {x: 0, y: 0};
  const size = signatureData.size || {width: 270, height: 52.5};

  // For AO 440 template: Find and replace the signature section
  // The signature line container has a specific structure we can match
  const signatureLinePattern = /(<div style="flex: 1; padding-right: 10px;">[\s\S]*?<div style="border-bottom: 1pt solid #000; width: 100%; height: 0pt;"><\/div>[\s\S]*?<\/div>)/;

  if (html.match(signatureLinePattern)) {
    console.log("  Found AO 440 signature line, injecting signature");

    // Create the signature container with the image
    const signatureContainer = `<div style="flex: 1; padding-right: 10px; position: relative;">
        <div style="border-bottom: 1pt solid #000; width: 100%; min-height: 60pt; position: relative; display: flex; align-items: center; justify-content: center;">
          <img src="${signatureData.signature_data}"
               style="position: absolute; left: ${position.x}px; top: ${position.y}px; width: ${size.width}pt; height: ${size.height}pt; object-fit: contain; object-position: left center;"
               alt="Signature" />
        </div>
      </div>`;

    html = html.replace(signatureLinePattern, signatureContainer);
    console.log("  Signature image injected successfully");
  } else {
    console.log("  AO 440 signature line pattern not found, signature not injected");
  }

  // Inject the date into the date field
  if (formattedDate) {
    const datePattern = /(<div style="border-bottom: 1pt solid #000; width: 120pt; height: 0pt; margin-bottom: 2pt;"><\/div>)/;
    if (html.match(datePattern)) {
      console.log("  Found date field, injecting date");
      const dateContainer = `<div style="border-bottom: 1pt solid #000; width: 120pt; height: 20pt; margin-bottom: 2pt; display: flex; align-items: flex-end; padding-bottom: 2pt;">
          <span style="font-size: 11pt;">${formattedDate}</span>
        </div>`;
      html = html.replace(datePattern, dateContainer);
      console.log("  Date injected successfully");
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
    // Launch Puppeteer with Cloud Functions optimized settings using @sparticuz/chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
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

    // Build PDF options
    const pdfOptions = {
      format: "letter",
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
 * Generate Affidavit PDF for a job
 * @param {Object} data - Affidavit data including template selection
 * @returns {Object} - { success: boolean, data: Buffer }
 */
exports.generateAffidavit = onCall(
    {
      timeoutSeconds: 540,
      memory: "1GiB",
    },
    async (request) => {
  try {
    const data = request.data;

    if (!data) {
      throw new HttpsError("invalid-argument", "Affidavit data is required");
    }

    console.log(`Generating affidavit for job with template: ${data.affidavit_template_id || 'general'}`);

    const db = admin.firestore();

    // Use template from request data if provided (to avoid Firestore lookup)
    let template;
    if (data.template_mode && (data.html_content || data.template_mode === 'simple')) {
      console.log('Using template data from request');
      template = {
        name: 'Template from Request',
        template_mode: data.template_mode,
        html_content: data.html_content,
        header_html: data.header_html,
        footer_html: data.footer_html,
        margin_top: data.margin_top,
        margin_bottom: data.margin_bottom,
        margin_left: data.margin_left,
        margin_right: data.margin_right,
        body: data.body, // For simple mode
        footer_text: data.footer_text, // For simple mode
        include_notary_default: data.include_notary_default || false,
        include_company_info_default: data.include_company_info_default || false,
      };
    } else {
      // Fallback: Fetch the selected template from Firestore
      const templateId = data.affidavit_template_id || 'general';
      try {
        const templateDoc = await db.collection('affidavit_templates').doc(templateId).get();
        if (templateDoc.exists) {
          template = templateDoc.data();
        } else {
          // Fallback to default template
          console.warn(`Template ${templateId} not found, using default`);
          template = {
            name: 'General Affidavit Template',
            template_mode: 'simple',
            body: 'I, {{server_name}}, being duly sworn, depose and say that I served the following documents...',
            footer_text: 'Subscribed and sworn before me this ___ day of ___, 20__.',
            include_notary_default: false,
            include_company_info_default: false,
          };
        }
      } catch (err) {
        console.error("Error fetching template:", err);
        // Use default template
        template = {
          name: 'General Affidavit Template',
          template_mode: 'simple',
          body: 'I, {{server_name}}, being duly sworn, depose and say that I served the following documents...',
          footer_text: 'Subscribed and sworn before me this ___ day of ___, 20__.',
          include_notary_default: false,
          include_company_info_default: false,
        };
      }
    }

    // Check if template is HTML mode
    const isHTMLTemplate = template.template_mode === 'html' && template.html_content;

    if (isHTMLTemplate) {
      // ========================================
      // HTML TEMPLATE MODE (with Puppeteer)
      // ========================================
      console.log("Using HTML template mode with Puppeteer");

      // Render the HTML template with data
      let renderedHTML = renderHTMLTemplate(template.html_content, data);

      // Inject signature if present
      if (data.placed_signature) {
        console.log("Signature data found, injecting into HTML before PDF generation");
        renderedHTML = injectSignatureIntoHTML(renderedHTML, data.placed_signature);
      } else {
        console.log("No signature data found, generating PDF without signature");
      }

      // Prepare PDF options (headers/footers if configured)
      const pdfOptions = {};

      // Check if template has header/footer configured
      if (template.header_html || template.footer_html) {
        pdfOptions.displayHeaderFooter = true;

        // Render header/footer templates with data (if provided)
        if (template.header_html) {
          pdfOptions.headerTemplate = renderHTMLTemplate(template.header_html, data);
        }
        if (template.footer_html) {
          pdfOptions.footerTemplate = renderHTMLTemplate(template.footer_html, data);
        }

        // Set margins for header/footer (use template settings or defaults)
        pdfOptions.marginTop = template.margin_top || "72pt";
        pdfOptions.marginBottom = template.margin_bottom || "72pt";
        pdfOptions.marginLeft = template.margin_left || "72pt";
        pdfOptions.marginRight = template.margin_right || "72pt";
      }

      // Generate PDF from HTML
      const pdfBytes = await generatePDFFromHTML(renderedHTML, pdfOptions);

      console.log(`HTML affidavit generated successfully, size: ${pdfBytes.byteLength} bytes`);

      return {
        success: true,
        data: Buffer.from(pdfBytes),
        message: "Affidavit generated successfully (HTML mode)",
      };
    }

    // ========================================
    // SIMPLE TEXT TEMPLATE MODE (with PDF-lib)
    // ========================================
    console.log("Using simple text template mode with PDF-lib");

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size: 8.5" x 11"
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPos = 750;
    const margin = 50;

    // Title
    page.drawText(data.document_title || 'AFFIDAVIT OF SERVICE', {
      x: margin,
      y: yPos,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    yPos -= 30;

    // Case information
    if (data.case_caption) {
      page.drawText(`Case: ${data.case_caption}`, {
        x: margin,
        y: yPos,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPos -= 15;
    }

    if (data.case_number) {
      page.drawText(`Case Number: ${data.case_number}`, {
        x: margin,
        y: yPos,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPos -= 15;
    }

    if (data.court_name) {
      page.drawText(`Court: ${data.court_name}`, {
        x: margin,
        y: yPos,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPos -= 30;
    }

    // Template body with variable substitution
    let affidavitBody = template.body || '';
    affidavitBody = affidavitBody
        .replace(/{{server_name}}/g, data.server_name || '')
        .replace(/{{service_date}}/g, data.service_date || '')
        .replace(/{{service_time}}/g, data.service_time || '')
        .replace(/{{case_number}}/g, data.case_number || '')
        .replace(/{{court_name}}/g, data.court_name || '')
        .replace(/{{recipient_name}}/g, data.recipient_name || '')
        .replace(/{{service_address}}/g, data.service_address || '')
        .replace(/{{person_served_name}}/g, data.person_served_name || '');

    // Draw body text
    const bodyLines = wrapText(affidavitBody, 80);
    bodyLines.forEach((line) => {
      page.drawText(line, {
        x: margin,
        y: yPos,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPos -= 15;
    });

    yPos -= 20;

    // Documents served section
    if (data.documents_served && data.documents_served.length > 0) {
      page.drawText('Documents Served:', {
        x: margin,
        y: yPos,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      yPos -= 15;

      data.documents_served.forEach((doc) => {
        page.drawText(`• ${doc.title || 'Document'}`, {
          x: margin + 20,
          y: yPos,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPos -= 15;
      });
      yPos -= 10;
    }

    // Company info section (if enabled)
    if (data.include_company_info && data.company_info) {
      page.drawText('Process Server Information:', {
        x: margin,
        y: yPos,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      yPos -= 15;

      const companyLines = data.company_info.split('\n');
      companyLines.forEach((line) => {
        page.drawText(line, {
          x: margin,
          y: yPos,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPos -= 14;
      });
      yPos -= 10;
    }

    // Notary block (if enabled)
    if (data.include_notary) {
      yPos -= 20;
      page.drawText(template.footer_text || 'Subscribed and sworn before me this ___ day of ___, 20__.', {
        x: margin,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPos -= 30;

      page.drawText('____________________________', {
        x: margin,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPos -= 15;
      page.drawText('Notary Public', {
        x: margin,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    console.log(`Simple affidavit generated successfully, size: ${pdfBytes.byteLength} bytes`);

    // Return PDF as buffer
    return {
      success: true,
      data: Buffer.from(pdfBytes),
      message: "Affidavit generated successfully (simple mode)",
    };
  } catch (error) {
    console.error("Error in generateAffidavit:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
        "internal",
        `Failed to generate affidavit: ${error.message}`,
    );
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
