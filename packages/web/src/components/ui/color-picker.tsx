/**
 * Color picker component with hue/saturation square, opacity slider, and hex input.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const fallback = { r: 0, g: 0, b: 0, a: 1 };
  if (!hex) return fallback;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length === 8) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: parseInt(hex.slice(6, 8), 16) / 255 };
  }
  if (hex.length === 6) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
  }
  return fallback;
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? base + toHex(a * 255) : base;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6) % 6;
  if (i === 0) { r = c; g = x; } else if (i === 1) { r = x; g = c; } else if (i === 2) { g = c; b = x; }
  else if (i === 3) { g = x; b = c; } else if (i === 4) { r = x; b = c; } else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value || '#000000');
  const containerRef = useRef<HTMLDivElement>(null);
  const satPanelRef = useRef<HTMLDivElement>(null);

  const rgba = hexToRgba(value || '#000000');
  const hsl = rgbToHsl(rgba.r, rgba.g, rgba.b);
  const [hue, setHue] = useState(hsl.h);

  useEffect(() => {
    setHexInput(value || '#000000');
    const rgba2 = hexToRgba(value || '#000000');
    const hsl2 = rgbToHsl(rgba2.r, rgba2.g, rgba2.b);
    if (hsl2.s > 0.01) setHue(hsl2.h);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSatPanelInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
    const panel = satPanelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = x;
    const l = 1 - y;
    const lightness = l * (1 - s / 2);
    const saturation = lightness === 0 || lightness === 1 ? 0 : (l - lightness) / Math.min(lightness, 1 - lightness);
    const rgb = hslToRgb(hue, saturation, lightness);
    onChange(rgbaToHex(rgb.r, rgb.g, rgb.b, rgba.a));
  }, [hue, rgba.a, onChange]);

  const handleSatPanelMouseDown = useCallback((e: React.MouseEvent) => {
    handleSatPanelInteraction(e);
    const onMove = (ev: MouseEvent) => handleSatPanelInteraction(ev);
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [handleSatPanelInteraction]);

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseFloat(e.target.value);
    setHue(newHue);
    const rgb = hslToRgb(newHue, hsl.s, hsl.l);
    onChange(rgbaToHex(rgb.r, rgb.g, rgb.b, rgba.a));
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newA = parseFloat(e.target.value) / 100;
    onChange(rgbaToHex(rgba.r, rgba.g, rgba.b, newA));
  };

  const handleHexCommit = () => {
    let h = hexInput.trim();
    if (!h.startsWith('#')) h = '#' + h;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(h)) onChange(h);
    else setHexInput(value || '#000000');
  };

  const curHsl = rgbToHsl(rgba.r, rgba.g, rgba.b);
  const cursorX = curHsl.s * 100;
  const cursorY = (1 - curHsl.l) * 100;
  const hueColor = hslToRgb(hue, 1, 0.5);
  const hueHex = rgbaToHex(hueColor.r, hueColor.g, hueColor.b, 1);

  return (
    <div className={className} ref={containerRef} style={{ position: 'relative' }}>
      {label && <Label className="text-xs mb-1 block">{label}</Label>}
      <div className="flex items-center gap-2">
        <button type="button" className="w-7 h-7 rounded border border-input shrink-0 cursor-pointer" style={{ backgroundColor: value || '#000000' }} onClick={() => setOpen(!open)} title="Open color picker" />
        <Input value={hexInput} onChange={(e) => setHexInput(e.target.value)} onBlur={handleHexCommit} onKeyDown={(e) => { if (e.key === 'Enter') handleHexCommit(); }} className="h-7 text-xs font-mono" placeholder="#000000" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 p-2 bg-popover border rounded-md shadow-md" style={{ width: 220 }}>
          <div ref={satPanelRef} className="relative w-full h-32 rounded cursor-crosshair mb-2" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})` }} onMouseDown={handleSatPanelMouseDown}>
            <div className="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${cursorX}%`, top: `${cursorY}%`, backgroundColor: value || '#000' }} />
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-muted-foreground">Hue</label>
            <input type="range" min="0" max="360" step="1" value={hue} onChange={handleHueChange} className="w-full h-2 appearance-none rounded cursor-pointer" style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }} />
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-muted-foreground">Opacity: {Math.round(rgba.a * 100)}%</label>
            <input type="range" min="0" max="100" step="1" value={Math.round(rgba.a * 100)} onChange={handleOpacityChange} className="w-full h-2 appearance-none rounded cursor-pointer" style={{ background: `linear-gradient(to right, transparent, ${rgbaToHex(rgba.r, rgba.g, rgba.b, 1)})` }} />
          </div>
          <div className="flex gap-1 text-[10px] text-muted-foreground"><span>R:{rgba.r}</span><span>G:{rgba.g}</span><span>B:{rgba.b}</span></div>
        </div>
      )}
    </div>
  );
}
