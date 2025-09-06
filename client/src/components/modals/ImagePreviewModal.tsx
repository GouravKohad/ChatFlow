import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImagePreviewModal({ imageUrl, open, onOpenChange }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90" data-testid="modal-image-preview">
        <div className="relative flex items-center justify-center min-h-[50vh]">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-image-preview"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <img
            src={imageUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            data-testid="image-preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
