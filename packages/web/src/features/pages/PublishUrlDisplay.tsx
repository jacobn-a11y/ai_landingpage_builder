import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface PublishUrlDisplayProps {
  url: string;
}

export function PublishUrlDisplay({ url }: PublishUrlDisplayProps) {
  const { showError, showSuccess } = useToast();
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        showSuccess('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      },
      () => showError('Failed to copy')
    );
  };

  return (
    <div className="space-y-2">
      <Label>Destination URL</Label>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-sm" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copyUrl}
          title="Copy URL"
          aria-label={copied ? 'Copied to clipboard' : 'Copy URL'}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Append UTM params for tracking, e.g. ?utm_source=newsletter&amp;utm_campaign=launch.
      </p>
    </div>
  );
}
