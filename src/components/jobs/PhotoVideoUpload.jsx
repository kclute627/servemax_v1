import React, { useState, useCallback } from 'react';
import { UploadFile } from "@/api/integrations";
import { Document } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Video,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const MAX_FILES = 10;

export default function PhotoVideoUpload({ jobId, existingFiles = [], onUploadSuccess, onRemoveFile }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const isImage = (contentType) => contentType?.startsWith('image/');
  const isVideo = (contentType) => contentType?.startsWith('video/');

  const uploadFiles = useCallback(async (files) => {
    // Check file limit
    const totalFiles = existingFiles.length + files.length;
    if (totalFiles > MAX_FILES) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `You can only upload up to ${MAX_FILES} files. You have ${existingFiles.length} files and are trying to add ${files.length} more.`
      });
      return;
    }

    // Validate file types (only images and videos)
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not an image or video file.`
        });
      }
      return isValid;
    });

    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        // Upload file to Firebase Storage
        const { url } = await UploadFile(file);

        // Create a document record in Firestore
        const documentData = {
          job_id: jobId,
          title: file.name,
          file_url: url,
          file_size: file.size,
          content_type: file.type,
          document_category: 'photo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Save to Firestore and get the document with ID
        const savedDoc = await Document.create(documentData);

        return {
          ...documentData,
          id: savedDoc.id
        };
      });

      const uploadedDocs = await Promise.all(uploadPromises);

      toast({
        variant: "success",
        title: "Upload successful",
        description: `${uploadedDocs.length} file${uploadedDocs.length > 1 ? 's' : ''} uploaded successfully.`
      });

      onUploadSuccess(uploadedDocs);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload files. Please try again."
      });
    }

    setIsUploading(false);
  }, [jobId, existingFiles.length, onUploadSuccess, toast]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  }, [uploadFiles]);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
    e.target.value = null; // Reset file input
  }, [uploadFiles]);

  const handleRemove = async (fileId) => {
    onRemoveFile(fileId);
  };

  const filesRemaining = MAX_FILES - existingFiles.length;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : existingFiles.length >= MAX_FILES
            ? 'border-slate-200 bg-slate-50'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className={`w-10 h-10 mx-auto mb-4 ${existingFiles.length >= MAX_FILES ? 'text-slate-300' : 'text-slate-400'}`} />

        {existingFiles.length >= MAX_FILES ? (
          <>
            <p className="text-slate-500 font-medium mb-2">Maximum files reached</p>
            <p className="text-sm text-slate-400">Remove a file to upload more</p>
          </>
        ) : (
          <>
            <p className="text-slate-600 font-medium mb-2">
              Drag & drop photos or videos
            </p>
            <p className="text-sm text-slate-500 mb-3">
              {filesRemaining} {filesRemaining === 1 ? 'file' : 'files'} remaining (max {MAX_FILES})
            </p>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-video-upload"
              disabled={isUploading || existingFiles.length >= MAX_FILES}
            />
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={isUploading || existingFiles.length >= MAX_FILES}
            >
              <label htmlFor="photo-video-upload" className="cursor-pointer">
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Select Files'
                )}
              </label>
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails Grid */}
      {existingFiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-700">
              Uploaded Files ({existingFiles.length}/{MAX_FILES})
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-slate-300 transition-colors bg-slate-100"
              >
                {/* Thumbnail */}
                {isImage(file.content_type) ? (
                  <img
                    src={file.file_url}
                    alt={file.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : isVideo(file.content_type) ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <Video className="w-12 h-12 text-white opacity-80" />
                    <video
                      src={file.file_url}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                      muted
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200">
                    <ImageIcon className="w-12 h-12 text-slate-400" />
                  </div>
                )}

                {/* Overlay with remove button */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(file.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* File type indicator */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-60 rounded px-2 py-0.5">
                  {isVideo(file.content_type) ? (
                    <Video className="w-3 h-3 text-white" />
                  ) : (
                    <ImageIcon className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info message */}
      {existingFiles.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">
              Document your service attempt
            </p>
            <p className="text-xs text-blue-700">
              Upload photos or videos from the service attempt. These can be included in your affidavit and provide valuable evidence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
