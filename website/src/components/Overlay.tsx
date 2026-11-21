import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Banknote, Coins, Gift, Heart, Shield, Sparkles, Star, UserPlus, Users } from 'lucide-react';
import { PlatformIcon, platformColor, platformName } from './brand';
import { GiftArt } from './GiftArt';
import { GIFTS, type AlertItem, type ChatItem, type ChatUser, type GiftId } from '../lib/chat';
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

/** Colour, label and wording for an alert, worded the way Mergio's connectors describe it. */
export function eventInfo(item: AlertItem): { color: string; label: string; title: string; amount?: string; message?: string; glyph: ReactNode; gift?: GiftId } {
  switch (item.kind) {
    case 'gift':
      return { color: '#fe2c55', label: 'Gift', title: `sent ${GIFTS[item.gift].name}`, amount: `×${item.count}`, glyph: <Gift />, gift: item.gift };
    case 'sub':
      return item.months > 1
        ? { color: '#9147ff', label: 'Resubscribed', title: `resubscribed for ${item.months} months`, amount: 'Tier 1', glyph: <Star fill="currentColor" /> }
        : { color: '#9147ff', label: 'New subscriber', title: 'subscribed with Tier 1', amount: 'Tier 1', glyph: <Star fill="currentColor" /> };
    case 'superchat':
      return { color: '#f57c00', label: 'Super Chat', title: 'sent a Super Chat', amount: item.amount, message: item.text, glyph: <Banknote /> };
    case 'follow':
      return { color: '#53fc18', label: 'New follower', title: 'followed', glyph: <UserPlus /> };
    case 'raid':
      return { color: '#ff6b3d', label: 'Raid', title: `is raiding with ${item.viewers} viewers`, amount: `${item.viewers} viewers`, glyph: <Users /> };
    case 'kicks':
      return { color: '#53fc18', label: 'Kicks', title: 'sent Kicks', amount: `${item.amount} Kicks`, glyph: <Coins /> };
  }
}

/** Like the app: only real amounts, and only when the title doesn't already say it. */
function shownAmount(title: string, amount?: string) {
  const num = String(amount || '').match(/\d[\d.,]*/)?.[0];
  return num && (/^[×x]/i.test(amount!) || !title.includes(num)) ? amount : undefined;
}

/** The line above each message: platform, badge and name (the picture sits in its own column on the left). */
function Head({ user }: { user: ChatUser }) {
  return (
    <div className="mg-head">
      <span className="mg-plat"><PlatformIcon id={user.platform} colored /></span>
      {user.badge && <Badge badge={user.badge} />}
      <b className="mg-name" style={{ color: user.color }}>{user.name}</b>
    </div>
  );
}

/** A message row like the app's: the picture on the left, the name on top and the message under it. */
function Row({ user, showAvatar, className = '', style, children }: { user: ChatUser; showAvatar: boolean; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={`mg-msg ${showAvatar ? 'has-av' : ''} ${className}`} style={style}>
      {showAvatar && <span className="mg-avcol"><Avatar user={user} /></span>}
      {children}
    </div>
  );
}

function Line({ item, grouped, showAvatar }: { item: ChatItem; grouped: boolean; showAvatar: boolean }) {
  const pc = platformColor(item.user.platform);
  if (item.kind === 'like') {
    return (
      <Row user={item.user} showAvatar={showAvatar} className="mg-like" style={{ '--pc': pc } as CSSProperties}>
        <div className="mg-bubble">
          <Head user={item.user} />
          <span className="mg-heart"><Heart fill="currentColor" /></span>
          <span className="mg-lk">liked the LIVE</span><span className="mg-amt">×{item.count}</span>
        </div>
      </Row>
    );
  }
  if (item.kind !== 'chat') {
    const ev = eventInfo(item);
    const amount = shownAmount(ev.title, ev.amount);
    return (
      <Row user={item.user} showAvatar={showAvatar} className="mg-alert" style={{ '--pc': pc, '--ev': ev.color } as CSSProperties}>
        <div className="mg-bubble">
          <Head user={item.user} />
          <span className="mg-evic">{ev.gift ? <GiftArt gift={ev.gift} /> : ev.glyph}</span>
          <span className="mg-evt">{ev.title}</span>
          {amount && <span className="mg-amt">{amount}</span>}
          {ev.message && <span className="mg-text mg-evmsg">{ev.message}</span>}
        </div>
      </Row>
    );
  }
  return (
    <Row user={item.user} showAvatar={showAvatar} className={grouped ? 'grouped' : ''} style={{ '--pc': pc } as CSSProperties}>
      <div className="mg-bubble">
        {!grouped && <Head user={item.user} />}
        <span className="mg-text">{item.text}</span>
      </div>
    </Row>
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

/** A Mergio chat overlay, redrawn: the picture on the left, platform and name on top, the message below; follow-ups line up under it. */
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

/** The six looks of Mergio's alerts overlay (Alerts > Style in the app). */
export type AlertLook = 'spotlight' | 'banner' | 'neon' | 'bubble' | 'card' | 'toast';
export const ALERT_LOOKS: { id: AlertLook; name: string }[] = [
  { id: 'spotlight', name: 'Spotlight' },
  { id: 'banner', name: 'Banner' },
  { id: 'neon', name: 'Neon' },
  { id: 'bubble', name: 'Bubbly' },
  { id: 'card', name: 'Card' },
  { id: 'toast', name: 'Minimal' },
];

/** One alert from Mergio's alerts overlay, built from the same parts as the app (see alerts.css). It leaves by itself after `life` seconds.
    With `fit`, it shrinks to fit the height of its parent (tall looks with a message would spill over what is below). */
export function AlertShow({ item, look = 'spotlight', life = 5, size = 1, fit = false }: { item: AlertItem; look?: AlertLook; life?: number; size?: number; fit?: boolean }) {
  const ev = eventInfo(item);
  const { user } = item;
  const [out, setOut] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = box.current, parent = el?.parentElement;
    if (!fit || !el || !parent) return;
    const measure = () => { const h = el.scrollHeight, room = parent.clientHeight; setScale(h && room ? Math.min(1, room / h) : 1); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [fit, item, look, size]);
  useEffect(() => {
    const t = setTimeout(() => setOut(true), Math.max(1, life - 0.6) * 1000);
    return () => clearTimeout(t);
  }, [life]);
  const amount = shownAmount(ev.title, ev.amount);
  return (
    <div ref={box} className={`mga st-${look}`} style={{ fontSize: `${22 * size}px`, ...(fit ? { transform: `scale(${scale})`, transformOrigin: 'center' } : null) }} aria-hidden="true">
      <div className={`alert ev-${item.kind} p-${user.platform}${out ? ' out' : ''}`}
        style={{ '--pc': platformColor(user.platform), '--ev': ev.color, '--hold': `${life}s` } as CSSProperties}>
        <div className="fx">
          {look === 'neon' && <svg className="tube"><rect className="glow" pathLength={1} /><rect className="core" pathLength={1} /></svg>}
          {look === 'bubble' && <i className="shine" />}
          {look === 'card' && <><i className="blob" /><i className="blob" /></>}
        </div>
        <div className={`art${ev.gift ? ' gift' : ''}`}>
          {ev.gift
            ? <><GiftArt gift={ev.gift} className="gift-img" /><Face name={user.name} className="av-mini" /></>
            : <><Face name={user.name} className="av" /><span className="glyph corner">{ev.glyph}</span></>}
          <i className="ring" />
        </div>
        <div className="info">
          <div className="label">
            <span className="what-kind">{ev.label}</span>
            <span className="pchip"><PlatformIcon id={user.platform} />on {platformName(user.platform)}</span>
          </div>
          <div className="name">{Array.from(user.name).map((ch, i) => <span key={i} className="l" style={{ '--i': i } as CSSProperties}>{ch}</span>)}</div>
          <div className="title">{ev.title}</div>
          {amount && <div className="amount">{amount}</div>}
          {ev.message && <div className="msg">{ev.message}</div>}
        </div>
        <div className="timer"><i /></div>
      </div>
    </div>
  );
}
