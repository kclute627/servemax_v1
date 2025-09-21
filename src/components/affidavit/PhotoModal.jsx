import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Camera, Image, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export default function PhotoModal({ open, onOpenChange, attempts, selectedPhotos, onPhotosChange }) {
  const allPhotos = attempts.flatMap(attempt => {
    if (!attempt.uploaded_files || !Array.isArray(attempt.uploaded_files)) return [];
    
    return attempt.uploaded_files
      .filter(file => file.content_type?.startsWith('image/'))
      .map(file => ({
        ...file,
        attemptId: attempt.id,
        attemptDate: attempt.attempt_date,
        serverName: attempt.server_name_manual || 'Server',
        attemptStatus: attempt.status
      }));
  });

  const handlePhotoToggle = (photo, isChecked) => {
    if (isChecked) {
      onPhotosChange([...selectedPhotos, photo]);
    } else {
      onPhotosChange(selectedPhotos.filter(p => p.file_url !== photo.file_url));
    }
  };

  const handleSelectAll = () => onPhotosChange(allPhotos);
  const handleDeselectAll = () => onPhotosChange([]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Attach Photos to Affidavit
          </DialogTitle>
          <DialogDescription>
            Select which photos to include. Each selected photo will be added as a separate page after the main affidavit document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-sm font-medium">
            {selectedPhotos.length} of {allPhotos.length} photos selected.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>Deselect All</Button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
          {allPhotos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allPhotos.map((photo) => {
                const isSelected = selectedPhotos.some(p => p.file_url === photo.file_url);
                return (
                  <div
                    key={photo.file_url}
                    className={`rounded-lg border p-3 transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : 'hover:border-slate-300'}`}
                    onClick={() => handlePhotoToggle(photo, !isSelected)}
                  >
                    <div className="flex items-start gap-3">
                       <Checkbox checked={isSelected} className="mt-1 pointer-events-none" />
                       <img src={photo.file_url} alt={photo.name || 'Attempt photo'} className="w-16 h-16 object-cover rounded-md border" />
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-medium truncate">{photo.name || 'Untitled Photo'}</p>
                         <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                           <Calendar className="w-3 h-3" />
                           {photo.attemptDate ? format(new Date(photo.attemptDate), 'PPp') : 'N/A'}
                         </p>
                         <Badge variant="outline" className="mt-1">{photo.attemptStatus}</Badge>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-10">No photos available from any attempts for this job.</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}