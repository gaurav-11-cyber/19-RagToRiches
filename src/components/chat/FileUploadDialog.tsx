import { useState, useRef } from 'react';
import { Upload, FileText, Image, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FileUploadDialog = ({ open, onOpenChange, onUploadComplete }: FileUploadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const resetState = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file type. Please upload PDF, TXT, PNG, JPG, or WEBP files.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploadStatus('uploading');
    setUploadProgress(10);

    try {
      // Upload to storage
      const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;
      setUploadProgress(60);

      // Extract text content
      let content = '';
      if (selectedFile.type === 'text/plain') {
        content = await selectedFile.text();
      } else if (selectedFile.type === 'application/pdf') {
        // For PDFs, we'll store basic metadata - actual extraction happens server-side
        content = `[PDF Document: ${selectedFile.name}]`;
      } else if (selectedFile.type.startsWith('image/')) {
        // For images, we'll store basic metadata - OCR can be done server-side
        content = `[Image: ${selectedFile.name}]`;
      }

      setUploadProgress(80);

      // Save to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          content: content || null,
        });

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploadStatus('success');

      toast({
        title: 'File added to knowledge base',
        description: 'You can now ask questions based on this document.',
      });

      // Auto-close after success
      setTimeout(() => {
        handleClose();
        onUploadComplete?.();
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage('Upload failed. Please try again.');
      toast({
        title: 'Upload failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-8 h-8 text-muted-foreground" />;
    if (selectedFile.type.startsWith('image/')) return <Image className="w-8 h-8 text-primary" />;
    return <FileText className="w-8 h-8 text-primary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload to Knowledge Base</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {uploadStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground">File added to knowledge base</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You can now ask questions based on this document.
              </p>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                  ${uploadStatus === 'error' ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="flex flex-col items-center gap-3">
                  {getFileIcon()}
                  
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground">Drop a file or click to browse</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, TXT, PNG, JPG, WEBP (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error message */}
              {uploadStatus === 'error' && errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}

              {/* Progress bar */}
              {uploadStatus === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="text-muted-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={uploadStatus === 'uploading'}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  className="flex-1"
                  disabled={!selectedFile || uploadStatus === 'uploading'}
                >
                  {uploadStatus === 'uploading' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;
