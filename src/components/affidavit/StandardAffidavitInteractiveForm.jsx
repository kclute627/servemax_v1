// === StandardAffidavitInteractiveForm.jsx ===

import React, { useState, useEffect, useRef } from "react";
import { renderHTMLTemplate } from "@/utils/templateEngine";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { PenTool, X, Check } from "lucide-react";

/**
 * Pagination - handles different page widths
 * Preserves <style> tags for CSS class-based templates
 * Supports multi-page templates with multiple .page divs
 */
const paginateContent = (htmlContent, pageWidthPt = "612pt") => {
  if (!htmlContent) return [];

  try {
    // Convert pt to px (96dpi = 1.33 px per pt)
    const widthPt = parseFloat(pageWidthPt);
    const widthPx = Math.round(widthPt * 1.33);

    // Extract and preserve <style> tags
    const styleTagMatch = htmlContent.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
    const styleTag = styleTagMatch ? styleTagMatch.join('\n') : '';

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.visibility = "hidden";
    container.style.width = `${widthPx}px`;
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Check if template has multiple .page divs (pre-defined pages like competitor)
    const pageElements = container.querySelectorAll('.page');
    if (pageElements.length > 1) {
      // Template already defines multiple pages - return each page as-is
      const pages = [];
      const parentWrapper = pageElements[0].parentElement;
      const parentClass = parentWrapper && parentWrapper !== container ? parentWrapper.className : '';

      pageElements.forEach((pageEl) => {
        let pageHTML = pageEl.outerHTML;
        if (parentClass) {
          pageHTML = `<div class="${parentClass}">${pageHTML}</div>`;
        }
        pages.push(styleTag + pageHTML);
      });

      document.body.removeChild(container);
      return pages;
    }

    // Standard letter page height: 792pt = 1056px at 96dpi
    const PAGE_HEIGHT = 1056;
    // Account for padding (0.5in = 36pt = 48px on top and bottom)
    const USABLE_HEIGHT = PAGE_HEIGHT - 96; // Subtract padding

    const pages = [];
    let currentPage = document.createElement("div");
    let currentHeight = 0;

    // Look for container with page width or .page class
    const mainContainer =
      container.querySelector('.page') ||
      container.querySelector('[style*="612pt"]') ||
      container.querySelector('[style*="7.5in"]') ||
      container.firstElementChild;

    if (!mainContainer) {
      document.body.removeChild(container);
      return [htmlContent];
    }

    // Get parent wrapper classes (e.g., .sm_doc)
    const parentWrapper = mainContainer.parentElement;
    const parentClass = parentWrapper && parentWrapper !== container ? parentWrapper.className : '';
    const pageClass = mainContainer.className || '';

    const children = Array.from(mainContainer.children);
    const containerStyle = mainContainer.getAttribute("style") || "";

    children.forEach((child) => {
      // Create a measurement container that includes the styles
      const measureContainer = document.createElement("div");
      measureContainer.style.position = "absolute";
      measureContainer.style.left = "-9999px";
      measureContainer.style.width = `${widthPx}px`;
      measureContainer.innerHTML = styleTag; // Include styles for proper measurement

      // Recreate the structure for accurate measurement
      const measureWrapper = document.createElement("div");
      if (parentClass) measureWrapper.className = parentClass;
      const measurePage = document.createElement("div");
      if (pageClass) measurePage.className = pageClass;
      measurePage.style.cssText = containerStyle;
      measurePage.appendChild(child.cloneNode(true));
      measureWrapper.appendChild(measurePage);
      measureContainer.appendChild(measureWrapper);

      document.body.appendChild(measureContainer);
      const elementHeight = measurePage.firstElementChild ? measurePage.firstElementChild.offsetHeight : 0;
      document.body.removeChild(measureContainer);

      const computed = window.getComputedStyle(child);
      const keepTogether =
        computed.pageBreakInside === "avoid" ||
        computed.breakInside === "avoid" ||
        child.style.pageBreakInside === "avoid" ||
        child.style.breakInside === "avoid";

      if (keepTogether && currentHeight + elementHeight > USABLE_HEIGHT && currentHeight > 0) {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("style", containerStyle);
        if (pageClass) wrapper.className = pageClass;
        wrapper.innerHTML = currentPage.innerHTML;

        // Wrap with parent class and include style tag
        let pageHTML = wrapper.outerHTML;
        if (parentClass) {
          pageHTML = `<div class="${parentClass}">${pageHTML}</div>`;
        }
        pages.push(styleTag + pageHTML);

        currentPage = document.createElement("div");
        currentHeight = 0;
      }

      currentPage.appendChild(child.cloneNode(true));
      currentHeight += elementHeight;

      if (currentHeight >= USABLE_HEIGHT && !keepTogether) {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("style", containerStyle);
        if (pageClass) wrapper.className = pageClass;
        wrapper.innerHTML = currentPage.innerHTML;

        // Wrap with parent class and include style tag
        let pageHTML = wrapper.outerHTML;
        if (parentClass) {
          pageHTML = `<div class="${parentClass}">${pageHTML}</div>`;
        }
        pages.push(styleTag + pageHTML);

        currentPage = document.createElement("div");
        currentHeight = 0;
      }
    });

    if (currentPage.children.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("style", containerStyle);
      if (pageClass) wrapper.className = pageClass;
      wrapper.innerHTML = currentPage.innerHTML;

      // Wrap with parent class and include style tag
      let pageHTML = wrapper.outerHTML;
      if (parentClass) {
        pageHTML = `<div class="${parentClass}">${pageHTML}</div>`;
      }
      pages.push(styleTag + pageHTML);
    }

    document.body.removeChild(container);
    return pages.length > 0 ? pages : [htmlContent];
  } catch (err) {
    console.error("Pagination error:", err);
    return [htmlContent];
  }
};

/**
 * Extract page width from template HTML
 * Looks for .page class or inline style with width definitions
 */
const extractPageWidth = (htmlContent) => {
  if (!htmlContent) return "612pt"; // Default US Letter width

  // Check for .page class width in style tag
  const styleMatch = htmlContent.match(/\.page\s*\{[^}]*width:\s*([^;]+)/i);
  if (styleMatch) {
    const width = styleMatch[1].trim();
    // Convert common units to pt for consistency
    if (width.includes("in")) {
      const inches = parseFloat(width);
      return `${inches * 72}pt`; // 72pt per inch
    }
    return width;
  }

  // Check for inline style width on container
  const inlineMatch = htmlContent.match(/style="[^"]*width:\s*([^;\"]+)/i);
  if (inlineMatch) {
    return inlineMatch[1].trim();
  }

  return "612pt"; // Default
};

/**
 * MAIN COMPONENT - Simplified one-click signature
 */
export default function StandardAffidavitInteractiveForm({
  affidavitData,
  template,
  isEditing,
  onDataChange,
}) {
  const contentRef = useRef(null);
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [user, setUser] = useState(null);
  const [signButtonPosition, setSignButtonPosition] = useState(null);

  useEffect(() => {
    User.me()
      .then(setUser)
      .catch(() => {});
  }, []);

  // Render HTML with signature data if present
  const html = affidavitData?.html_content_edited
    ? affidavitData.html_content_edited
    : template?.html_content
    ? renderHTMLTemplate(template.html_content, affidavitData)
    : "";

  // Detect page width from template HTML
  const pageWidth = extractPageWidth(template?.html_content || html);

  useEffect(() => {
    if (!isEditing && html) {
      setPages(paginateContent(html, pageWidth));
    }
  }, [html, isEditing, pageWidth]);

  // Find the signature line position after pages render
  useEffect(() => {
    if (!containerRef.current || pages.length === 0) return;

    // Use requestAnimationFrame to ensure DOM is painted before measuring
    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      // Look for signature line - multiple selectors for different template types:
      // 1. Inline style with border-bottom (standard template)
      // 2. CSS class .cell_underline with .digital_signature_container (CSS test templates)
      // 3. CSS class .signature_cell (CSS test templates)
      // 4. CSS class .signature_line (standard_test template)
      let signatureLines = containerRef.current.querySelectorAll(
        'div[style*="border-bottom"][style*="position: relative"]'
      );

      // If not found, try CSS test template selectors
      if (signatureLines.length === 0) {
        signatureLines = containerRef.current.querySelectorAll(
          '.digital_signature_container, .signature_cell, .signature_line, td.cell_underline.align_bottom'
        );
      }

      if (signatureLines.length > 0) {
        // Use the last signature line (usually the server's signature)
        const lastSignatureLine = signatureLines[signatureLines.length - 1];
        const containerRect = containerRef.current.getBoundingClientRect();
        const lineRect = lastSignatureLine.getBoundingClientRect();

        setSignButtonPosition({
          top: lineRect.top - containerRect.top + lineRect.height / 2,
          left: lineRect.left - containerRect.left + lineRect.width / 2,
        });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [pages]);

  // Simple one-click sign handler
  const handleSign = () => {
    if (!user?.e_signature?.signature_data) {
      alert("No signature found. Please create one in Settings.");
      return;
    }

    onDataChange("placed_signature", {
      signature_data: user.e_signature.signature_data,
      signature_type: user.e_signature.signature_type,
      signature_color: user.e_signature.signature_color,
      signed_date: new Date().toISOString(),
      signer_name:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.email,
      confirmed: true,
    });
  };

  // Remove signature handler
  const handleRemoveSignature = () => {
    onDataChange("placed_signature", null);
  };

  if (isEditing) {
    return (
      <div
        contentEditable
        ref={contentRef}
        suppressContentEditableWarning
        onBlur={() =>
          onDataChange("html_content_edited", contentRef.current.innerHTML)
        }
        style={{
          width: pageWidth,
          minHeight: "792pt",
          background: "#fff",
          outline: "2px solid #3B82F6",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const hasSig = affidavitData?.placed_signature?.signature_data;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {pages.map((pageHTML, i) => (
        <React.Fragment key={i}>
          {/* Page separator (shown between pages, not before first page) */}
          {i > 0 && (
            <div
              style={{
                height: "20px",
                background: "linear-gradient(to bottom, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
                borderTop: "2px dashed #9ca3af",
                borderBottom: "2px dashed #9ca3af",
                margin: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{
                fontSize: "10px",
                color: "#6b7280",
                background: "#f3f4f6",
                padding: "2px 8px",
                borderRadius: "4px"
              }}>
                Page {i + 1}
              </span>
            </div>
          )}
          <div
            style={{
              width: pageWidth,
              minHeight: "792pt",
              background: "white",
              position: "relative",
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
          </div>
        </React.Fragment>
      ))}

      {/* Sign button positioned near signature line */}
      {!hasSig && signButtonPosition && user?.e_signature?.signature_data && (
        <div
          style={{
            position: "absolute",
            top: `${signButtonPosition.top}px`,
            left: `${signButtonPosition.left}px`,
            transform: "translate(-50%, -50%)",
            zIndex: 20,
          }}
        >
          <Button
            onClick={handleSign}
            className="shadow-lg"
            style={{
              background: "#3B82F6",
              color: "white",
            }}
          >
            <PenTool className="w-4 h-4 mr-2" />
            Sign Here
          </Button>
        </div>
      )}

      {/* Signed status and remove button */}
      {hasSig && signButtonPosition && (
        <div
          style={{
            position: "absolute",
            top: `${signButtonPosition.top + 40}px`,
            left: `${signButtonPosition.left}px`,
            transform: "translateX(-50%)",
            zIndex: 20,
          }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveSignature}
            className="text-red-600 hover:text-red-700 bg-white shadow-sm"
          >
            <X className="w-3 h-3 mr-1" />
            Remove Signature
          </Button>
        </div>
      )}

      {/* No signature message */}
      {!user?.e_signature?.signature_data && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #e5e7eb",
            background: "#fef3c7",
            textAlign: "center",
          }}
        >
          <p className="text-amber-700 text-sm">
            No signature found. Please create one in Settings to sign this document.
          </p>
        </div>
      )}
    </div>
  );
}
