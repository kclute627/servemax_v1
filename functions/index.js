const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {PDFDocument, rgb, StandardFonts} = require("pdf-lib");
const {Client} = require("@googlemaps/google-maps-services-js");
const QRCode = require("qrcode");

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

    // Fetch server name if assigned
    let serverName = "Unassigned";
    if (job.assigned_server_id && job.assigned_server_id !== "unassigned") {
      const serverDoc = await db.collection("users")
          .doc(job.assigned_server_id)
          .get();
      if (serverDoc.exists) {
        const server = serverDoc.data();
        serverName = server.full_name ||
          `${server.first_name || ""} ${server.last_name || ""}`.trim() ||
          "Unknown";
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
    // TOP SECTION - Header (Professional Format)
    // ========================================

    const leftX = 40;
    let yPos = height - 40;

    // LEFT SIDE - Company Info
    const companyName = company.name || "Company Name";
    page.drawText(companyName, {
      x: leftX,
      y: yPos,
      size: 18,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    // Company Address (multiline)
    const primaryAddress = company.addresses?.find((a) => a.primary) ||
      company.addresses?.[0];

    yPos -= 14;
    const address1 = primaryAddress?.address1 || company.address || "";
    if (address1) {
      page.drawText(address1, {
        x: leftX,
        y: yPos,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    yPos -= 12;
    const cityStateZip = primaryAddress ?
      `${primaryAddress.city || ""}, ${primaryAddress.state || ""} ${primaryAddress.postal_code || ""}`.trim() :
      `${company.city || ""}, ${company.state || ""} ${company.zip || ""}`.trim();
    if (cityStateZip !== ", ") {
      page.drawText(cityStateZip, {
        x: leftX,
        y: yPos,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    yPos -= 12;
    const companyPhone = company.phone || "";
    if (companyPhone) {
      page.drawText(`Phone ${companyPhone}`, {
        x: leftX,
        y: yPos,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    // RIGHT SIDE - Job Header Info (right-aligned)
    yPos = height - 40;
    const rightMargin = width - 40;

    // Job number and Due date
    const dueDate = job.due_date ?
      new Date(job.due_date.toDate ?
        job.due_date.toDate() : job.due_date).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }) : "";
    const jobHeader = `Job: ${job.job_number || ""} (${job.case_number || ""})${dueDate ? ` Due: ${dueDate}` : ""}`;
    const jobHeaderWidth = helveticaFont.widthOfTextAtSize(jobHeader, 9);
    page.drawText(jobHeader, {
      x: rightMargin - jobHeaderWidth,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Party to Serve
    yPos -= 14;
    const partyText = `Party to Serve: ${job.recipient?.name || ""}`;
    const partyWidth = helveticaFont.widthOfTextAtSize(partyText, 9);
    page.drawText(partyText, {
      x: rightMargin - partyWidth,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Server (remove fee)
    yPos -= 14;
    const serverText = `Server: ${serverName}`;
    const serverTextWidth = helveticaFont.widthOfTextAtSize(serverText, 9);
    page.drawText(serverText, {
      x: rightMargin - serverTextWidth,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // QR code (right side, 100x100)
    const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
    const qrSize = 100;
    page.drawImage(qrCodeImage, {
      x: width - qrSize - 40,
      y: height - 90 - qrSize,
      width: qrSize,
      height: qrSize,
    });

    // ========================================
    // MIDDLE SECTION - Professional Layout
    // ========================================

    yPos = height - 200;

    // PARTY TO SERVE - BOLD, CENTERED, LARGE
    const recipientName = job.recipient?.name || "Unknown Recipient";
    const recipientSize = 14;
    const recipientWidth = helveticaBold.widthOfTextAtSize(recipientName, recipientSize);
    const recipientX = (width - recipientWidth) / 2;
    page.drawText(recipientName, {
      x: recipientX,
      y: yPos,
      size: recipientSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    // SERVICE ADDRESSES Section
    yPos -= 30;
    page.drawText("SERVICE ADDRESSES:", {
      x: leftX,
      y: yPos,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 16;
    if (job.addresses && job.addresses.length > 0) {
      job.addresses.forEach((addr, index) => {
        const isPrimary = addr.primary || index === 0;
        const marker = isPrimary ? "\u2605 PRIMARY: " : "\u2022 ";
        const addressLine = `${addr.address1 || ""}${addr.address2 ? ", " + addr.address2 : ""}`;
        const cityLine = `${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`.trim();

        page.drawText(marker + addressLine, {
          x: leftX,
          y: yPos,
          size: 10,
          font: isPrimary ? helveticaBold : helveticaFont,
          color: rgb(0, 0, 0),
        });
        yPos -= 12;
        page.drawText("    " + cityLine, {
          x: leftX,
          y: yPos,
          size: 10,
          font: isPrimary ? helveticaBold : helveticaFont,
          color: rgb(0, 0, 0),
        });
        yPos -= 18;
      });
    } else {
      page.drawText("No service address provided", {
        x: leftX,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPos -= 18;
    }

    // SERVICE INSTRUCTIONS Section
    yPos -= 10;
    page.drawText("SERVICE INSTRUCTIONS:", {
      x: leftX,
      y: yPos,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 16;
    const instructions = job.service_instructions || "No special instructions provided";
    const instructionsLines = wrapText(instructions, 85);
    instructionsLines.forEach((line) => {
      if (yPos < 200) return; // Stop if running out of space
      page.drawText(line, {
        x: leftX,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPos -= 13;
    });

    // CASE DETAILS - Compact Table
    yPos -= 20;
    const tableLeft = leftX;
    const tableRight = width - 40;

    page.drawText("CASE DETAILS:", {
      x: tableLeft,
      y: yPos,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 16;
    // Case Number and Court
    page.drawText(`Case #: ${job.case_number || "N/A"}`, {
      x: tableLeft,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    const courtText = `Court: ${job.court_name || "N/A"}`;
    page.drawText(courtText, {
      x: tableLeft + 200,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 13;
    // Plaintiff and Defendant
    const plaintiffText = job.plaintiff || "N/A";
    const truncatedPlaintiff = plaintiffText.length > 22 ? plaintiffText.substring(0, 22) + "..." : plaintiffText;
    page.drawText(`Plaintiff: ${truncatedPlaintiff}`, {
      x: tableLeft,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    const defendantText = job.defendant || "N/A";
    const truncatedDefendant = defendantText.length > 22 ? defendantText.substring(0, 22) + "..." : defendantText;
    page.drawText(`Defendant: ${truncatedDefendant}`, {
      x: tableLeft + 200,
      y: yPos,
      size: 9,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 13;
    // Documents
    page.drawText("Documents: ", {
      x: tableLeft,
      y: yPos,
      size: 9,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    if (documents.length > 0) {
      const docList = documents.map((d) => d.name || "Unnamed").join("; ");
      const truncatedDocs = docList.length > 65 ? docList.substring(0, 65) + "..." : docList;
      page.drawText(truncatedDocs, {
        x: tableLeft + 65,
        y: yPos,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    } else {
      page.drawText("No documents uploaded yet", {
        x: tableLeft + 65,
        y: yPos,
        size: 9,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // ========================================
    // BOTTOM SECTION - Large Attempt Log Table
    // ========================================

    yPos = 470; // Start higher up for more rows
    const logTableTop = yPos;
    const logTableLeft = tableLeft;
    const logTableRight = tableRight;
    const dateTimeColWidth = 140;

    // Table header row
    page.drawText("Date & Time:", {
      x: logTableLeft + 2,
      y: yPos,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page.drawText("Description of Service / Recipient:", {
      x: logTableLeft + dateTimeColWidth,
      y: yPos,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    // Draw horizontal lines for 10-12 rows
    for (let i = 0; i <= 12; i++) {
      const lineY = logTableTop - 15 - (i * 30);
      page.drawLine({
        start: {x: logTableLeft, y: lineY},
        end: {x: logTableRight, y: lineY},
        thickness: i === 0 ? 1 : 0.5,
        color: rgb(0, 0, 0),
      });
    }

    // Vertical line separating columns
    page.drawLine({
      start: {x: logTableLeft + dateTimeColWidth, y: logTableTop - 15},
      end: {x: logTableLeft + dateTimeColWidth, y: logTableTop - 15 - (12 * 30)},
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    // Left border
    page.drawLine({
      start: {x: logTableLeft, y: logTableTop - 15},
      end: {x: logTableLeft, y: logTableTop - 15 - (12 * 30)},
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Right border
    page.drawLine({
      start: {x: logTableRight, y: logTableTop - 15},
      end: {x: logTableRight, y: logTableTop - 15 - (12 * 30)},
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // ========================================
    // PERSON DESCRIPTION FIELDS (Very Bottom)
    // ========================================

    const personFieldsY = 80;
    const fieldSpacing = 120;

    // Row 1
    page.drawText("Age: __________", {x: logTableLeft, y: personFieldsY, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});
    page.drawText("Gender: __________", {x: logTableLeft + fieldSpacing, y: personFieldsY, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});
    page.drawText("Ethnicity: __________", {x: logTableLeft + (fieldSpacing * 2), y: personFieldsY, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});
    page.drawText("Weight: __________", {x: logTableLeft + (fieldSpacing * 3) + 40, y: personFieldsY, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});

    // Row 2
    const personFieldsY2 = personFieldsY - 15;
    page.drawText("Height: __________", {x: logTableLeft, y: personFieldsY2, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});
    page.drawText("Hair: __________", {x: logTableLeft + fieldSpacing, y: personFieldsY2, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});
    page.drawText("Eyes: __________", {x: logTableLeft + (fieldSpacing * 2), y: personFieldsY2, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});
    page.drawText("Relationship: __________", {x: logTableLeft + (fieldSpacing * 3) + 40, y: personFieldsY2, size: 9, font: helveticaFont, color: rgb(0, 0, 0)});

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    console.log(`Field sheet PDF created, size: ${pdfBytes.byteLength} bytes`);

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
      file_url: publicUrl,
      document_category: "field_sheet",
      job_id: job_id,
      company_id: job.company_id,
      uploaded_by: request.auth?.uid || "system",
      file_type: "application/pdf",
      file_size: pdfBytes.byteLength,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("documents").add(documentData);

    console.log(`Document record created: ${docRef.id}`);

    return {
      success: true,
      url: publicUrl,
      document_id: docRef.id,
      message: "Field sheet generated successfully",
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
