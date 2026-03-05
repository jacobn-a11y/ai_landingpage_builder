/**
 * Universal element properties: margin, padding, background, border, width.
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
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
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
  const br = num(props.borderRadius); if (br != null) styles.push(`border-radius:${br}px`);
  const bw = num(props.borderWidth); if (bw != null) styles.push(`border-width:${bw}px`);
  const bc = str(props.borderColor); if (bc) styles.push(`border-color:${bc};border-style:solid`);

  const w = props.width; if (w != null) styles.push(`width:${typeof w === 'number' ? w + 'px' : w}`);
  const maxW = props.maxWidth; if (maxW != null) styles.push(`max-width:${typeof maxW === 'number' ? maxW + 'px' : maxW}`);
  const minW = props.minWidth; if (minW != null) styles.push(`min-width:${typeof minW === 'number' ? minW + 'px' : minW}`);

  return styles.join(';');
}

export function hasUniversalProps(props: Record<string, unknown>): boolean {
  const keys = [
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'backgroundColor', 'borderRadius', 'borderWidth', 'borderColor',
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
  const br = num(props.borderRadius); if (br != null) obj.borderRadius = br;
  const bw = num(props.borderWidth); if (bw != null) obj.borderWidth = bw;
  const bc = str(props.borderColor); if (bc) { obj.borderColor = bc; obj.borderStyle = 'solid'; }

  const zi = num(props.zIndex); if (zi != null) obj.zIndex = zi;

  const w = props.width;
  if (w != null && (typeof w === 'number' || typeof w === 'string')) obj.width = w;
  const maxW = props.maxWidth;
  if (maxW != null && (typeof maxW === 'number' || typeof maxW === 'string')) obj.maxWidth = maxW;
  const minW = props.minWidth;
  if (minW != null && (typeof minW === 'number' || typeof minW === 'string')) obj.minWidth = minW;

  return obj as CSSProperties;
}
