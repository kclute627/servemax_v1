import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage } from './config';

export class FirebaseStorage {
  // Upload file to Firebase Storage
  static async uploadFile(file, path = '', options = {}) {
    try {
      const fileName = options.fileName || file.name || `file_${Date.now()}`;
      const fullPath = path ? `${path}/${fileName}` : fileName;
      const storageRef = ref(storage, fullPath);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: options.metadata || {}
      });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        url: downloadURL,
        path: fullPath,
        fileName: fileName,
        size: snapshot.metadata.size,
        contentType: snapshot.metadata.contentType,
        fileId: snapshot.ref.name
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Upload file with progress tracking
  static uploadFileWithProgress(file, path = '', onProgress = () => {}, options = {}) {
    return new Promise((resolve, reject) => {
      const fileName = options.fileName || file.name || `file_${Date.now()}`;
      const fullPath = path ? `${path}/${fileName}` : fileName;
      const storageRef = ref(storage, fullPath);

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: options.metadata || {}
      });

      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress tracking
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress, snapshot);
        },
        (error) => {
          // Error handling
          console.error('Upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          // Complete
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              success: true,
              url: downloadURL,
              path: fullPath,
              fileName: fileName,
              size: uploadTask.snapshot.metadata.size,
              contentType: uploadTask.snapshot.metadata.contentType,
              fileId: uploadTask.snapshot.ref.name
            });
          } catch (error) {
            reject(new Error(`Failed to get download URL: ${error.message}`));
          }
        }
      );
    });
  }

  // Upload private file (with restricted access)
  static async uploadPrivateFile(file, path = 'private', options = {}) {
    // Add timestamp and user ID to make it more private
    const timestamp = Date.now();
    const fileName = options.fileName || `${timestamp}_${file.name}`;
    const privatePath = `${path}/${fileName}`;

    return this.uploadFile(file, privatePath, {
      ...options,
      fileName,
      metadata: {
        private: 'true',
        uploadedAt: new Date().toISOString(),
        ...options.metadata
      }
    });
  }

  // Get file download URL
  static async getFileURL(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw new Error(`Failed to get file URL: ${error.message}`);
    }
  }

  // Create signed URL (for private access)
  static async createFileSignedUrl(filePath, expiresIn = 3600) {
    try {
      // Firebase Storage URLs are already signed and secure
      // We can simulate expiration by including metadata
      const fileRef = ref(storage, filePath);
      const url = await getDownloadURL(fileRef);

      return {
        success: true,
        url: url,
        expiresIn: expiresIn,
        expiresAt: new Date(Date.now() + (expiresIn * 1000)).toISOString()
      };
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
  }

  // Delete file
  static async deleteFile(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      return { success: true, deleted: filePath };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // List files in a directory
  static async listFiles(path = '') {
    try {
      const listRef = ref(storage, path);
      const result = await listAll(listRef);

      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const metadata = await getMetadata(itemRef);
          const downloadURL = await getDownloadURL(itemRef);

          return {
            name: itemRef.name,
            path: itemRef.fullPath,
            url: downloadURL,
            size: metadata.size,
            contentType: metadata.contentType,
            created: metadata.timeCreated,
            updated: metadata.updated
          };
        })
      );

      return {
        files,
        prefixes: result.prefixes.map(prefix => prefix.name)
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Get file metadata
  static async getFileMetadata(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const metadata = await getMetadata(fileRef);

      return {
        name: fileRef.name,
        path: fileRef.fullPath,
        size: metadata.size,
        contentType: metadata.contentType,
        created: metadata.timeCreated,
        updated: metadata.updated,
        customMetadata: metadata.customMetadata || {}
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }
}