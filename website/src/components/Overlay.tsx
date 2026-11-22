import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Banknote, Coins, Gift, Heart, Shield, Sparkles, Star, UserPlus, Users } from 'lucide-react';
import { PlatformIcon, platformColor, platformName } from './brand';
import { GiftArt } from './GiftArt';
import { GIFTS, type AlertItem, type ChatItem, type ChatUser, type GiftId } from '../lib/chat';
import { Face } from './Face';
import type { FeedEntry } from '../lib/hooks';

// measures before paint in the browser; the HTML built ahead of time (entry-server.tsx) skips it
const useLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

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

/** The ten themes of Mergio's alerts overlay (Alerts > Style in the app). */
export type AlertLook = 'levelup' | 'achievement' | 'loot' | 'arcade' | 'combo' | 'quest' | 'cyber' | 'spotlight' | 'neon' | 'bubble';
export const ALERT_LOOKS: { id: AlertLook; name: string }[] = [
  { id: 'levelup', name: 'Level up' },
  { id: 'achievement', name: 'Achievement' },
  { id: 'loot', name: 'Loot drop' },
  { id: 'arcade', name: 'Arcade' },
  { id: 'combo', name: 'Combo' },
  { id: 'quest', name: 'Quest' },
  { id: 'cyber', name: 'Cyber' },
  { id: 'spotlight', name: 'Spotlight' },
  { id: 'neon', name: 'Neon' },
  { id: 'bubble', name: 'Bubbly' },
];

/* The game bits, as in the app's alerts.js: each theme's font and big word, and how rare an alert is. */
const THEME_FONT: Partial<Record<AlertLook, string>> = { levelup: 'Lilita One', loot: 'Lilita One', arcade: "'Press Start 2P'", combo: 'Bangers', quest: 'Cinzel', cyber: 'Orbitron', achievement: 'Rubik' };
const TIERS = ['common', 'rare', 'epic', 'legendary'] as const;
const TIER_NAMES = ['Common', 'Rare', 'Epic', 'Legendary'];
const TIER_COLORS = ['#a7b1c2', '#3fa1ff', '#b866ff', '#ffb627'];
const POINTS = [50, 250, 1000, 5000];
const TIER_STEPS: Partial<Record<AlertItem['kind'], number[]>> = { gift: [100, 1000, 10000], kicks: [100, 1000, 10000], superchat: [5, 20, 100], raid: [10, 50, 250], sub: [6, 12, 24] };
function tierOf(item: AlertItem) {
  const v = item.kind === 'gift' ? GIFTS[item.gift].diamonds * item.count : item.kind === 'kicks' ? item.amount : item.kind === 'superchat' ? parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0
    : item.kind === 'raid' ? item.viewers : item.kind === 'sub' ? item.months : 0;
  const steps = TIER_STEPS[item.kind];
  if (!steps) return 0;
  const t = v >= steps[2] ? 3 : v >= steps[1] ? 2 : v >= steps[0] ? 1 : 0;
  return item.kind === 'sub' ? Math.max(1, t) : t;
}
function headline(look: AlertLook, item: AlertItem, tier: number, label: string) {
  switch (look) {
    case 'levelup': return 'LEVEL UP!';
    case 'achievement': return 'Achievement unlocked';
    case 'loot': return `${TIER_NAMES[tier]} drop`;
    case 'arcade': return item.kind === 'follow' ? 'NEW PLAYER!' : item.kind === 'raid' ? 'PARTY JOINED!' : '1UP!';
    case 'combo': return 'COMBO!';
    case 'quest': return 'Quest complete';
    case 'cyber': return `// incoming: ${label}`;
    default: return '';
  }
}
/** The arcade score, counting up like an old high-score table. */
function useCountUp(to: number, on: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const t0 = performance.now() + 700, d = 900;
    const step = (now: number) => { const k = Math.max(0, Math.min(1, (now - t0) / d)); setN(Math.round(to * k)); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, on]);
  return n;
}

export function AlertShow({ item, look = 'levelup', life = 5, size = 1, fit = false }: { item: AlertItem; look?: AlertLook; life?: number; size?: number; fit?: boolean }) {
  const ev = eventInfo(item);
  const { user } = item;
  const [out, setOut] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayout(() => {
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
  const tier = tierOf(item);
  const head = headline(look, item, tier, ev.label);
  const level = (Array.from(user.name).reduce((s, ch) => s + ch.charCodeAt(0), 0) % 9) + 1;
  const score = useCountUp(POINTS[tier], look === 'arcade');
  const font = THEME_FONT[look];
  // the points sit in the text for Achievement and on the alert itself for the others, as in the app
  const pts = <div className="pts">{look === 'arcade' ? `SCORE +${String(score).padStart(6, '0')}` : `+${POINTS[tier].toLocaleString('en-US')}`}</div>;
  return (
    <div ref={box} className={`mga st-${look}`} style={{ fontSize: `${22 * size}px`, ...(font ? { fontFamily: `${font}, 'Segoe UI', system-ui, sans-serif` } : null), ...(fit ? { transform: `scale(${scale})`, transformOrigin: 'center' } : null) }} aria-hidden="true">
      <div className={`alert ev-${item.kind} p-${user.platform} t-${TIERS[tier]}${ev.gift ? ' has-gift' : ''}${out ? ' out' : ''}`}
        style={{ '--pc': platformColor(user.platform), '--ev': ev.color, '--tier': TIER_COLORS[tier], '--hold': `${life}s` } as CSSProperties}>
        <div className="fx">
          {look === 'neon' && <svg className="tube"><rect className="glow" pathLength={1} /><rect className="core" pathLength={1} /></svg>}
          {(look === 'bubble' || look === 'loot' || look === 'achievement' || look === 'levelup') && <i className="shine" />}
          {look === 'loot' && <i className="beam" />}
          {look === 'combo' && <i className="streaks" />}
          {look === 'cyber' && <><i className="scan" /><i className="corners" /></>}
          {look === 'quest' && <><i className="roll l" /><i className="roll r" /></>}
        </div>
        <div className={`art${ev.gift ? ' gift' : ''}`}>
          {ev.gift
            ? <><GiftArt gift={ev.gift} className="gift-img" /><Face name={user.name} className="av-mini" /></>
            : <><Face name={user.name} className="av" /><span className="glyph corner">{ev.glyph}</span></>}
          <i className="ring" />
          <div className="lvl"><span className="lv-t">LV</span><span className="lv-n"><b className="old">{level}</b><b className="new">{level + 1}</b></span></div>
          <div className="rar">{TIER_NAMES[tier]}</div>
        </div>
        <div className="info">
          {head && <div className="hw">{head}</div>}
          <div className="label">
            <span className="what-kind">{ev.label}</span>
            <span className="pchip"><PlatformIcon id={user.platform} />on {platformName(user.platform)}</span>
          </div>
          <div className="name">{Array.from(user.name).map((ch, i) => <span key={i} className="l" style={{ '--i': i } as CSSProperties}>{ch}</span>)}</div>
          <div className="title">{ev.title}</div>
          {amount && <div className="amount">{amount}</div>}
          {ev.message && <div className="msg">{ev.message}</div>}
          <div className="xp"><i /><span className="xp-t">+{POINTS[tier].toLocaleString('en-US')} XP</span></div>
          {look === 'achievement' && pts}
        </div>
        {look !== 'achievement' && pts}
        <div className="timer"><i /></div>
      </div>
    </div>
  );
}
