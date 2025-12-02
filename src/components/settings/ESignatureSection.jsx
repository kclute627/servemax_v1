
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User } from '@/api/entities';
import { Trash2, Save, PenTool, Type, Loader2, CheckCircle } from 'lucide-react';

export default function ESignatureSection({ user, onUserUpdate }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState('drawn');
  const [signatureColor, setSignatureColor] = useState('black');
  const [textStyle, setTextStyle] = useState('script');
  const [textSignature, setTextSignature] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (user?.e_signature?.signature_data) {
      setHasSignature(true);
      setSignatureType(user.e_signature.signature_type || 'drawn');
      setSignatureColor(user.e_signature.signature_color || 'black');
      setTextStyle(user.e_signature.text_style || 'script');
    }
  }, [user]);

  useEffect(() => {
    if (user?.full_name) {
      setTextSignature(user.full_name);
    }
  }, [user?.full_name]);

  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getTextStyleClass = (style) => {
    const styles = {
      script: 'font-family: "Brush Script MT", cursive; font-size: 32px;',
      cursive: 'font-family: "Lucida Handwriting", cursive; font-size: 28px;',
      elegant: 'font-family: "Edwardian Script ITC", cursive; font-size: 36px;',
      formal: 'font-family: "Times New Roman", serif; font-size: 24px; font-style: italic;'
    };
    return styles[style] || styles.script;
  };

  const generateTextSignatureData = () => {
    if (!textSignature.trim()) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    // Make background transparent instead of white
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = signatureColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Set font based on style
    const fontSizes = { script: 32, cursive: 28, elegant: 36, formal: 24 };
    const fontFamilies = {
      script: 'Brush Script MT, cursive',
      cursive: 'Lucida Handwriting, cursive',
      elegant: 'Edwardian Script ITC, cursive',
      formal: 'Times New Roman, serif'
    };

    const isItalic = textStyle === 'formal' ? 'italic ' : '';
    ctx.font = `${isItalic}${fontSizes[textStyle]}px ${fontFamilies[textStyle]}`;
    ctx.fillText(textSignature, canvas.width / 2, canvas.height / 2);
    
    return canvas.toDataURL('image/png');
  };

  const saveSignature = async () => {
    setIsSaving(true);
    try {
      let signatureData;
      
      if (signatureType === 'drawn') {
        if (!canvasRef.current) {
          alert('Please draw your signature first.');
          setIsSaving(false);
          return;
        }
        signatureData = canvasRef.current.toDataURL();
      } else {
        signatureData = generateTextSignatureData();
        if (!signatureData) {
          alert('Please enter your signature text.');
          setIsSaving(false);
          return;
        }
      }

      const signatureSettings = {
        signature_data: signatureData,
        signature_type: signatureType,
        signature_color: signatureColor,
        text_style: signatureType === 'text' ? textStyle : null,
        created_date: new Date().toISOString()
      };

      await User.updateMyUserData({ e_signature: signatureSettings });
      setHasSignature(true);
      if (onUserUpdate) onUserUpdate();
      
      // Show success message for 4 seconds
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature.');
    }
    setIsSaving(false);
  };

  const deleteSignature = async () => {
    if (!confirm('Are you sure you want to delete your saved signature?')) return;
    
    setIsSaving(true);
    try {
      await User.updateMyUserData({ e_signature: null });
      setHasSignature(false);
      clearCanvas();
      if (onUserUpdate) onUserUpdate();
      alert('Signature deleted successfully!');
    } catch (error) {
      console.error('Error deleting signature:', error);
      alert('Failed to delete signature.');
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          E-Signature
        </CardTitle>
        <CardDescription>
          Create and save your digital signature for affidavits and other documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">Signature saved successfully!</p>
            </div>
          </div>
        )}

        {hasSignature && !showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">Signature Saved</p>
                <p className="text-sm text-green-600">
                  You have a saved {user?.e_signature?.signature_type} signature in {user?.e_signature?.signature_color}.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={deleteSignature} disabled={isSaving} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Signature Color</Label>
            <Select
              value={signatureColor}
              onChange={(e) => setSignatureColor(e.target.value)}
              className="w-48"
            >
              <SelectItem value="black">Black</SelectItem>
              <SelectItem value="#1a1a2e">Dark Black</SelectItem>
              <SelectItem value="#0066cc">Blue</SelectItem>
              <SelectItem value="#003366">Navy Blue</SelectItem>
              <SelectItem value="#1e3a5f">Dark Blue</SelectItem>
              <SelectItem value="#000080">Midnight Blue</SelectItem>
              <SelectItem value="#8b0000">Dark Red</SelectItem>
              <SelectItem value="#660000">Burgundy</SelectItem>
            </Select>
          </div>

          <Tabs value={signatureType} onValueChange={setSignatureType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="drawn" className="gap-2">
                <PenTool className="w-4 h-4" />
                Draw Signature
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <Type className="w-4 h-4" />
                Text Signature
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drawn" className="space-y-4">
              <div>
                <Label>Draw your signature below:</Label>
                <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    className="border border-slate-200 rounded cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ touchAction: 'none' }}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div>
                <Label htmlFor="signature-text">Signature Text</Label>
                <Input
                  id="signature-text"
                  value={textSignature}
                  onChange={(e) => setTextSignature(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Text Style</Label>
                <Select
                  value={textStyle}
                  onChange={(e) => setTextStyle(e.target.value)}
                  className="w-48"
                >
                  <SelectItem value="script">Script</SelectItem>
                  <SelectItem value="cursive">Cursive</SelectItem>
                  <SelectItem value="elegant">Elegant</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </Select>
              </div>

              <div>
                <Label>Preview:</Label>
                <div className="mt-2 p-4 border border-slate-200 rounded-lg bg-white h-20 flex items-center justify-center">
                  <span 
                    style={{ 
                      color: signatureColor,
                      ...getTextStyleClass(textStyle).split(';').reduce((acc, style) => {
                        const [key, value] = style.split(':').map(s => s.trim());
                        if (key && value) acc[key.replace(/-([a-z])/g, g => g[1].toUpperCase())] = value;
                        return acc;
                      }, {})
                    }}
                  >
                    {textSignature || 'Your Name Here'}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSignature} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Signature'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
