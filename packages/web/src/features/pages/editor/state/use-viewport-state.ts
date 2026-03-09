import { useEffect, useState } from 'react';
import type { Breakpoint } from '../types';
import { BREAKPOINT_WIDTHS } from '../types';

export interface ViewportState {
  previewMode: boolean;
  setPreviewMode: (value: boolean) => void;
  breakpoint: Breakpoint;
  setBreakpoint: (value: Breakpoint) => void;
  canvasWidth: number;
  setCanvasWidth: (value: number) => void;
}

export function useViewportState(): ViewportState {
  const [previewMode, setPreviewMode] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [canvasWidth, setCanvasWidth] = useState(BREAKPOINT_WIDTHS.desktop);

  useEffect(() => {
    setCanvasWidth(BREAKPOINT_WIDTHS[breakpoint]);
  }, [breakpoint]);

  return {
    previewMode,
    setPreviewMode,
    breakpoint,
    setBreakpoint,
    canvasWidth,
    setCanvasWidth,
  };
}
