import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PenTool, Loader2 } from 'lucide-react';

export default function SignatureButton({ user, onSignaturePlace, className = '', isEditing = false }) {
  const [isPlacing, setIsPlacing] = useState(false);

  const handleSignClick = async () => {
    if (!user?.e_signature?.signature_data) {
      alert('No signature found. Please create a signature in Settings first.');
      return;
    }

    setIsPlacing(true);
    
    // Place the signature with current date
    const signatureData = {
      signature_data: user.e_signature.signature_data,
      signature_type: user.e_signature.signature_type,
      signature_color: user.e_signature.signature_color,
      signed_date: new Date().toISOString(),
      signer_name: user.full_name
    };

    onSignaturePlace(signatureData);
    setIsPlacing(false);
  };

  // Don't show button if no signature is saved OR if in editing mode
  if (!user?.e_signature?.signature_data || isEditing) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignClick}
      disabled={isPlacing}
      className={`gap-2 ${className}`}
    >
      {isPlacing ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <PenTool className="w-3 h-3" />
      )}
      {isPlacing ? 'Signing...' : 'Sign'}
    </Button>
  );
}