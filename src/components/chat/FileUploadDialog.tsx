import { useState, useRef } from 'react';
import { Upload, FileText, Image, Loader2, CheckCircle, AlertCircle, Video, Music } from 'lucide-react';
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

type UploadStatus = 'idle' | 'uploading' | 'transcribing' | 'success' | 'error';

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  // Video formats
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  // Audio formats
  'audio/mpeg', // .mp3
  'audio/wav',
  'audio/x-wav',
  'audio/mp4', // .m4a
  'audio/x-m4a',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for video/audio

const MEDIA_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
];

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
      return `Unsupported file type. Please upload PDF, TXT, PNG, JPG, WEBP, MP4, MOV, WEBM, MP3, WAV, or M4A files.`;
    }
    // Higher limit for media files
    const isMedia = MEDIA_TYPES.includes(file.type);
    const sizeLimit = isMedia ? MAX_FILE_SIZE : 10 * 1024 * 1024;
    const sizeLimitLabel = isMedia ? '50MB' : '10MB';
    if (file.size > sizeLimit) {
      return `File too large. Maximum size is ${sizeLimitLabel}. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`;
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

    const isMedia = MEDIA_TYPES.includes(selectedFile.type);

    try {
      // Upload to storage
      const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;
      setUploadProgress(50);

      // Extract text content based on file type
      let content = '';
      if (selectedFile.type === 'text/plain') {
        content = await selectedFile.text();
      } else if (selectedFile.type === 'application/pdf') {
        content = `[PDF Document: ${selectedFile.name}]`;
      } else if (selectedFile.type.startsWith('image/')) {
        content = `[Image: ${selectedFile.name}]`;
      } else if (isMedia) {
        // For media files, we'll trigger transcription after saving
        content = `[Processing: ${selectedFile.name}]`;
      }

      setUploadProgress(60);

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

      // If it's a media file, trigger transcription
      if (isMedia) {
        setUploadStatus('transcribing');
        setUploadProgress(70);

        const transcribeResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              filePath,
              fileType: selectedFile.type,
              fileName: selectedFile.name,
              userId: user.id,
            }),
          }
        );

        const transcribeResult = await transcribeResponse.json();
        
        if (!transcribeResponse.ok || !transcribeResult.success) {
          console.error('Transcription failed:', transcribeResult);
          // Update the document with error status but don't fail the upload
          await supabase
            .from('documents')
            .update({ content: `[Transcription failed for: ${selectedFile.name}]` })
            .eq('file_path', filePath)
            .eq('user_id', user.id);
          
          toast({
            title: 'Media uploaded with warning',
            description: 'File uploaded but transcription failed. You may have limited ability to query this file.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Media transcribed successfully',
            description: 'You can now ask questions based on this audio/video content.',
          });
        }
      } else {
        toast({
          title: 'File added to knowledge base',
          description: 'You can now ask questions based on this document.',
        });
      }

      setUploadProgress(100);
      setUploadStatus('success');

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
    if (selectedFile.type.startsWith('video/')) return <Video className="w-8 h-8 text-primary" />;
    if (selectedFile.type.startsWith('audio/')) return <Music className="w-8 h-8 text-primary" />;
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
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a"
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
                        Documents, images, videos & audio
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, TXT, PNG, JPG • MP4, MOV, WEBM • MP3, WAV, M4A
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
              {(uploadStatus === 'uploading' || uploadStatus === 'transcribing') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {uploadStatus === 'transcribing' ? 'Transcribing audio...' : 'Uploading...'}
                    </span>
                    <span className="text-muted-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  {uploadStatus === 'transcribing' && (
                    <p className="text-xs text-muted-foreground text-center">
                      This may take a moment for longer files
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={uploadStatus === 'uploading' || uploadStatus === 'transcribing'}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  className="flex-1"
                  disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'transcribing'}
                >
                  {uploadStatus === 'uploading' || uploadStatus === 'transcribing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadStatus === 'transcribing' ? 'Transcribing...' : 'Uploading...'}
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
