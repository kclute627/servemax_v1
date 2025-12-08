import { FirebaseFunctions } from '../firebase';

// Export Firebase functions to maintain compatibility with existing code
export const googlePlaces = FirebaseFunctions.googlePlaces;

export const googlePlaceDetails = FirebaseFunctions.googlePlaceDetails;

export const updateSharedJobStatus = FirebaseFunctions.updateSharedJobStatus;

export const generateFieldSheet = FirebaseFunctions.generateFieldSheet;

export const generateAffidavit = FirebaseFunctions.generateAffidavit;

export const findDirectoryCompanies = FirebaseFunctions.findDirectoryCompanies;

export const mergePDFs = FirebaseFunctions.mergePDFs;

export const extractDocumentAI = FirebaseFunctions.extractDocumentAI;

export const extractDocumentClaudeVision = FirebaseFunctions.extractDocumentClaudeVision;

export const extractDocumentClaudeHaiku = FirebaseFunctions.extractDocumentClaudeHaiku;

export const findCourtAddressWithAI = FirebaseFunctions.findCourtAddressWithAI;

export const signExternalPDF = FirebaseFunctions.signExternalPDF;

export const sendAttemptNotification = FirebaseFunctions.sendAttemptNotification;
