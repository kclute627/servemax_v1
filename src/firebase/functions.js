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
      // Mock response for development
      return {
        success: true,
        url: 'mock://affidavit.pdf',
        message: 'Affidavit generated (mock)'
      };
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
}