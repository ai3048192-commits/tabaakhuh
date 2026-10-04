import {
  Award, BadgeCheck, Bell, ChefHat, ClipboardList, Clock, CreditCard, Facebook, Flame, Gift,
  Ghost, Heart, HeartHandshake, Instagram, Leaf, Linkedin, MessageCircle, Music2, PackageCheck,
  Search, Send, ShieldCheck, Smartphone, Sparkles, Star, Store, ThumbsUp, Truck, Twitter, Users,
  Utensils, Wallet, Youtube, type LucideIcon,
} from 'lucide-react'
import type { SocialPlatform } from './content'

/**
 * The icons an admin can pick for a stat, step or feature card. Stored by key
 * (never by component) so the saved JSON stays stable across icon-library
 * upgrades.
 */
export const ICONS = {
  chef: { Icon: ChefHat, label: 'طباخة' },
  package: { Icon: PackageCheck, label: 'طلب' },
  star: { Icon: Star, label: 'نجمة' },
  clock: { Icon: Clock, label: 'ساعة' },
  shield: { Icon: ShieldCheck, label: 'أمان' },
  sparkles: { Icon: Sparkles, label: 'لمعة' },
  search: { Icon: Search, label: 'بحث' },
  clipboard: { Icon: ClipboardList, label: 'قائمة' },
  card: { Icon: CreditCard, label: 'دفع' },
  badge: { Icon: BadgeCheck, label: 'توثيق' },
  bell: { Icon: Bell, label: 'إشعار' },
  wallet: { Icon: Wallet, label: 'محفظة' },
  truck: { Icon: Truck, label: 'توصيل' },
  utensils: { Icon: Utensils, label: 'أكل' },
  heart: { Icon: Heart, label: 'قلب' },
  handshake: { Icon: HeartHandshake, label: 'تعاون' },
  gift: { Icon: Gift, label: 'هدية' },
  flame: { Icon: Flame, label: 'سخن' },
  leaf: { Icon: Leaf, label: 'طبيعي' },
  award: { Icon: Award, label: 'جائزة' },
  thumbs: { Icon: ThumbsUp, label: 'إعجاب' },
  users: { Icon: Users, label: 'ناس' },
  store: { Icon: Store, label: 'متجر' },
  phone: { Icon: Smartphone, label: 'موبايل' },
} satisfies Record<string, { Icon: LucideIcon; label: string }>

export type IconKey = keyof typeof ICONS

export const ICON_KEYS = Object.keys(ICONS) as IconKey[]

/** Unknown keys (an older or hand-edited document) fall back to a neutral icon. */
export function iconFor(key: string): LucideIcon {
  return (ICONS as Record<string, { Icon: LucideIcon }>)[key]?.Icon ?? Sparkles
}

export const SOCIAL_PLATFORMS: Record<SocialPlatform, { Icon: LucideIcon; name: string; color: string }> = {
  facebook: { Icon: Facebook, name: 'Facebook', color: '#1877F2' },
  instagram: { Icon: Instagram, name: 'Instagram', color: '#E1306C' },
  x: { Icon: Twitter, name: 'X', color: '#111111' },
  tiktok: { Icon: Music2, name: 'TikTok', color: '#111111' },
  youtube: { Icon: Youtube, name: 'YouTube', color: '#FF0000' },
  whatsapp: { Icon: MessageCircle, name: 'WhatsApp', color: '#25D366' },
  snapchat: { Icon: Ghost, name: 'Snapchat', color: '#E6C200' },
  linkedin: { Icon: Linkedin, name: 'LinkedIn', color: '#0A66C2' },
  telegram: { Icon: Send, name: 'Telegram', color: '#229ED9' },
}

export const SOCIAL_KEYS = Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]
