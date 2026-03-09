import { useState, useEffect } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockCountdownProps {
  id: string;
  targetDate?: string;
  daysLabel?: string;
  hoursLabel?: string;
  minutesLabel?: string;
  secondsLabel?: string;
  numberColor?: string;
  labelColor?: string;
  backgroundColor?: string;
  labelPosition?: 'below' | 'above';
  editMode: boolean;
  className?: string;
}

function parseTargetDate(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function CountdownDisplay({
  targetDate,
  daysLabel = 'Days',
  hoursLabel = 'Hours',
  minutesLabel = 'Mins',
  secondsLabel = 'Secs',
  numberColor,
  labelColor,
  labelPosition = 'below',
}: {
  targetDate: Date;
  daysLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  secondsLabel: string;
  numberColor?: string;
  labelColor?: string;
  labelPosition?: 'below' | 'above';
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const secs = Math.floor((diff % (60 * 1000)) / 1000);

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <div className="flex flex-col items-center">
        {labelPosition === 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{daysLabel}</span>}
        <span className="text-2xl font-bold tabular-nums" style={numberColor ? { color: numberColor } : undefined}>{String(days).padStart(2, '0')}</span>
        {labelPosition !== 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{daysLabel}</span>}
      </div>
      <span className="text-xl font-bold">:</span>
      <div className="flex flex-col items-center">
        {labelPosition === 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{hoursLabel}</span>}
        <span className="text-2xl font-bold tabular-nums" style={numberColor ? { color: numberColor } : undefined}>{String(hours).padStart(2, '0')}</span>
        {labelPosition !== 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{hoursLabel}</span>}
      </div>
      <span className="text-xl font-bold">:</span>
      <div className="flex flex-col items-center">
        {labelPosition === 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{minutesLabel}</span>}
        <span className="text-2xl font-bold tabular-nums" style={numberColor ? { color: numberColor } : undefined}>{String(mins).padStart(2, '0')}</span>
        {labelPosition !== 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{minutesLabel}</span>}
      </div>
      <span className="text-xl font-bold">:</span>
      <div className="flex flex-col items-center">
        {labelPosition === 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{secondsLabel}</span>}
        <span className="text-2xl font-bold tabular-nums" style={numberColor ? { color: numberColor } : undefined}>{String(secs).padStart(2, '0')}</span>
        {labelPosition !== 'above' && <span className="text-xs text-muted-foreground" style={labelColor ? { color: labelColor } : undefined}>{secondsLabel}</span>}
      </div>
    </div>
  );
}

export function BlockCountdown({
  id,
  targetDate: targetDateStr = '',
  daysLabel = 'Days',
  hoursLabel = 'Hours',
  minutesLabel = 'Mins',
  secondsLabel = 'Secs',
  numberColor,
  labelColor,
  backgroundColor,
  labelPosition = 'below',
  editMode,
  className,
}: BlockCountdownProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const targetDate = parseTargetDate(targetDateStr);

  if (editMode) {
    return (
      <div
        className={cn(
          'py-4 px-6 rounded border-2 border-dashed border-muted-foreground/30 bg-muted/30 cursor-pointer',
          selected && 'border-primary',
          className
        )}
        style={backgroundColor ? { backgroundColor } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        {targetDate ? (
          <CountdownDisplay
            targetDate={targetDate}
            daysLabel={daysLabel}
            hoursLabel={hoursLabel}
            minutesLabel={minutesLabel}
            secondsLabel={secondsLabel}
            numberColor={numberColor}
            labelColor={labelColor}
            labelPosition={labelPosition}
          />
        ) : (
          <span className="text-sm text-muted-foreground">Set target date in properties</span>
        )}
      </div>
    );
  }

  if (!targetDate) return null;
  return (
    <div className={cn('py-4 px-6 rounded', className)} style={backgroundColor ? { backgroundColor } : undefined}>
      <CountdownDisplay
        targetDate={targetDate}
        daysLabel={daysLabel}
        hoursLabel={hoursLabel}
        minutesLabel={minutesLabel}
        secondsLabel={secondsLabel}
        numberColor={numberColor}
        labelColor={labelColor}
        labelPosition={labelPosition}
      />
    </div>
  );
}
