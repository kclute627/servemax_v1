import { FirebaseFunctions, FirebaseStorage } from '../firebase';

// Core integrations using Firebase Functions and Storage
export const Core = {
  InvokeLLM: FirebaseFunctions.invokeLLM.bind(FirebaseFunctions),
  SendEmail: FirebaseFunctions.sendEmail.bind(FirebaseFunctions),
  UploadFile: FirebaseStorage.uploadFile.bind(FirebaseStorage),
  GenerateImage: FirebaseFunctions.generateImage.bind(FirebaseFunctions),
  ExtractDataFromUploadedFile: FirebaseFunctions.extractDataFromUploadedFile.bind(FirebaseFunctions),
  CreateFileSignedUrl: FirebaseStorage.createFileSignedUrl.bind(FirebaseStorage),
  UploadPrivateFile: FirebaseStorage.uploadPrivateFile.bind(FirebaseStorage)
};

// Export individual functions for compatibility
export const InvokeLLM = Core.InvokeLLM;

export const SendEmail = Core.SendEmail;

export const UploadFile = Core.UploadFile;

export const GenerateImage = Core.GenerateImage;

export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;

export const CreateFileSignedUrl = Core.CreateFileSignedUrl;

export const UploadPrivateFile = Core.UploadPrivateFile;






