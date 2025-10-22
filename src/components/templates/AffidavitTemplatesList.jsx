import React from "react";
import { useNavigate } from "react-router-dom";
import AffidavitTemplatesPanel from "../settings/AffidavitTemplatesPanel";

// Reuse the existing affidavit templates panel from settings
export default function AffidavitTemplatesList() {
  return <AffidavitTemplatesPanel />;
}
