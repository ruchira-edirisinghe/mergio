import type { CSSProperties, ReactNode } from 'react';
import { Gift, Heart, Shield, Sparkles, Star, Users } from 'lucide-react';
import { PlatformIcon, platformColor, platformName } from './brand';
import { GiftArt } from './GiftArt';
import { GIFTS, type ChatItem, type ChatUser } from '../lib/chat';
import { Face } from './Face';
import type { FeedEntry } from '../lib/hooks';

export type ThemeId = 'glass' | 'neon' | 'minimal' | 'soft' | 'retro';
export const THEMES: { id: ThemeId; name: string }[] = [
  { id: 'glass', name: 'Glass' },
  { id: 'neon', name: 'Neon' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'soft', name: 'Soft light' },
  { id: 'retro', name: 'Retro pixel' },
];

export function Avatar({ user, className = '' }: { user: Pick<ChatUser, 'name'>; className?: string }) {
  return <span className={`mg-av ${className}`}><Face name={user.name} /></span>;
}

function Badge({ badge }: { badge: NonNullable<ChatUser['badge']> }) {
  const Icon = badge === 'mod' ? Shield : badge === 'member' ? Sparkles : Star;
  const bg = badge === 'mod' ? '#00ad03' : badge === 'member' ? '#2ba640' : badge === 'vip' ? '#e005b9' : '#9146ff';
  return <span className="mg-badge" style={{ background: bg }}><Icon strokeWidth={2.6} /></span>;
}

/** Colour, label and wording for an alert, the way Mergio describes it. */
export function eventInfo(item: Exclude<ChatItem, { kind: 'chat' }>) {
  const { user } = item;
  const on = `on ${platformName(user.platform)}`;
  switch (item.kind) {
    case 'gift': {
      const g = GIFTS[item.gift];
      return { color: '#fe2c55', label: `GIFT · ${on}`, title: <><b>{user.name}</b> sent {g.name}</>, sub: `×${item.count} · ${(g.diamonds * item.count).toLocaleString('en-US')} diamonds`,
        line: <><b>{user.name}</b> sent <b>{g.name}</b> <span className="mg-amt">×{item.count}</span></>, art: <GiftArt gift={item.gift} />, small: <GiftArt gift={item.gift} /> };
    }
    case 'sub':
      return { color: '#9146ff', label: `${item.months > 1 ? 'RESUB' : 'NEW SUBSCRIBER'} · ${on}`, title: <><b>{user.name}</b> subscribed</>, sub: `${item.months} months · Tier 1`,
        line: <><b>{user.name}</b> subscribed for <b>{item.months} months</b></>, art: <Star fill="currentColor" />, small: <Star fill="currentColor" /> };
    case 'superchat':
      return { color: '#e91e63', label: `SUPER CHAT · ${on}`, title: <><b>{user.name}</b> sent {item.amount}</>, sub: `“${item.text}”`,
        line: <><span className="mg-chip">{item.amount}</span> <b>{user.name}</b>: {item.text}</>, art: <span className="mg-sc">{item.amount}</span>, small: <Sparkles /> };
    case 'follow':
      return { color: '#53fc18', label: `NEW FOLLOWER · ${on}`, title: <><b>{user.name}</b> followed</>, sub: 'Welcome to the crew!',
        line: <><b>{user.name}</b> followed</>, art: <Heart fill="currentColor" />, small: <Heart fill="currentColor" /> };
    case 'raid':
      return { color: '#bf94ff', label: `RAID · ${on}`, title: <><b>{user.name}</b> is raiding</>, sub: `with ${item.viewers} viewers`,
        line: <><b>{user.name}</b> is raiding with <b>{item.viewers}</b> viewers</>, art: <Users />, small: <Users /> };
    case 'kicks':
      return { color: '#53fc18', label: `KICKS · ${on}`, title: <><b>{user.name}</b> sent {item.amount} KICKs</>, sub: 'Thanks for the support!',
        line: <><b>{user.name}</b> sent <b>{item.amount} KICKs</b></>, art: <Gift />, small: <Gift /> };
  }
}

function Line({ item, grouped, showAvatar }: { item: ChatItem; grouped: boolean; showAvatar: boolean }) {
  const pc = platformColor(item.user.platform);
  if (item.kind !== 'chat') {
    const ev = eventInfo(item);
    return (
      <div className="mg-msg mg-alert" style={{ '--pc': pc, '--ev': ev.color } as CSSProperties}>
        <div className="mg-bubble">
          <span className="mg-plat"><PlatformIcon id={item.user.platform} colored /></span>
          <span className="mg-evic">{ev.small}</span>
          <span className="mg-text">{ev.line}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`mg-msg ${grouped ? 'grouped' : ''}`} style={{ '--pc': pc } as CSSProperties}>
      <div className="mg-bubble">
        {!grouped && (
          <>
            <span className="mg-plat"><PlatformIcon id={item.user.platform} colored /></span>
            {showAvatar && <Avatar user={item.user} />}
            {item.user.badge && <Badge badge={item.user.badge} />}
            <b className="mg-name" style={{ color: item.user.color }}>{item.user.name}</b>
            <span className="mg-colon">: </span>
          </>
        )}
        <span className="mg-text">{item.text}</span>
      </div>
    </div>
  );
}

export interface FeedOptions {
  theme?: ThemeId;
  box?: boolean;
  showAvatar?: boolean;
  alerts?: boolean;
  /** Seconds before a message fades away (0 = never). */
  fade?: number;
  fontSize?: number;
  align?: 'left' | 'right';
}

/** A Mergio chat overlay, redrawn: platform icon, picture, name, message; follow-ups tucked under the picture. */
export function ChatFeed({ items, theme = 'glass', box = true, showAvatar = true, alerts = true, fade = 0, fontSize = 15, align = 'left', className = '', style }: FeedOptions & { items: FeedEntry<ChatItem>[]; className?: string; style?: CSSProperties }) {
  const shown = alerts ? items : items.filter(e => e.item.kind === 'chat');
  return (
    <div className={`mg-feed ${className}`} data-theme={theme} data-box={box ? '1' : '0'} data-align={align} data-fade={fade ? '1' : undefined}
      style={{ fontSize, '--fade': `${fade}s`, ...style } as CSSProperties} aria-hidden="true">
      {shown.map((e, i) => {
        const prev = shown[i - 1]?.item;
        const grouped = e.item.kind === 'chat' && prev?.kind === 'chat' && prev.user.name === e.item.user.name;
        return <Line key={e.key} item={e.item} grouped={grouped} showAvatar={showAvatar} />;
      })}
    </div>
  );
}

/** One big alert, like Mergio's separate alerts overlay. */
export function AlertCard({ item, life = 5, size = 1, children }: { item: Exclude<ChatItem, { kind: 'chat' }>; life?: number; size?: number; children?: ReactNode }) {
  const ev = eventInfo(item);
  return (
    <div className="mg-alertcard" style={{ '--ev': ev.color, '--life': `${life}s`, fontSize: `${size}em` } as CSSProperties}>
      <div className="mg-ac-art">{ev.art}</div>
      <div className="mg-ac-lbl"><PlatformIcon id={item.user.platform} /> {ev.label}</div>
      <div className="mg-ac-ttl">{ev.title}</div>
      <div className="mg-ac-sub">{ev.sub}</div>
      <div className="mg-ac-timer" />
      {children}
    </div>
  );
}

