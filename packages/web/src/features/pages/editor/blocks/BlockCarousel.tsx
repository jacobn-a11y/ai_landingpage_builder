import { useState, useCallback } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselSlide {
  id: string;
  name: string;
  contentHtml?: string;
  imageUrl?: string;
}

interface BlockCarouselProps {
  id: string;
  slides?: CarouselSlide[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showArrows?: boolean;
  arrowsPosition?: 'inside' | 'outside';
  arrowsColor?: string;
  showDots?: boolean;
  dotSelectedColor?: string;
  dotUnselectedColor?: string;
  backgroundColor?: string;
  transitionTime?: number;
  loop?: boolean;
  editMode: boolean;
  className?: string;
}

const DEFAULT_SLIDES: CarouselSlide[] = [
  { id: '1', name: 'Slide 1', contentHtml: '<p>Slide 1 content</p>' },
  { id: '2', name: 'Slide 2', contentHtml: '<p>Slide 2 content</p>' },
  { id: '3', name: 'Slide 3', contentHtml: '<p>Slide 3 content</p>' },
];

export function BlockCarousel({
  id,
  slides = DEFAULT_SLIDES,
  showArrows = true,
  arrowsColor = '#333',
  showDots = true,
  dotSelectedColor = '#333',
  dotUnselectedColor = '#ccc',
  backgroundColor,
  loop = true,
  editMode,
  className,
}: BlockCarouselProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx: number) => {
    if (loop) {
      setCurrent(((idx % slides.length) + slides.length) % slides.length);
    } else {
      setCurrent(Math.max(0, Math.min(idx, slides.length - 1)));
    }
  }, [slides.length, loop]);

  const slide = slides[current];

  return (
    <div
      className={cn(
        'carousel-block relative overflow-hidden rounded min-h-[200px]',
        selected && editMode && 'ring-2 ring-primary',
        className
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
      onClick={editMode ? (e) => { e.stopPropagation(); handleBlockClick(id, e); } : undefined}
    >
      {/* Current slide */}
      <div className="w-full min-h-[200px] flex items-center justify-center p-4">
        {slide?.imageUrl ? (
          <img src={slide.imageUrl} alt={slide.name} className="max-w-full max-h-[400px] object-contain" />
        ) : slide?.contentHtml ? (
          <div dangerouslySetInnerHTML={{ __html: slide.contentHtml }} />
        ) : (
          <span className="text-muted-foreground">{slide?.name ?? 'Empty slide'}</span>
        )}
      </div>

      {/* Arrow navigation */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white cursor-pointer border-0"
            onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: arrowsColor }} />
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white cursor-pointer border-0"
            onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
          >
            <ChevronRight className="h-5 w-5" style={{ color: arrowsColor }} />
          </button>
        </>
      )}

      {/* Dot navigation */}
      {showDots && slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              className="w-2.5 h-2.5 rounded-full border-0 cursor-pointer"
              style={{ backgroundColor: i === current ? dotSelectedColor : dotUnselectedColor }}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
