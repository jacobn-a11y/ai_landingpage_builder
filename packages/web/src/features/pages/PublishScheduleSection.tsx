import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

interface PublishScheduleSectionProps {
  schedulePublishAt: string;
  scheduleUnpublishAt: string;
  onPublishAtChange: (value: string) => void;
  onUnpublishAtChange: (value: string) => void;
}

export function PublishScheduleSection({
  schedulePublishAt,
  scheduleUnpublishAt,
  onPublishAtChange,
  onUnpublishAtChange,
}: PublishScheduleSectionProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" /> Schedule (optional)
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Publish at</Label>
          <Input
            type="datetime-local"
            value={schedulePublishAt}
            onChange={(e) => onPublishAtChange(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Unpublish at</Label>
          <Input
            type="datetime-local"
            value={scheduleUnpublishAt}
            onChange={(e) => onUnpublishAtChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
