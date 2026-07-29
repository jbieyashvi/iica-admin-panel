import {
  Palette,
  Sparkles,
  Landmark,
  Dumbbell,
  Flower2,
  Medal,
  Trophy,
  Mic,
  Building2,
  Wine,
  BriefcaseBusiness,
  Tag,
  Star,
  Camera,
  Music,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Palette, Sparkles, Landmark, Dumbbell, Flower2, Medal, Trophy, Mic,
  Building2, Wine, BriefcaseBusiness, Tag, Star, Camera, Music, Users,
};

// Icon names offered in the "Add category" form.
export const ICON_OPTIONS = Object.keys(MAP);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Tag;
  return <Icon className={className} aria-hidden />;
}
