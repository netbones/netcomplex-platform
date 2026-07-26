import { StarIcon } from 'lucide-react';
import { Badge } from '@shared/ui/badge';

export default function BadgeWithIconDemo() {
  return (
    <Badge className="bg-teal-200 text-teal-900">
      <StarIcon className="size-3" />
      With Icon
    </Badge>
  );
}
