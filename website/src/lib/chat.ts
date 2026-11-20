import type { PlatformId } from '../components/brand';

export interface ChatUser { name: string; platform: PlatformId; color: string; badge?: 'sub' | 'mod' | 'member' | 'vip' }
export type GiftId = 'rose' | 'heart' | 'doughnut' | 'galaxy';

export type ChatItem =
  | { kind: 'chat'; user: ChatUser; text: string }
  | { kind: 'gift'; user: ChatUser; gift: GiftId; count: number }
  | { kind: 'sub'; user: ChatUser; months: number }
  | { kind: 'superchat'; user: ChatUser; amount: string; text: string }
  | { kind: 'follow'; user: ChatUser }
  | { kind: 'raid'; user: ChatUser; viewers: number }
  | { kind: 'kicks'; user: ChatUser; amount: number };

export const GIFTS: Record<GiftId, { name: string; diamonds: number }> = {
  rose: { name: 'Rose', diamonds: 1 },
  heart: { name: 'Finger Heart', diamonds: 5 },
  doughnut: { name: 'Doughnut', diamonds: 30 },
  galaxy: { name: 'Galaxy', diamonds: 1000 },
};

/* Made-up viewers for the demo. */
const U = {
  panda: { name: 'PixelPanda', platform: 'twitch', color: '#8dff8a', badge: 'sub' },
  kira: { name: 'KiraNightfall', platform: 'tiktok', color: '#c792ff' },
  nova: { name: 'NovaRider', platform: 'youtube', color: '#6bf3ff', badge: 'member' },
  taco: { name: 'TurboTaco', platform: 'kick', color: '#ffb86b' },
  luna: { name: 'LunaByte', platform: 'facebook', color: '#ff8fc7' },
  zen: { name: 'ZenMaster99', platform: 'twitch', color: '#ff6b6b', badge: 'mod' },
  mochi: { name: 'mochi.moon', platform: 'tiktok', color: '#ffd36b' },
  chomp: { name: 'SirChomps', platform: 'youtube', color: '#9fb4ff' },
  echo: { name: 'EchoVale', platform: 'kick', color: '#7cf29c', badge: 'vip' },
  rangi: { name: 'Rangi', platform: 'facebook', color: '#ffa36b' },
} satisfies Record<string, ChatUser>;
export const USERS: ChatUser[] = Object.values(U);

export const SCRIPT: ChatItem[] = [
  { kind: 'chat', user: U.panda, text: 'W stream 🔥' },
  { kind: 'chat', user: U.kira, text: 'what game is next?' },
  { kind: 'chat', user: U.nova, text: 'first time catching you live!' },
  { kind: 'gift', user: U.mochi, gift: 'rose', count: 12 },
  { kind: 'chat', user: U.taco, text: 'this overlay is so clean' },
  { kind: 'chat', user: U.luna, text: 'hello from Colombo 👋' },
  { kind: 'chat', user: U.kira, text: 'can you do a giveaway?' },
  { kind: 'chat', user: U.kira, text: 'pls pls pls' },
  { kind: 'sub', user: U.panda, months: 12 },
  { kind: 'chat', user: U.zen, text: 'all chats in one place, love it' },
  { kind: 'superchat', user: U.chomp, amount: '$20.00', text: 'keep it up!' },
  { kind: 'chat', user: U.echo, text: 'LMAO that jump 😂' },
  { kind: 'follow', user: U.taco },
  { kind: 'chat', user: U.rangi, text: 'GG!!' },
  { kind: 'gift', user: U.kira, gift: 'galaxy', count: 1 },
  { kind: 'chat', user: U.nova, text: 'clip that' },
  { kind: 'chat', user: U.nova, text: 'someone clip that rn' },
  { kind: 'kicks', user: U.echo, amount: 100 },
  { kind: 'chat', user: U.mochi, text: 'lets goooo' },
  { kind: 'raid', user: U.zen, viewers: 128 },
  { kind: 'chat', user: U.luna, text: 'turn the music up a bit?' },
  { kind: 'gift', user: U.luna, gift: 'heart', count: 5 },
  { kind: 'chat', user: U.panda, text: 'how is the chat merged?? 👀' },
  { kind: 'chat', user: U.taco, text: 'Mergio 💜' },
];

/** Only the alerts (no plain chat), for the alerts overlay demos. */
export const ALERTS = SCRIPT.filter(i => i.kind !== 'chat');
/** Only plain chat. */
export const CHATS = SCRIPT.filter(i => i.kind === 'chat');

export const initial = (name: string) => name.replace(/[^a-z]/gi, '').charAt(0).toUpperCase() || '?';

/** A stable gradient per name, like Mergio's letter avatars. */
export function avatarGradient(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 85% 62%), hsl(${(h + 40) % 360} 80% 48%))`;
}
