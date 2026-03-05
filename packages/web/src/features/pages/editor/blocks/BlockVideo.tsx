import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

type VideoProvider = 'youtube' | 'vimeo' | 'wistia' | 'custom';

function getEmbedUrl(provider: VideoProvider, url: string): string | null {
  if (!url?.trim()) return null;
  try {
    if (provider === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    }
    if (provider === 'vimeo') {
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    }
    if (provider === 'wistia') {
      const match = url.match(/wistia\.com\/medias\/([^/?]+)/);
      return match ? `https://fast.wistia.net/embed/iframe/${match[1]}` : null;
    }
    return url.startsWith('http') ? url : null;
  } catch {
    return null;
  }
}

interface BlockVideoProps {
  id: string;
  provider?: VideoProvider;
  url?: string;
  autoplay?: boolean;
  loop?: boolean;
  mute?: boolean;
  aspectRatio?: string;
  editMode: boolean;
  className?: string;
}

export function BlockVideo({
  id,
  provider = 'youtube',
  url = '',
  autoplay = false,
  loop = false,
  mute = false,
  aspectRatio = '16/9',
  editMode,
  className,
}: BlockVideoProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const embedUrl = getEmbedUrl(provider, url);

  if (editMode) {
    return (
      <div
        className={cn(
          'relative min-h-[200px] rounded border-2 border-dashed border-muted-foreground/30 bg-muted/30 overflow-hidden',
          selected && 'border-primary',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        {embedUrl ? (
          <div className="relative w-full" style={{ aspectRatio }}>
            <iframe
              src={embedUrl}
              title="Video"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Add video URL in properties
          </span>
        )}
      </div>
    );
  }

  if (!embedUrl) return null;
  return (
    <div className={cn('relative w-full overflow-hidden rounded', className)} style={{ aspectRatio }}>
      <iframe
        src={embedUrl + (autoplay ? '?autoplay=1' : '') + (mute ? '&mute=1' : '') + (loop ? '&loop=1' : '')}
        title="Video"
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
