import {
  Blocks,
  CalendarDays,
  CircleDot,
  Cloud,
  CreditCard,
  Gamepad2,
  Gift,
  Joystick,
  Layers,
  Monitor,
  Tag,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  gamepad: Gamepad2,
  "credit-card": CreditCard,
  gift: Gift,
  wallet: Wallet,
  steam: Cloud,
  playstation: CircleDot,
  xbox: CircleDot,
  nintendo: Joystick,
  blocks: Blocks,
  target: Target,
  monitor: Monitor,
  layers: Layers,
  calendar: CalendarDays,
  tag: Tag,
};

export function CategoryIcon({
  name,
  size = 27,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = icons[name] ?? Gamepad2;
  return <Icon size={size} strokeWidth={1.65} className={className} aria-hidden="true" />;
}
