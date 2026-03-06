/**
 * Universal element properties: margin, padding, background, border (4-corner radius,
 * style, width, color), opacity, box shadow, device visibility, width, z-index.
 * Applied to all blocks.
 */

import type { CSSProperties } from 'react';

export interface UniversalProps {
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  backgroundColor?: string;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: string;
  opacity?: number;
  boxShadowOffsetX?: number;
  boxShadowOffsetY?: number;
  boxShadowBlur?: number;
  boxShadowSpread?: number;
  boxShadowColor?: string;
  visibleOn?: 'all' | 'desktop' | 'tablet' | 'mobile';
  width?: number | string;
  maxWidth?: number | string;
  minWidth?: number | string;
}

export function getUniversalStyle(props: Record<string, unknown>): string {
  const styles: string[] = [];
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && !isNaN(v) ? v : undefined;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v ? v : undefined;

  const mt = num(props.marginTop); if (mt != null) styles.push(`margin-top:${mt}px`);
  const mr = num(props.marginRight); if (mr != null) styles.push(`margin-right:${mr}px`);
  const mb = num(props.marginBottom); if (mb != null) styles.push(`margin-bottom:${mb}px`);
  const ml = num(props.marginLeft); if (ml != null) styles.push(`margin-left:${ml}px`);

  const pt = num(props.paddingTop); if (pt != null) styles.push(`padding-top:${pt}px`);
  const pr = num(props.paddingRight); if (pr != null) styles.push(`padding-right:${pr}px`);
  const pb = num(props.paddingBottom); if (pb != null) styles.push(`padding-bottom:${pb}px`);
  const pl = num(props.paddingLeft); if (pl != null) styles.push(`padding-left:${pl}px`);

  const bg = str(props.backgroundColor); if (bg) styles.push(`background-color:${bg}`);

  // 4-corner radius
  const brTL = num(props.borderTopLeftRadius);
  const brTR = num(props.borderTopRightRadius);
  const brBR = num(props.borderBottomRightRadius);
  const brBL = num(props.borderBottomLeftRadius);
  const brAll = num(props.borderRadius);
  if (brTL != null || brTR != null || brBR != null || brBL != null) {
    styles.push(`border-radius:${brTL ?? 0}px ${brTR ?? 0}px ${brBR ?? 0}px ${brBL ?? 0}px`);
  } else if (brAll != null) {
    styles.push(`border-radius:${brAll}px`);
  }

  const bw = num(props.borderWidth); if (bw != null) styles.push(`border-width:${bw}px`);
  const bc = str(props.borderColor); if (bc) styles.push(`border-color:${bc}`);
  const bs = str(props.borderStyle); if (bs) styles.push(`border-style:${bs}`);
  if (bc && !bs) styles.push('border-style:solid');

  // Opacity
  const op = num(props.opacity); if (op != null) styles.push(`opacity:${op / 100}`);

  // Box shadow
  const sx = num(props.boxShadowOffsetX);
  const sy = num(props.boxShadowOffsetY);
  const sb = num(props.boxShadowBlur);
  const ss = num(props.boxShadowSpread);
  const sc = str(props.boxShadowColor);
  if (sx != null || sy != null || sb != null || ss != null) {
    styles.push(`box-shadow:${sx ?? 0}px ${sy ?? 0}px ${sb ?? 0}px ${ss ?? 0}px ${sc ?? 'rgba(0,0,0,0.2)'}`);
  }

  const w = props.width; if (w != null) styles.push(`width:${typeof w === 'number' ? w + 'px' : w}`);
  const maxW = props.maxWidth; if (maxW != null) styles.push(`max-width:${typeof maxW === 'number' ? maxW + 'px' : maxW}`);
  const minW = props.minWidth; if (minW != null) styles.push(`min-width:${typeof minW === 'number' ? minW + 'px' : minW}`);

  return styles.join(';');
}

export function hasUniversalProps(props: Record<string, unknown>): boolean {
  const keys = [
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'backgroundColor', 'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
    'borderBottomRightRadius', 'borderBottomLeftRadius', 'borderWidth', 'borderColor',
    'borderStyle', 'opacity', 'boxShadowOffsetX', 'boxShadowOffsetY',
    'boxShadowBlur', 'boxShadowSpread', 'boxShadowColor', 'visibleOn',
    'width', 'maxWidth', 'minWidth', 'zIndex',
  ];
  return keys.some((k) => props[k] != null && props[k] !== '');
}

export function getUniversalStyleObject(props: Record<string, unknown>): React.CSSProperties {
  const obj: Record<string, string | number> = {};
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && !isNaN(v) ? v : undefined;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v ? v : undefined;

  const mt = num(props.marginTop); if (mt != null) obj.marginTop = mt;
  const mr = num(props.marginRight); if (mr != null) obj.marginRight = mr;
  const mb = num(props.marginBottom); if (mb != null) obj.marginBottom = mb;
  const ml = num(props.marginLeft); if (ml != null) obj.marginLeft = ml;

  const pt = num(props.paddingTop); if (pt != null) obj.paddingTop = pt;
  const pr = num(props.paddingRight); if (pr != null) obj.paddingRight = pr;
  const pb = num(props.paddingBottom); if (pb != null) obj.paddingBottom = pb;
  const pl = num(props.paddingLeft); if (pl != null) obj.paddingLeft = pl;

  const bg = str(props.backgroundColor); if (bg) obj.backgroundColor = bg;

  // 4-corner radius
  const brTL = num(props.borderTopLeftRadius);
  const brTR = num(props.borderTopRightRadius);
  const brBR = num(props.borderBottomRightRadius);
  const brBL = num(props.borderBottomLeftRadius);
  const brAll = num(props.borderRadius);
  if (brTL != null) obj.borderTopLeftRadius = brTL;
  if (brTR != null) obj.borderTopRightRadius = brTR;
  if (brBR != null) obj.borderBottomRightRadius = brBR;
  if (brBL != null) obj.borderBottomLeftRadius = brBL;
  if (brAll != null && brTL == null && brTR == null && brBR == null && brBL == null) {
    obj.borderRadius = brAll;
  }

  const bw = num(props.borderWidth); if (bw != null) obj.borderWidth = bw;
  const bc = str(props.borderColor); if (bc) obj.borderColor = bc;
  const bs = str(props.borderStyle); if (bs) obj.borderStyle = bs;
  if (bc && !bs) obj.borderStyle = 'solid';

  // Opacity
  const op = num(props.opacity); if (op != null) obj.opacity = op / 100;

  // Box shadow
  const sx = num(props.boxShadowOffsetX);
  const sy = num(props.boxShadowOffsetY);
  const sb = num(props.boxShadowBlur);
  const ss = num(props.boxShadowSpread);
  const sc = str(props.boxShadowColor);
  if (sx != null || sy != null || sb != null || ss != null) {
    obj.boxShadow = `${sx ?? 0}px ${sy ?? 0}px ${sb ?? 0}px ${ss ?? 0}px ${sc ?? 'rgba(0,0,0,0.2)'}`;
  }

  const zi = num(props.zIndex); if (zi != null) obj.zIndex = zi;

  const w = props.width;
  if (w != null && (typeof w === 'number' || typeof w === 'string')) obj.width = w;
  const maxW = props.maxWidth;
  if (maxW != null && (typeof maxW === 'number' || typeof maxW === 'string')) obj.maxWidth = maxW;
  const minW = props.minWidth;
  if (minW != null && (typeof minW === 'number' || typeof minW === 'string')) obj.minWidth = minW;

  return obj as CSSProperties;
}
