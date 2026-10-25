import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy, Zap, X, SkipForward, History, LogOut,
  Share2, Search, Download, Shirt, CreditCard, Edit2, Check,
  Monitor, Timer, Flame, Award, PieChart, AlertCircle, TrendingUp, Gavel,
  RotateCcw, Shuffle, UserPlus, Trash2, Sparkles, QrCode, Volume2, VolumeX,
  FileSignature, ArrowUp, Info, Copy, Users2, Bell, Crown, Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import rawListone from './data/listone.json';
import { supabase } from './supabase';

type Role = 'P' | 'D' | 'C' | 'A';
type LegalSection = 'TERMS' | 'PRIVACY' | 'REFUND' | 'SUPPORT' | null;

export interface Player {
  id: string;
  name: string;
  role: Role;
  team: string;
  basePrice: number;
  mv?: string;
  fm?: string;
  overall?: number;
}

interface Coach {
  name: string;
  teamName: string;
  budget: number;
  playersCount: number;
  isOnline?: boolean;
}

interface PurchasedItem {
  player: Player;
  price: number;
}

const ROLE_LIMITS: Record<Role, number> = { P: 3, D: 8, C: 8, A: 6 };
const TOTAL_SLOTS = 25;

const EMOJI_CHOICES = [
  { emoji: '🤘', name: 'Gufata', msg: 'TI STO GUFANDO! SI ROMPE DOMANI!' },
  { emoji: '💸', name: 'Sceicco', msg: 'MA QUANTI SOLDI HAI?! SCEICCO!' },
  { emoji: '😂', name: 'Risata', msg: 'ACQUISTO RIDICOLO AHAHAH!' },
  { emoji: '🤫', name: 'Zitti', msg: 'TUTTI ZITTI, QUESTO È MIO!' },
  { emoji: '🗑️', name: 'Bidone', msg: 'CHE PACCO CLAMOROSO!' },
  { emoji: '💤', name: 'Sveglia', msg: 'SVEGLIAAA! STATE DORMENDO?!' },
];

const listoneUfficiale: Player[] = (Array.isArray(rawListone) && rawListone.length > 0
  ? rawListone.map((p: any, idx: number): Player => ({
      id: String(p?.Id || `p_${idx}`),
      name: String(p?.Nome || 'Calciatore').trim(),
      role: (['P', 'D', 'C', 'A'].includes(p?.R) ? p.R : 'C') as Role,
      team: String(p?.Squadra || 'Serie A').trim(),
      basePrice: Number(p?.Qt?.A) || 1,
      mv: String(p?.Mv || '6.00'),
      fm: String(p?.Fm || '6.00'),
      overall: (Number(p?.Qt?.A) || 1) > 20 ? 88 : 80,
    }))
  : ([
      { id: '1', name: 'Barella', role: 'C' as Role, team: 'Inter', basePrice: 22, mv: '6.45', fm: '7.10', overall: 87 },
      { id: '2', name: 'Buongiorno', role: 'D' as Role, team: 'Napoli', basePrice: 16, mv: '6.35', fm: '6.80', overall: 85 },
      { id: '3', name: 'Lautaro Martinez', role: 'A' as Role, team: 'Inter', basePrice: 38, mv: '6.65', fm: '8.40', overall: 91 },
      { id: '4', name: 'Maignan', role: 'P' as Role, team: 'Milan', basePrice: 18, mv: '6.25', fm: '5.40', overall: 86 },
      { id: '5', name: 'Pulisic', role: 'C' as Role, team: 'Milan', basePrice: 25, mv: '6.50', fm: '7.65', overall: 88 },
      { id: '6', name: 'Svilar', role: 'P' as Role, team: 'Roma', basePrice: 15, mv: '6.35', fm: '5.60', overall: 84 },
    ] as Player[])
).sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));

const TEAM_BADGES = [
  { aliases: ['inter', 'internazionale'], short: 'INT', primary: '#0756a5', secondary: '#101820', ink: '#ffffff' },
  { aliases: ['milan', 'ac milan'], short: 'MIL', primary: '#c81d32', secondary: '#151515', ink: '#ffffff' },
  { aliases: ['juventus', 'juve'], short: 'JUV', primary: '#171717', secondary: '#f4f4f4', ink: '#ffffff' },
  { aliases: ['napoli'], short: 'NAP', primary: '#087fb5', secondary: '#d9f4ff', ink: '#ffffff' },
  { aliases: ['lazio'], short: 'LAZ', primary: '#77b8dd', secondary: '#f6f7f8', ink: '#102743' },
  { aliases: ['roma'], short: 'ROM', primary: '#8d1830', secondary: '#f2a51a', ink: '#ffffff' },
  { aliases: ['atalanta'], short: 'ATA', primary: '#13295d', secondary: '#101010', ink: '#ffffff' },
  { aliases: ['fiorentina'], short: 'FIO', primary: '#563184', secondary: '#f5f2f8', ink: '#ffffff' },
  { aliases: ['bologna'], short: 'BOL', primary: '#153f83', secondary: '#c72439', ink: '#ffffff' },
  { aliases: ['torino'], short: 'TOR', primary: '#7e1c2a', secondary: '#f2e6e4', ink: '#ffffff' },
  { aliases: ['como'], short: 'COM', primary: '#2187ae', secondary: '#f2f7fa', ink: '#ffffff' },
  { aliases: ['udinese'], short: 'UDI', primary: '#171717', secondary: '#f3d52d', ink: '#ffffff' },
  { aliases: ['genoa'], short: 'GEN', primary: '#b21f34', secondary: '#193e69', ink: '#ffffff' },
  { aliases: ['parma'], short: 'PAR', primary: '#19519a', secondary: '#f2d12a', ink: '#ffffff' },
  { aliases: ['cagliari'], short: 'CAG', primary: '#bd2637', secondary: '#16477c', ink: '#ffffff' },
  { aliases: ['lecce'], short: 'LEC', primary: '#c42a35', secondary: '#e4c326', ink: '#ffffff' },
  { aliases: ['verona'], short: 'VER', primary: '#f0c928', secondary: '#1e4e9b', ink: '#17213a' },
] as const;

const getTeamBadgeStyle = (team: unknown) => {
  const norm = String(team || '').toLowerCase().trim();
  const found = TEAM_BADGES.find(e => e.aliases.some(a => norm.includes(a)));
  return found || { short: norm.slice(0, 3).toUpperCase() || 'FC', primary: '#1e293b', secondary: '#fbbf24', ink: '#ffffff' };
};

const getViralStampInfo = (price: number, basePrice: number, initialBudget: number) => {
  if (price === 1) return { label: 'SCOMMESSA LOW COST 💎', color: '#38bdf8', border: 'border-sky-400 text-sky-400' };
  if (basePrice >= 20 || price >= initialBudget * 0.25) return { label: 'TOP PLAYER ASSICURATO 👑', color: '#f59e0b', border: 'border-amber-400 text-amber-400' };
  if (price >= 25 || basePrice >= 12) return { label: 'COLPO DI MERCATO 🔥', color: '#10b981', border: 'border-emerald-400 text-emerald-400' };
  return { label: 'CONTRATTO DEPOSITATO ✅', color: '#10b981', border: 'border-emerald-400 text-emerald-400' };
};

let sharedAudioCtx: AudioContext | null = null;
let isGlobalSoundMuted = false;

const getAudioCtx = (): AudioContext | null => {
  if (isGlobalSoundMuted) return null;
  try {
    if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    return sharedAudioCtx;
  } catch { return null; }
};

const speakTelecronista = (text: string, enabled: boolean) => {
  if (!enabled || isGlobalSoundMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT'; u.rate = 1.08;
      const voices = window.speechSynthesis.getVoices();
      const itVoice = voices.find(v => v.lang.toLowerCase().includes('it') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Elsa'))) || voices.find(v => v.lang.toLowerCase().includes('it'));
      if (itVoice) u.voice = itVoice;
      window.speechSynthesis.speak(u);
    }, 40);
  } catch { /* ignore */ }
};

const playTone = (freqStart: number, freqEnd: number, dur: number, type: OscillatorType = 'sine', delay = 0) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + delay + dur);
  gain.gain.setValueAtTime(0.28, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur);
};

const playBuzzSound = () => playTone(880, 1760, 0.22, 'sawtooth');

const playCountdownBell = (pitchHigh = false) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const baseFreq = pitchHigh ? 2349 : 1760;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.65);
};

const playMarketBellSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [1760, 2200, 2637].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
    gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.5);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime + idx * 0.1); osc.stop(ctx.currentTime + idx * 0.1 + 0.5);
  });
};

const playContractShowSound = () => {
  playMarketBellSound();
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, f, 0.35, 'triangle', i * 0.07));
  playTone(130, 38, 0.25, 'sine', 0.55);
};

const BuzzMark = ({ size = 26 }: { size?: number }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className="shrink-0">
    <path d="M13 2h22l11 11v22L35 46H13L2 35V13Z" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
    <path d="M27 7 14 26h9l-3 15 15-21h-9l4-13Z" fill="#0B132B" />
  </svg>
);

const TeamBadge = ({ team, size = 18 }: { team: string; size?: number }) => {
  const b = getTeamBadgeStyle(team);
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 48 56" className="inline-block shrink-0">
      <path d="M24 2 L44 9 L42 29 C41 40 34 48 24 54 C14 48 7 40 6 29 L4 9 Z" fill={b.primary} stroke="#F59E0B" strokeWidth="2.5" />
      <text x="24" y="34" textAnchor="middle" fontWeight="900" fontSize="12" fill={b.ink}>{b.short}</text>
    </svg>
  );
};

const drawTeamBadgeOnCanvas = (ctx: CanvasRenderingContext2D, team: unknown, x: number, y: number, width: number) => {
  const badge = getTeamBadgeStyle(team);
  const height = width * 1.16;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + width * 0.5, y + height * 0.035);
  ctx.lineTo(x + width * 0.92, y + height * 0.16);
  ctx.lineTo(x + width * 0.88, y + height * 0.54);
  ctx.quadraticCurveTo(x + width * 0.84, y + height * 0.82, x + width * 0.5, y + height * 0.97);
  ctx.quadraticCurveTo(x + width * 0.16, y + height * 0.82, x + width * 0.12, y + height * 0.54);
  ctx.lineTo(x + width * 0.08, y + height * 0.16);
  ctx.closePath();
  ctx.fillStyle = badge.primary;
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(width * 0.24)}px system-ui, sans-serif`;
  ctx.fillStyle = badge.ink;
  ctx.fillText(badge.short, x + width * 0.5, y + height * 0.55);
  ctx.restore();
};

const getRoleBadge = (r: string) => r === 'P' ? 'bg-amber-500 text-slate-950' : r === 'D' ? 'bg-emerald-500 text-slate-950' : r === 'C' ? 'bg-sky-500 text-slate-950' : 'bg-rose-600 text-white';

export default function App() {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [highestBidder, setHighestBidder] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | Role>('ALL');
  const [hidePurchased, setHidePurchased] = useState(true);
  const [startFromOne, setStartFromOne] = useState<boolean>(() => localStorage.getItem('fb_v15_startFromOne') !== 'false');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => localStorage.getItem('fb_v15_voiceEnabled') !== 'false');
  const [activeLegalSection, setActiveLegalSection] = useState<LegalSection>(null);

  const [activeLeaguesCount, setActiveLeaguesCount] = useState<number>(42);
  const [activeLeagueTab, setActiveLeagueTab] = useState<'REGULAR' | 'REPAIR'>('REGULAR');

  // Mini-Simulatore interattivo nella Hero
  const [heroBid, setHeroBid] = useState<number>(85);
  const [heroBidder, setHeroBidder] = useState<string>('Sempre Ultimi F.C.');
  const [heroBuzzerPressed, setHeroBuzzerPressed] = useState<boolean>(false);

  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [showRoomCodeArrow, setShowRoomCodeArrow] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [bidHistory, setBidHistory] = useState<{ bidder: string; amount: number; time: string }[]>([]);
  const [latestBidAlert, setLatestBidAlert] = useState<{ bidder: string; amount: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPureTvDisplay, setIsPureTvDisplay] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);
  const [liveReaction, setLiveReaction] = useState<{ sender: string; emoji: string; label: string } | null>(null);

  const [selectedWinnerManual, setSelectedWinnerManual] = useState<string>('');
  const [manualPriceInput, setManualPriceInput] = useState<string>('');
  const [customBidInput, setCustomBidInput] = useState<string>('');

  const [selectedPackage, setSelectedPackage] = useState<'TV' | 'LIVE'>('LIVE');
  const [isLicenseUnlocked, setIsLicenseUnlocked] = useState<boolean>(() => localStorage.getItem('fb_v15_unlocked') === 'true');
  const [customCoachesCount, setCustomCoachesCount] = useState<number>(8);

  const [showCustomLeagueModal, setShowCustomLeagueModal] = useState(false);
  const [customLeagueInput, setCustomLeagueInput] = useState('');
  const [newCoachInput, setNewCoachInput] = useState('');
  const [newTeamNameInput, setNewTeamNameInput] = useState('');
  const [editingCoachIdx, setEditingCoachIdx] = useState<number | null>(null);
  const [editCoachName, setEditCoachName] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editBudgetVal, setEditBudgetVal] = useState<number>(500);

  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'AUCTION' | 'ROSTERS' | 'HIGHLIGHTS'>('AUCTION');
  const [rosterViewMode, setRosterViewMode] = useState<'GRID' | 'FIELD'>('GRID');
  const [mobilePlayerTab, setMobilePlayerTab] = useState<'BUZZER' | 'MY_ROSTER'>('BUZZER');

  const [userRole, setUserRole] = useState<'PRESIDENT' | 'PLAYER' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [inputLeagueName, setInputLeagueName] = useState('');
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('fb_v15_roomCode') || 'LEGA2026');
  const [isRoomCodeConfirmed, setIsRoomCodeConfirmed] = useState(false);
  const [initialBudget, setInitialBudget] = useState<number>(() => Number(localStorage.getItem('fb_v15_initialBudget')) || 500);
  const [leagueName, setLeagueName] = useState(() => localStorage.getItem('fb_v15_leagueName') || 'FantaLega Serie A');

  // Elenco partecipanti lega iniziale
  const [coaches, setCoaches] = useState<Coach[]>(() => {
    const saved = localStorage.getItem('fb_v15_coaches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return [
      { name: 'Mario P. (Presidente)', teamName: 'Sempre Ultimi F.C.', budget: 500, playersCount: 0, isOnline: true },
      { name: 'Pasquale R.', teamName: 'Real Madrink', budget: 500, playersCount: 0, isOnline: true },
      { name: 'Gianni L.', teamName: 'Atletico Ma Non Troppo', budget: 500, playersCount: 0, isOnline: false },
      { name: 'Marco T.', teamName: 'AC Tua', budget: 500, playersCount: 0, isOnline: true },
    ];
  });

  const [purchasedPlayers, setPurchasedPlayers] = useState<Record<string, PurchasedItem[]>>(() => {
    const saved = localStorage.getItem('fb_v15_purchasedPlayers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return {};
  });

  const [selectedRosterCoach, setSelectedRosterCoach] = useState<string>(coaches[0]?.name || 'Mario P. (Presidente)');
  const [awardModal, setAwardModal] = useState<{ show: boolean; player: Player; winner: string; price: number } | null>(null);
  const [lastAwardHistory, setLastAwardHistory] = useState<{ player: Player; winner: string; price: number } | null>(null);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Calcolo prezzo scalare per le leghe ufficiali (da 4 squadre in su)
  const calculateLivePrice = (count: number) => {
    if (count <= 8) return 7.99;
    if (count <= 10) return 9.99;
    return 9.99 + (count - 10) * 1.0;
  };

  const isFreeTestTier = coaches.length <= 3;
  const effectiveCoachesCount = coaches.length >= 4 ? coaches.length : customCoachesCount;
  const currentLivePrice = calculateLivePrice(effectiveCoachesCount);
  const currentPackagePrice = selectedPackage === 'TV' ? 4.99 : currentLivePrice;
  const perPersonPrice = (currentLivePrice / effectiveCoachesCount).toFixed(2);

  const handleHeroBuzzerClick = () => {
    playBuzzSound();
    setHeroBuzzerPressed(true);
    setHeroBid(prev => prev + 2);
    setHeroBidder('La Tua Fanta-Squadra');
    try {
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.65 } });
    } catch { /* ignore */ }
    setTimeout(() => setHeroBuzzerPressed(false), 220);
  };

  useEffect(() => {
    if (userRole) return;
    const interval = setInterval(() => {
      setActiveLeaguesCount(prev => Math.min(54, Math.max(32, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 6000);
    return () => clearInterval(interval);
  }, [userRole]);

  useEffect(() => {
    isGlobalSoundMuted = !voiceEnabled;
    if (!voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);

  useEffect(() => {
    if (!selectedWinnerManual && coaches.length > 0) setSelectedWinnerManual(coaches[0].name);
  }, [coaches, selectedWinnerManual]);

  useEffect(() => {
    localStorage.setItem('fb_v15_coaches', JSON.stringify(coaches));
    localStorage.setItem('fb_v15_purchasedPlayers', JSON.stringify(purchasedPlayers));
    localStorage.setItem('fb_v15_leagueName', leagueName);
    localStorage.setItem('fb_v15_roomCode', roomCode);
    localStorage.setItem('fb_v15_initialBudget', String(initialBudget));
    localStorage.setItem('fb_v15_startFromOne', String(startFromOne));
    localStorage.setItem('fb_v15_voiceEnabled', String(voiceEnabled));
    localStorage.setItem('fb_v15_unlocked', String(isLicenseUnlocked));
  }, [coaches, purchasedPlayers, leagueName, roomCode, initialBudget, startFromOne, voiceEnabled, isLicenseUnlocked]);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('room');
    if (r) { setInputLeagueName(r.trim().toUpperCase()); setRoomCode(r.trim().toUpperCase()); setIsRoomCodeConfirmed(true); }
  }, []);

  const getCoachDisplay = useCallback((coachName: string | null) => {
    if (!coachName) return '';
    const c = coaches.find(x => x.name === coachName);
    return c ? `${c.teamName} (${c.name})` : coachName;
  }, [coaches]);

  const purchasedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(purchasedPlayers).forEach(l => l.forEach(i => ids.add(i.player.id)));
    return ids;
  }, [purchasedPlayers]);

  const allPurchasesFeed = useMemo(() => {
    const feed: { coachName: string; teamName: string; player: Player; price: number }[] = [];
    Object.entries(purchasedPlayers).forEach(([cName, l]) => {
      const cObj = coaches.find(x => x.name === cName);
      l.forEach(i => feed.push({ coachName: cName, teamName: cObj?.teamName || `FC ${cName}`, player: i.player, price: i.price }));
    });
    return feed.reverse();
  }, [purchasedPlayers, coaches]);

  const totalPurchasesCount = purchasedPlayerIds.size;

  const getCoachMaxBid = useCallback((name: string) => {
    const c = coaches.find(x => x.name === name);
    return c ? Math.max(0, c.budget - Math.max(0, TOTAL_SLOTS - c.playersCount - 1)) : 0;
  }, [coaches]);

  const getCoachRoleCount = useCallback((name: string, role: Role) => (purchasedPlayers[name] || []).filter(i => i.player.role === role).length, [purchasedPlayers]);

  const filteredList = useMemo(() => listoneUfficiale.filter(p => {
    if (activeLeagueTab === 'REPAIR') {
      if (purchasedPlayerIds.has(p.id)) return false;
    } else {
      if (hidePurchased && purchasedPlayerIds.has(p.id)) return false;
    }
    if (selectedRole !== 'ALL' && p.role !== selectedRole) return false;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.team.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })), [selectedRole, searchTerm, hidePurchased, purchasedPlayerIds, activeLeagueTab]);

  const activePlayer: Player = currentPlayer || filteredList[0] || listoneUfficiale[0];
  const startingPrice = startFromOne ? 1 : activePlayer.basePrice;
  const activeDuel = useMemo(() => {
    if (bidHistory.length < 4) return null;
    const u = Array.from(new Set(bidHistory.slice(0, 4).map(b => b.bidder)));
    return u.length === 2 ? `${u[0]} ⚔️ ${u[1]}` : null;
  }, [bidHistory]);

  const registerBidLocally = useCallback((bidder: string, amount: number) => {
    playBuzzSound(); setIsBlinking(true); setCountdown(null); setAwardModal(null);
    setTimeout(() => setIsBlinking(false), 300);
    setHighestBidder(bidder); setCurrentBid(amount);
    setCoaches(prev => prev.map(c => c.name === bidder ? { ...c, isOnline: true } : c));
    setLatestBidAlert({ bidder, amount }); setTimeout(() => setLatestBidAlert(null), 2200);
    setBidHistory(prev => [{ bidder, amount, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...prev]);
  }, []);

  const applyAwardState = useCallback((player: Player, winner: string, price: number, speak = false) => {
    playContractShowSound();
    try { confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } }); } catch { /* ignore */ }
    const winnerObj = coaches.find(x => x.name === winner);
    const clubLabel = winnerObj?.teamName || winner;
    if (speak) {
      speakTelecronista(`Colpo di mercato! ${player.name} firma con ${clubLabel} per ${price} fantamilioni!`, voiceEnabled);
    }
    setCoaches(prev => prev.map(c => c.name === winner ? { ...c, budget: c.budget - price, playersCount: c.playersCount + 1 } : c));
    setPurchasedPlayers(prev => ({ ...prev, [winner]: [...(prev[winner] || []), { player, price }] }));
    setLastAwardHistory({ player, winner, price });
    setAwardModal({ show: true, player, winner, price });
    setCurrentBid(0); setHighestBidder(null); setCountdown(null);
  }, [coaches, voiceEnabled]);

  const stateRef = useRef({ coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked });
  useEffect(() => { stateRef.current = { coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked }; }, [coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked]);

  const registerBidRef = useRef(registerBidLocally);
  const applyAwardRef = useRef(applyAwardState);
  useEffect(() => {
    registerBidRef.current = registerBidLocally;
    applyAwardRef.current = applyAwardState;
  }, [registerBidLocally, applyAwardState]);

  useEffect(() => {
    if (!roomCode) return;
    let isMounted = true;
    const ch = supabase.channel(`room_${roomCode}`)
      .on('broadcast', { event: 'quick_bid' }, ({ payload }: any) => {
        payload?.bidder && registerBidRef.current(payload.bidder, payload.amount);
      })
      .on('broadcast', { event: 'player_online' }, ({ payload }: any) => {
        if (payload?.name && isMounted) setCoaches(prev => prev.map(c => c.name === payload.name ? { ...c, isOnline: true } : c));
      })
      .on('broadcast', { event: 'start_countdown' }, ({ payload }: any) => isMounted && setCountdown(payload?.seconds || 3))
      .on('broadcast', { event: 'change_player' }, ({ payload }: any) => {
        if (payload?.player && isMounted) { setCurrentPlayer(payload.player); setCurrentBid(0); setHighestBidder(null); setBidHistory([]); setCountdown(null); setAwardModal(null); }
      })
      .on('broadcast', { event: 'close_award_modal' }, () => { if (isMounted) { setAwardModal(null); setCurrentBid(0); setHighestBidder(null); } })
      .on('broadcast', { event: 'player_awarded' }, ({ payload }: any) => {
        payload?.player && applyAwardRef.current(payload.player, payload.winner, payload.price, false);
      })
      .on('broadcast', { event: 'sync_league_state' }, ({ payload }: any) => {
        if (!isMounted) return;
        if (payload?.coaches) setCoaches(payload.coaches);
        if (payload?.purchasedPlayers) setPurchasedPlayers(payload.purchasedPlayers);
        if (payload?.leagueName) setLeagueName(payload.leagueName);
        if (payload?.activePlayer) setCurrentPlayer(payload.activePlayer);
        if (typeof payload?.currentBid === 'number') setCurrentBid(payload.currentBid);
        if (payload?.highestBidder !== undefined) setHighestBidder(payload.highestBidder);
        if (typeof payload?.isLicenseUnlocked === 'boolean') setIsLicenseUnlocked(payload.isLicenseUnlocked);
      })
      .on('broadcast', { event: 'live_reaction' }, ({ payload }: any) => {
        if (payload?.sender && isMounted) { playCountdownBell(false); setLiveReaction(payload); setTimeout(() => setLiveReaction(null), 3800); }
      })
      .on('broadcast', { event: 'request_sync' }, () => {
        if (stateRef.current.userRole === 'PRESIDENT') ch.send({ type: 'broadcast', event: 'sync_league_state', payload: stateRef.current });
      })
      .subscribe(s => {
        if (!isMounted) return;
        if (s === 'SUBSCRIBED') {
          setIsConnected(true);
          setActiveChannel(ch);
          ch.send({ type: 'broadcast', event: 'request_sync', payload: {} });
          if (userRole === 'PLAYER' && playerName) {
            ch.send({ type: 'broadcast', event: 'player_online', payload: { name: playerName } });
          }
        } else if (s === 'CLOSED' || s === 'CHANNEL_ERROR') {
          setTimeout(() => { if (isMounted) setIsConnected(false); }, 3000);
        }
      });
    return () => { isMounted = false; supabase.removeChannel(ch); setActiveChannel(null); setIsConnected(false); };
  }, [roomCode, userRole, playerName]);

  const handleSelectPlayer = useCallback(async (player: Player) => {
    setCurrentPlayer(player); setCurrentBid(0); setHighestBidder(null); setBidHistory([]); setManualPriceInput(''); setCountdown(null); setAwardModal(null);
    if (userRole === 'PRESIDENT') speakTelecronista(`In campo ${player.name}, ${player.team}.`, voiceEnabled);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'change_player', payload: { player } });
  }, [activeChannel, userRole, voiceEnabled]);

  const handleRoleFilterChange = useCallback((newRole: 'ALL' | Role) => {
    setSelectedRole(newRole);
    const matching = listoneUfficiale
      .filter(p => {
        if (activeLeagueTab === 'REPAIR') {
          if (purchasedPlayerIds.has(p.id)) return false;
        } else {
          if (hidePurchased && purchasedPlayerIds.has(p.id)) return false;
        }
        if (newRole !== 'ALL' && p.role !== newRole) return false;
        return p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.team.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));

    if (matching.length > 0) handleSelectPlayer(matching[0]);
  }, [hidePurchased, purchasedPlayerIds, searchTerm, handleSelectPlayer, activeLeagueTab]);

  const handleRandomPlayer = useCallback(() => {
    if (filteredList.length > 0) handleSelectPlayer(filteredList[Math.floor(Math.random() * filteredList.length)]);
  }, [filteredList, handleSelectPlayer]);

  const handleNextPlayer = useCallback(() => {
    if (filteredList.length === 0) return;
    const currentIndex = filteredList.findIndex(p => p.id === activePlayer.id);
    if (currentIndex !== -1) {
      handleSelectPlayer(filteredList[(currentIndex + 1) % filteredList.length]);
    } else {
      const nextAlpha = filteredList.find(p => p.name.localeCompare(activePlayer.name, 'it', { sensitivity: 'base' }) > 0);
      handleSelectPlayer(nextAlpha || filteredList[0]);
    }
  }, [filteredList, activePlayer.id, activePlayer.name, handleSelectPlayer]);

  const handleCloseAwardAndNext = useCallback(async () => {
    setAwardModal(null);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'close_award_modal', payload: {} });
    if (userRole === 'PRESIDENT') handleNextPlayer();
  }, [activeChannel, userRole, handleNextPlayer]);

  const handleRaise = useCallback(async (step: number, customBidder?: string) => {
    if (purchasedPlayerIds.has(activePlayer.id)) { if (userRole === 'PRESIDENT') handleNextPlayer(); return; }
    const bidder = customBidder || (userRole === 'PRESIDENT' ? (selectedWinnerManual || coaches[0]?.name) : playerName);
    if (!bidder) return;
    if (userRole === 'PLAYER' && highestBidder === bidder) { setCustomAlertMessage('La tua squadra è già in testa!'); return; }
    const nextBid = highestBidder ? currentBid + step : (startFromOne ? step : Math.max(activePlayer.basePrice, step));
    
    if (nextBid > getCoachMaxBid(bidder)) { setCustomAlertMessage(`Puntata max superata per ${bidder} (${getCoachMaxBid(bidder)} FM)!`); return; }
    if (getCoachRoleCount(bidder, activePlayer.role) >= ROLE_LIMITS[activePlayer.role]) { setCustomAlertMessage(`Ruolo ${activePlayer.role} pieno per ${bidder}!`); return; }

    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    if (userRole === 'PRESIDENT' && step >= 10) speakTelecronista(`Rilancio di ${bidder}: ${nextBid}!`, voiceEnabled);

    registerBidLocally(bidder, nextBid);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'quick_bid', payload: { bidder, amount: nextBid } });
  }, [purchasedPlayerIds, activePlayer, userRole, handleNextPlayer, selectedWinnerManual, coaches, playerName, highestBidder, currentBid, startFromOne, getCoachMaxBid, getCoachRoleCount, voiceEnabled, registerBidLocally, activeChannel]);

  const handleAward = useCallback(async () => {
    if (purchasedPlayerIds.has(activePlayer.id)) { handleNextPlayer(); return; }
    
    // Nelle leghe ufficiali (da 4 squadre in su), se non è ancora sbloccata apre il paywall trasparente
    if (!isFreeTestTier && !isLicenseUnlocked) {
      setShowPaywall(true);
      return;
    }

    let price = currentBid > 0 ? currentBid : startingPrice;
    const winner = highestBidder || selectedWinnerManual || coaches[0]?.name;
    if (manualPriceInput && Number(manualPriceInput) > 0) price = Number(manualPriceInput);
    
    if (getCoachRoleCount(winner, activePlayer.role) >= ROLE_LIMITS[activePlayer.role]) { setCustomAlertMessage(`Ruolo ${activePlayer.role} già completato per ${winner}!`); return; }
    if (price > getCoachMaxBid(winner)) { setCustomAlertMessage(`Budget insufficiente per ${winner}!`); return; }

    applyAwardState(activePlayer, winner, price, userRole === 'PRESIDENT');
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'player_awarded', payload: { player: activePlayer, winner, price } });
  }, [purchasedPlayerIds, activePlayer, handleNextPlayer, isFreeTestTier, isLicenseUnlocked, currentBid, startingPrice, highestBidder, selectedWinnerManual, coaches, manualPriceInput, getCoachRoleCount, getCoachMaxBid, applyAwardState, userRole, activeChannel]);

  const handleUndoLastAward = async () => {
    if (!lastAwardHistory) return;
    const { player, winner, price } = lastAwardHistory;
    const uCoaches = coaches.map(c => c.name === winner ? { ...c, budget: c.budget + price, playersCount: Math.max(0, c.playersCount - 1) } : c);
    const uPurchased = { ...purchasedPlayers, [winner]: (purchasedPlayers[winner] || []).filter(i => i.player.id !== player.id) };
    setCoaches(uCoaches); setPurchasedPlayers(uPurchased); setLastAwardHistory(null); setAwardModal(null); setCurrentPlayer(player); setCurrentBid(0); setHighestBidder(null);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'sync_league_state', payload: { coaches: uCoaches, purchasedPlayers: uPurchased, leagueName, activePlayer: player, currentBid: 0, highestBidder: null, isLicenseUnlocked } });
  };

  const sendLiveReaction = async (emoji: string, label: string) => {
    const senderObj = coaches.find(x => x.name === playerName);
    const senderLabel = userRole === 'PRESIDENT' ? 'Il Presidente' : (senderObj ? `${senderObj.teamName} (${senderObj.name})` : playerName);
    const payload = { sender: senderLabel, emoji, label };
    playCountdownBell(true); setLiveReaction(payload); setTimeout(() => setLiveReaction(null), 3800);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'live_reaction', payload });
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      playCountdownBell(countdown === 1);
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCountdown(null);
      if (userRole === 'PRESIDENT') handleAward();
    }
  }, [countdown, userRole, handleAward]);

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const handleShareWhatsAppInvite = () => window.open(`https://wa.me/?text=${encodeURIComponent(`⚽ Entra nello studio TV dell'asta di Fantacalcio *${leagueName}*!\n📲 Clicca qui per aprire il tuo Buzzer: ${inviteUrl}\n🔑 Codice Stanza: *${roomCode}*`)}`, '_blank');
  const handleCopyRoomCode = () => { navigator.clipboard?.writeText(roomCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); };

  const handleShareViralDealWhatsApp = () => {
    if (!awardModal) return;
    const winnerObj = coaches.find(x => x.name === awardModal.winner);
    const club = winnerObj?.teamName || awardModal.winner;
    const stamp = getViralStampInfo(awardModal.price, awardModal.player.basePrice, initialBudget);
    const viralText = `🔥 *${stamp.label}* 🔥\n✍️ *${awardModal.player.name}* (${awardModal.player.team}) firma con *${club.toUpperCase()}* (${awardModal.winner}) per *${awardModal.price} FM*!\n\n📺 Asta del Fantacalcio trasformata in uno Show TV con *FantasyBuzz*!\n👉 Provalo gratis con la tua lega su ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(viralText)}`, '_blank');
  };

  const handleDownloadSocialCard = async () => {
    if (!awardModal) return;
    const winnerObj = coaches.find(x => x.name === awardModal.winner);
    const club = winnerObj?.teamName || `FC ${awardModal.winner}`;
    const stamp = getViralStampInfo(awardModal.price, awardModal.player.basePrice, initialBudget);
    const roleColors: Record<string, string> = { P: '#f59e0b', D: '#10b981', C: '#38bdf8', A: '#f43f5e' };

    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, '#021B12'); bg.addColorStop(0.55, '#062E1E'); bg.addColorStop(1, '#021B12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1920);

    const glow = ctx.createRadialGradient(540, 720, 30, 540, 720, 780);
    glow.addColorStop(0, 'rgba(16,185,129,0.28)'); glow.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1920);

    ctx.save();
    ctx.globalAlpha = 0.14; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
    for (let i = -700; i < 1500; i += 140) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 700, 1920); ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, 1008, 1848);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('FANTASYBUZZ • ASTA FANTACALCIO', 540, 165);
    ctx.fillStyle = '#F59E0B'; ctx.font = '800 32px system-ui, sans-serif';
    ctx.fillText(leagueName.toUpperCase(), 540, 225);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(170, 280, 740, 80);
    ctx.strokeStyle = stamp.color; ctx.lineWidth = 4;
    ctx.strokeRect(170, 280, 740, 80);
    ctx.fillStyle = stamp.color; ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillText(stamp.label, 540, 332);

    ctx.fillStyle = '#0B132B';
    ctx.fillRect(100, 420, 880, 580);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 3;
    ctx.strokeRect(100, 420, 880, 580);

    ctx.fillStyle = roleColors[awardModal.player.role] || '#10b981';
    ctx.fillRect(150, 465, 110, 64);
    ctx.fillStyle = '#0B132B'; ctx.font = '900 36px system-ui, sans-serif';
    ctx.fillText(awardModal.player.role, 205, 510);

    drawTeamBadgeOnCanvas(ctx, awardModal.player.team, 640, 460, 62);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText(awardModal.player.team.toUpperCase(), 810, 505);

    ctx.beginPath(); ctx.arc(540, 675, 105, 0, Math.PI * 2);
    ctx.fillStyle = '#060D1E'; ctx.fill();
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#F59E0B'; ctx.font = '900 95px system-ui, sans-serif';
    ctx.fillText(awardModal.player.name.charAt(0).toUpperCase(), 540, 708);

    ctx.fillStyle = '#ffffff'; ctx.font = '900 66px system-ui, sans-serif';
    ctx.fillText(awardModal.player.name.toUpperCase(), 540, 880);
    ctx.fillStyle = '#94A3B8'; ctx.font = '700 28px system-ui, sans-serif';
    ctx.fillText(`QUOTAZIONE BASE: ${awardModal.player.basePrice} FM  •  MV: ${awardModal.player.mv || '6.00'}`, 540, 945);

    ctx.fillStyle = '#F59E0B'; ctx.font = '900 150px system-ui, sans-serif';
    ctx.fillText(`${awardModal.price} FM`, 540, 1210);

    ctx.fillStyle = '#0B132B';
    ctx.fillRect(120, 1330, 840, 220);
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3;
    ctx.strokeRect(120, 1330, 840, 220);
    ctx.fillStyle = '#94A3B8'; ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText('TESSERATO DALLA FANTA-SOCIETÀ', 540, 1390);
    ctx.fillStyle = '#10b981'; ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText(club.toUpperCase(), 540, 1460);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(`Fantallenatore: ${awardModal.winner}`, 540, 1515);

    ctx.fillStyle = '#ffffff'; ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('L’ASTA DEL FANTACALCIO DIVENTA UNO SHOW LIVE • FANTASYBUZZ', 540, 1720);

    const fileName = `FantasyBuzz_${awardModal.player.name.replace(/\s+/g, '_')}.png`;
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${stamp.label}: ${awardModal.player.name}`,
          text: `🔥 ${awardModal.player.name} firma con ${club} per ${awardModal.price} FM!`
        });
        return;
      } catch { /* fallback download */ }
    }
    const a = document.createElement('a'); a.download = fileName; a.href = URL.createObjectURL(blob); a.click();
  };

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,Squadra Fantacalcio,Allenatore,Calciatore,Ruolo,Club Serie A,Prezzo\n';
    coaches.forEach(c => (purchasedPlayers[c.name] || []).forEach(i => { csv += `"${c.teamName}","${c.name}","${i.player.name}","${i.player.role}","${i.player.team}",${i.price}\n`; }));
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = `Rose_${leagueName}.csv`; a.click();
  };

  const richestCoach = useMemo(() => [...coaches].sort((a, b) => b.budget - a.budget)[0], [coaches]);
  const fullestCoach = useMemo(() => [...coaches].sort((a, b) => b.playersCount - a.playersCount)[0], [coaches]);
  const tickerItems = useMemo(() => {
    const items = allPurchasesFeed.slice(0, 8).map(p => `✅ UFFICIALE: ${p.player.name.toUpperCase()} AI "${p.teamName.toUpperCase()}" (${p.coachName}) PER ${p.price} FM`);
    if (items.length === 0) items.push(`⚽ STUDIO FANTACALCIO APERTO PER "${leagueName.toUpperCase()}" • CODICE STANZA AMICI: ${roomCode}`);
    if (richestCoach) items.push(`💰 PAPERONE: ${richestCoach.teamName.toUpperCase()} (${richestCoach.budget} FM)`);
    return items;
  }, [allPurchasesFeed, leagueName, roomCode, richestCoach]);

  return (
    <>
      <style>{`
        @keyframes paparazziFlash { 0% { opacity: 0.95; } 25% { opacity: 0.1; } 45% { opacity: 0.85; } 100% { opacity: 0; } }
        @keyframes signContractReveal { 0% { clip-path: inset(0 100% 0 0); } 100% { clip-path: inset(0 0 0 0); } }
        @keyframes stampSlamEffect { 0% { transform: scale(3.5) rotate(-25deg); opacity: 0; } 100% { transform: scale(1) rotate(-8deg); opacity: 1; } }
        @keyframes tickerMarquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        @keyframes stadiumSpotlight {
          0%, 100% { transform: rotate(-12deg) scale(1); opacity: 0.35; }
          50% { transform: rotate(12deg) scale(1.15); opacity: 0.6; }
        }
        @keyframes pulseGlowGold {
          0%, 100% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.45); transform: scale(1); }
          50% { box-shadow: 0 0 45px rgba(245, 158, 11, 0.9), inset 0 0 15px rgba(254, 240, 138, 0.6); transform: scale(1.02); }
        }
      `}</style>

      {/* === HERO SECTION ULTRA-COMPATTA CON FOCUS SU SALOTTO E REMOTO === */}
      {!userRole ? (
        <div
          className="min-h-screen w-full text-white flex flex-col items-center justify-between p-3 md:p-6 select-none overflow-y-auto relative z-10"
          style={{ background: `radial-gradient(circle at 50% 18%, rgba(16, 185, 129, 0.28) 0%, rgba(4, 28, 18, 0.96) 55%, rgba(2, 10, 18, 1) 100%)` }}
        >
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-32 left-1/4 w-96 h-[550px] bg-gradient-to-b from-emerald-400/20 via-cyan-400/5 to-transparent blur-3xl" style={{ animation: 'stadiumSpotlight 7s ease-in-out infinite' }} />
            <div className="absolute -top-32 right-1/4 w-96 h-[550px] bg-gradient-to-b from-amber-400/20 via-emerald-400/5 to-transparent blur-3xl" style={{ animation: 'stadiumSpotlight 9s ease-in-out infinite reverse' }} />
          </div>

          <div className="max-w-3xl w-full text-center space-y-1.5 pt-1 relative z-10">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 bg-[#060D1E]/95 border border-amber-400/70 px-3 py-1 rounded-full shadow-lg">
                <BuzzMark size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  L'Asta del Fantacalcio diventa uno Show TV
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-950/90 border border-emerald-400/60 px-3 py-1 rounded-full shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">
                  🔥 {activeLeaguesCount} Leghe in asta adesso
                </span>
              </div>
            </div>
            
            <h1 className="text-2xl md:text-5xl font-black uppercase tracking-tight leading-tight drop-shadow-xl">
              L'Asta del Fantacalcio<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-300 to-cyan-400">diventa uno Show TV.</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-semibold max-w-xl mx-auto leading-tight">
              Addio Excel: Regia sulla TV, Buzzer live sullo smartphone.<br className="hidden sm:inline" /> In salotto sul divano o a distanza da qualsiasi parte del mondo.
            </p>
          </div>

          {/* SIMULATORE COMPATTO NELLA HERO */}
          <div className="max-w-2xl w-full my-2 bg-gradient-to-b from-[#0B1528] to-[#040C1A] border-2 border-amber-400/80 rounded-2xl p-3.5 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative z-10">
            <div className="text-center mb-2 flex items-center justify-center gap-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" /> PROVA IL BUZZER QUI SOTTO
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-cyan-300 font-bold bg-[#020712] px-2 py-0.5 rounded-full border border-cyan-500/30">
                <Globe size={11} /> Anche da remoto
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-[#060D1E]/90 p-3 rounded-xl border border-slate-700">
              <div className="bg-[#020712] border border-emerald-400/60 rounded-xl p-2.5 text-center shadow-inner relative overflow-hidden">
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 mb-0.5">
                  <span className="bg-rose-600 text-white px-1.5 py-0.2 rounded font-black">A • INTER</span>
                  <span className="text-emerald-400">REGIA TV SALOTTO</span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">LAUTARO MARTINEZ</h3>
                <div className="my-1 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 py-1 rounded-lg border border-amber-400/40">
                  <span className="text-[9px] text-amber-300 font-bold block uppercase">Offerta Corrente</span>
                  <span className="text-2xl font-black text-amber-400">{heroBid} FM</span>
                </div>
                <p className="text-[10px] text-slate-300 font-bold truncate">
                  In testa: <strong className="text-emerald-300">{heroBidder}</strong>
                </p>
              </div>

              {/* BUZZER CON EFFETTO ORO METALLIZZATO */}
              <div className="flex flex-col items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={handleHeroBuzzerClick}
                  className={`w-28 h-28 rounded-full flex flex-col items-center justify-center gap-0.5 text-slate-950 font-black cursor-pointer select-none transition-transform active:scale-90 ${
                    heroBuzzerPressed
                      ? 'scale-90 bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.9)]'
                      : 'bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 border-4 border-amber-100 shadow-2xl'
                  }`}
                  style={{ animation: heroBuzzerPressed ? 'none' : 'pulseGlowGold 2.2s infinite' }}
                >
                  <Zap size={22} className="fill-slate-950" />
                  <span className="text-sm font-black uppercase tracking-wider">BUZZ!</span>
                  <span className="text-[9px] font-extrabold">+2 FM</span>
                </button>
                <span className="text-[9px] text-slate-400 font-bold text-center">
                  Premi per il suono del rilancio live!
                </span>
              </div>
            </div>

            {/* PULSANTE UNICO AD ALTA CONVERSIONE SENZA DISPERSIONI */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowCustomLeagueModal(true)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 text-slate-950 font-black rounded-xl text-xs md:text-sm uppercase tracking-wider flex flex-col items-center justify-center cursor-pointer shadow-lg transition-transform active:scale-98"
              >
                <span className="flex items-center gap-1.5">
                  <Zap size={16} className="fill-slate-950" /> 🚀 AVVIA SHOW D'ASTA (TEST GRATUITO)
                </span>
                <span className="text-[10px] font-extrabold text-slate-900 tracking-normal normal-case">
                  Nessun account richiesto • Gratis fino a 3 smartphone • Entri in 5 secondi
                </span>
              </button>
            </div>

            <div className="mt-2 bg-[#020712] p-2 rounded-xl border border-cyan-500/30 flex flex-col sm:flex-row items-center gap-2">
              <span className="text-[11px] font-black uppercase text-cyan-300 shrink-0 flex items-center gap-1">
                🔑 CODICE STANZA:
              </span>
              <input
                type="text"
                placeholder="Es. BUZZ2026..."
                value={inputLeagueName}
                onChange={e => { setInputLeagueName(e.target.value); setIsRoomCodeConfirmed(false); }}
                className="w-full flex-1 bg-[#0B1528] border border-slate-700 rounded-lg p-1.5 text-xs text-amber-400 font-black tracking-widest text-center uppercase"
              />
              <button
                type="button"
                onClick={() => {
                  if (inputLeagueName.trim() !== '') {
                    const clean = inputLeagueName.trim().toUpperCase().replace(/\s+/g, '');
                    setRoomCode(clean);
                    setIsRoomCodeConfirmed(true);
                  } else {
                    setCustomAlertMessage('Inserisci il Codice Stanza fornito dal Presidente!');
                  }
                }}
                className="w-full sm:w-auto px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-black text-xs uppercase cursor-pointer shrink-0"
              >
                ENTRA COL TELEFONO
              </button>
            </div>

            {isRoomCodeConfirmed && (
              <div className="space-y-1.5 pt-2 mt-2 border-t border-slate-800 text-left">
                <label className="text-[11px] font-bold text-emerald-400 block uppercase text-center">✅ Stanza Trovata! Scegli la tua Squadra:</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {coaches.map(c => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setPlayerName(c.name);
                        setSelectedRosterCoach(c.name);
                        setCoaches(prev => prev.map(x => x.name === c.name ? { ...x, isOnline: true } : x));
                        if (activeChannel) activeChannel.send({ type: 'broadcast', event: 'player_online', payload: { name: c.name } });
                        setUserRole('PLAYER');
                      }}
                      className="p-2 bg-[#0B132B] border border-slate-800 rounded-lg text-left cursor-pointer hover:border-cyan-400"
                    >
                      <span className="font-extrabold text-amber-400 text-xs block truncate">{c.teamName}</span>
                      <span className="text-[9px] text-slate-300 block truncate">Mister: {c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="max-w-3xl w-full text-center space-y-1 py-2 border-t border-slate-800 text-[11px] text-slate-400 relative z-10 mt-1">
            <div className="flex flex-wrap justify-center gap-4 font-bold text-slate-300">
              <button onClick={() => setActiveLegalSection('TERMS')} className="hover:text-amber-400 cursor-pointer">Termini & Condizioni</button>
              <span>•</span>
              <button onClick={() => setActiveLegalSection('PRIVACY')} className="hover:text-amber-400 cursor-pointer">Privacy (GDPR)</button>
              <span>•</span>
              <button onClick={() => setActiveLegalSection('REFUND')} className="hover:text-amber-400 cursor-pointer">Garanzia 24h</button>
              <span>•</span>
              <button onClick={() => setActiveLegalSection('SUPPORT')} className="hover:text-amber-400 cursor-pointer">Assistenza</button>
            </div>
            <p>FantasyBuzz Live Arena © 2026/2027 • L'Asta del Fantacalcio diventa uno Show TV • Pagamento unico per lega, zero abbonamenti.</p>
          </footer>
        </div>
      ) : (
        <div className="h-screen w-screen font-sans flex flex-col justify-between p-2 select-none overflow-hidden relative z-10 bg-[#030914] text-slate-200">
          
          {userRole === 'PRESIDENT' && (
            <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl px-3 py-1 mb-1 flex items-center justify-between text-[11px] shrink-0">
              {isFreeTestTier ? (
                <span>🟢 <strong className="text-emerald-400">Modalità Test Salotto:</strong> Stanza gratuita attiva ({coaches.length}/3 partecipanti). Rose illimitate per provare TV e Buzzer.</span>
              ) : isLicenseUnlocked ? (
                <span>👑 <strong className="text-amber-400">Lega Ufficiale Sbloccata:</strong> Licenza TV + Buzzer attiva per tutta la stagione ({coaches.length} partecipanti).</span>
              ) : (
                <span>⚠️ <strong className="text-amber-400">Lega Ufficiale ({coaches.length} squadre):</strong> Sblocca la stanza per battezzare i calciatori con tutta la lega.</span>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowWelcomeGuide(true)} className="bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-black px-2 py-0.5 rounded-lg text-[10px] uppercase cursor-pointer flex items-center gap-1"><Info size={11} /> Invita Amici</button>
                {!isFreeTestTier && !isLicenseUnlocked && (
                  <button onClick={() => setShowPaywall(true)} className="bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-[10px] uppercase cursor-pointer">Sblocca Lega (€{currentPackagePrice.toFixed(2)})</button>
                )}
              </div>
            </div>
          )}

          {liveReaction && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 px-6 py-3.5 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce max-w-md w-[92%]">
              <span className="text-5xl shrink-0">{liveReaction.emoji}</span>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 block">📣 SFOTTÒ DA {liveReaction.sender.toUpperCase()}:</span>
                <span className="text-base font-black uppercase text-white">"{liveReaction.label}"</span>
              </div>
            </div>
          )}

          <header className="flex flex-wrap justify-between items-center p-2 px-3 rounded-2xl bg-[#060D1E] border border-cyan-500/30 shrink-0 gap-2 relative">
            <div className="flex items-center gap-3">
              <BuzzMark size={26} />
              <div>
                <h1 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                  FantasyBuzz
                  <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black">
                    {userRole === 'PRESIDENT' ? 'REGIA TV' : getCoachDisplay(playerName)}
                  </span>
                </h1>
              </div>

              {userRole === 'PRESIDENT' && (
                <div className="relative">
                  <button onClick={() => setShowQrModal(true)} className="bg-amber-500/20 border-2 border-amber-400 px-3 py-1 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-amber-500/30 transition-all shadow-md">
                    <QrCode size={15} className="text-amber-400" />
                    <span className="text-xs font-black text-white">MOSTRA QR CODE ({roomCode})</span>
                  </button>
                  {showRoomCodeArrow && (
                    <div onClick={() => setShowRoomCodeArrow(false)} className="absolute top-11 left-0 z-40 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl shadow-2xl border-2 border-white w-60 animate-bounce cursor-pointer">
                      <div className="flex items-center gap-1 font-black text-[10px] uppercase"><ArrowUp size={13} /> <span>Clicca per il QR a tutto schermo!</span></div>
                    </div>
                  )}
                </div>
              )}

              {userRole === 'PRESIDENT' && (
                <div className="flex gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setActiveTab('AUCTION')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'AUCTION' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}><Zap size={12} /> Campo Asta</button>
                  <button onClick={() => setActiveTab('ROSTERS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'ROSTERS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}><Shirt size={12} /> Rose ({totalPurchasesCount})</button>
                  <button onClick={() => setActiveTab('HIGHLIGHTS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'HIGHLIGHTS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}><Award size={12} /> Classifiche</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#0B132B] px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  Server: <strong className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>{isConnected ? 'Online' : 'Offline'}</strong>
                </span>
                {userRole === 'PRESIDENT' && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-amber-300">In Sala: <strong>{coaches.filter(c => c.isOnline !== false).length}/{coaches.length}</strong></span>
                  </>
                )}
              </div>

              {userRole === 'PRESIDENT' && (
                <>
                  <button
                    onClick={() => playMarketBellSound()}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Suona la Campanella del Calciomercato"
                  >
                    <Bell size={13} /> 🔔 Campanella
                  </button>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1 ${voiceEnabled ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}
                  >
                    {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    {voiceEnabled ? '🔊 Audio ON' : '🔇 Muto'}
                  </button>
                  <button onClick={handleShareWhatsAppInvite} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 cursor-pointer"><Share2 size={12} /> WhatsApp</button>
                  {lastAwardHistory && <button onClick={handleUndoLastAward} className="px-2 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 flex items-center gap-1 cursor-pointer"><RotateCcw size={12} /> Annulla</button>}
                  <button onClick={() => setIsPureTvDisplay(!isPureTvDisplay)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 cursor-pointer"><Monitor size={12} /></button>
                </>
              )}
              <button onClick={() => { setUserRole(null); setPlayerName(''); setActiveTab('AUCTION'); }} className="text-xs bg-slate-800 text-slate-400 font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"><LogOut size={12} /></button>
            </div>
          </header>

          {userRole === 'PLAYER' ? (
            <main
              className="flex-1 flex flex-col gap-2 max-w-sm mx-auto w-full my-auto overflow-y-auto items-center justify-between py-2 px-3 rounded-3xl border-2 border-emerald-400/50"
              style={{ background: `radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.34) 0%, rgba(5, 42, 26, 0.96) 75%, rgba(2, 18, 11, 1) 100%), repeating-linear-gradient(90deg, rgba(16, 120, 68, 0.35) 0px, rgba(16, 120, 68, 0.35) 45px, rgba(8, 82, 45, 0.35) 45px, rgba(8, 82, 45, 0.35) 90px)` }}
            >
              <div className="w-full grid grid-cols-2 gap-1.5 bg-[#060D1E]/95 p-1.5 rounded-2xl border border-slate-700 shrink-0">
                <button
                  onClick={() => setMobilePlayerTab('BUZZER')}
                  className={`py-2 rounded-xl font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-1 ${mobilePlayerTab === 'BUZZER' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300'}`}
                >
                  <Zap size={13} /> Buzzer Live
                </button>
                <button
                  onClick={() => setMobilePlayerTab('MY_ROSTER')}
                  className={`py-2 rounded-xl font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-1 ${mobilePlayerTab === 'MY_ROSTER' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300'}`}
                >
                  <Shirt size={13} /> La Mia Rosa ({(purchasedPlayers[playerName] || []).length}/25)
                </button>
              </div>

              {mobilePlayerTab === 'BUZZER' ? (
                <>
                  <div className="text-center w-full bg-[#060D1E]/95 p-3 rounded-2xl border border-slate-700">
                    <div className="flex justify-between text-[10px] font-black mb-1">
                      <span className={`px-2 py-0.5 rounded-full ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role} • {activePlayer.team}</span>
                      <span className="text-amber-400">Budget: {coaches.find(c => c.name === playerName)?.budget || 0} FM (Max: {getCoachMaxBid(playerName)})</span>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase truncate">{activePlayer.name}</h2>
                    <p className="text-xs text-slate-300 mt-0.5">Quotazione Base: <strong className="text-amber-400">{activePlayer.basePrice} FM</strong></p>
                  </div>

                  <div className="w-full bg-[#060D1E]/90 border border-amber-500/40 p-2.5 rounded-2xl text-center">
                    <span className="text-[10px] font-bold uppercase text-amber-400 block">Stato Offerta Corrente</span>
                    <span className="text-sm font-black text-white uppercase">
                      {highestBidder ? `${getCoachDisplay(highestBidder)} → ${currentBid} FM` : `Nessuna offerta (Si parte da ${startingPrice} FM)`}
                    </span>
                  </div>

                  <div className="w-full bg-[#060D1E]/95 border border-slate-700 rounded-3xl p-3 flex flex-col items-center gap-2">
                    <button disabled={highestBidder === playerName} onClick={() => handleRaise(selectedStep)} className={`w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 select-none ${highestBidder === playerName ? 'bg-emerald-900/60 border-4 border-emerald-400 text-emerald-300 cursor-not-allowed' : 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 font-black border-4 border-amber-200 shadow-xl active:translate-y-2 cursor-pointer'}`}>
                      <Zap size={24} /> <span className="text-sm font-black uppercase">{highestBidder === playerName ? 'SEI IN TESTA' : `BUZZ +${selectedStep}`}</span>
                    </button>

                    <div className="w-full grid grid-cols-4 gap-1">
                      {[1, 5, 10, 20].map(s => (
                        <button key={s} onClick={() => setSelectedStep(s)} className={`py-1.5 text-xs font-black rounded-lg border cursor-pointer ${selectedStep === s ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-[#0B132B] border-slate-700 text-white'}`}>+{s}</button>
                      ))}
                    </div>

                    <div className="w-full flex gap-1.5 pt-1 border-t border-slate-800">
                      <input
                        type="number"
                        placeholder="Offerta esatta (es. 45)..."
                        value={customBidInput}
                        onChange={e => setCustomBidInput(e.target.value)}
                        className="flex-1 bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-black text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Number(customBidInput);
                          const base = highestBidder ? currentBid : 0;
                          if (!isNaN(val) && val > base) {
                            handleRaise(val - base);
                            setCustomBidInput('');
                          } else {
                            setCustomAlertMessage(`Inserisci una cifra superiore a ${base} FM!`);
                          }
                        }}
                        className="px-3.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs uppercase cursor-pointer"
                      >
                        Rilancia
                      </button>
                    </div>

                    <div className="w-full pt-1 border-t border-slate-800 space-y-1">
                      <span className="text-[9px] font-black uppercase text-amber-400 block text-center">📣 Sfottò in tempo reale:</span>
                      <div className="grid grid-cols-3 gap-1">
                        {EMOJI_CHOICES.map(item => (
                          <button key={item.name} onClick={() => sendLiveReaction(item.emoji, item.msg)} className="py-1.5 rounded-lg border bg-[#0B132B] hover:bg-slate-800 border-slate-700 flex items-center justify-center gap-1 cursor-pointer active:scale-95">
                            <span className="text-sm leading-none">{item.emoji}</span>
                            <span className="text-[9px] font-bold text-slate-200">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full flex-1 bg-[#060D1E]/95 border border-slate-700 rounded-3xl p-3 flex flex-col gap-2.5 overflow-y-auto text-left">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-xs font-black text-amber-400 uppercase block">{coaches.find(c => c.name === playerName)?.teamName}</span>
                      <span className="text-[10px] text-slate-300">Crediti Residui: <strong>{coaches.find(c => c.name === playerName)?.budget} FM</strong> (Max Bid: {getCoachMaxBid(playerName)})</span>
                    </div>
                  </div>
                  {(['P', 'D', 'C', 'A'] as const).map(role => {
                    const items = (purchasedPlayers[playerName] || []).filter(i => i.player.role === role);
                    const max = ROLE_LIMITS[role];
                    return (
                      <div key={role} className="space-y-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${getRoleBadge(role)}`}>{role} ({items.length}/{max})</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {Array.from({ length: max }).map((_, idx) => items[idx] ? (
                            <div key={idx} className="bg-[#0B132B] border border-slate-800 p-1.5 rounded-lg text-[11px] flex justify-between items-center">
                              <span className="font-bold truncate max-w-[95px]">{items[idx].player.name}</span>
                              <span className="text-amber-400 font-black">{items[idx].price} FM</span>
                            </div>
                          ) : <div key={idx} className="bg-[#0B132B]/30 border border-dashed border-slate-800 p-1.5 rounded-lg text-[9px] text-slate-500 text-center">Slot Libero</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          ) : (
            <>
              {activeTab === 'AUCTION' && (
                <main className="flex-1 flex flex-col lg:flex-row gap-2.5 items-stretch my-1 overflow-y-auto lg:overflow-hidden w-full relative min-h-0">
                  {latestBidAlert && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-5 py-1.5 rounded-2xl shadow-2xl border-2 border-white animate-bounce flex items-center gap-2">
                      <Zap size={16} /> <span className="text-xs uppercase">{getCoachDisplay(latestBidAlert.bidder)}: {latestBidAlert.amount} FM!</span>
                    </div>
                  )}

                  <aside className="w-full lg:w-[275px] shrink-0 bg-[#060D1E] rounded-2xl p-3 flex flex-col gap-2 overflow-hidden border border-cyan-500/30">
                    <div className="flex justify-between pb-1.5 border-b border-cyan-500/20 text-xs font-black text-cyan-400">
                      <span className="flex items-center gap-1"><Trophy size={13} className="text-amber-400" /> Club in Sala</span>
                      <span className="text-[9px] text-amber-300">👆 Clicca = +1 FM</span>
                    </div>

                    <div className="space-y-1.5 overflow-y-auto flex-1">
                      {coaches.map((c, idx) => {
                        const isOnline = c.isOnline !== false;
                        const isHighest = highestBidder === c.name;
                        const isPresident = idx === 0;
                        return (
                          <div
                            key={c.name}
                            onClick={() => { setSelectedWinnerManual(c.name); handleRaise(1, c.name); }}
                            className={`p-2.5 rounded-xl transition-all cursor-pointer ${isHighest ? 'bg-emerald-500/20 border-2 border-emerald-400' : selectedWinnerManual === c.name ? 'bg-amber-500/15 border border-amber-400/60' : 'bg-[#0B132B] border border-slate-800'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="truncate pr-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]' : 'bg-slate-600 opacity-60'}`} title={isOnline ? 'Smartphone Connesso' : 'Offline / In Standby'} />
                                  <span className="font-black text-xs text-white uppercase truncate flex items-center gap-1">
                                    {isPresident && <Crown size={12} className="text-amber-400 shrink-0" />} {c.teamName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold block truncate ml-4">Mister: {c.name}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-amber-400 text-xs block">{c.budget} FM</span>
                                <span className="text-[9px] text-emerald-400 font-bold">Max {getCoachMaxBid(c.name)}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1 mt-1.5 pt-1 border-t border-slate-800 text-[9px] font-bold text-center text-slate-300 ml-4">
                              <span>P:{getCoachRoleCount(c.name, 'P')}/3</span>
                              <span>D:{getCoachRoleCount(c.name, 'D')}/8</span>
                              <span>C:{getCoachRoleCount(c.name, 'C')}/8</span>
                              <span>A:{getCoachRoleCount(c.name, 'A')}/6</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </aside>

                  <section
                    className={`w-full lg:flex-1 shrink-0 min-h-[430px] lg:min-h-0 rounded-2xl p-3 flex flex-col items-center justify-between relative overflow-hidden border-2 ${isBlinking ? 'border-amber-400' : 'border-emerald-400/60'}`}
                    style={{ background: `radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.34) 0%, rgba(5, 46, 28, 0.94) 72%, rgba(2, 22, 13, 1) 100%), repeating-linear-gradient(90deg, rgba(16, 120, 68, 0.42) 0px, rgba(16, 120, 68, 0.42) 55px, rgba(8, 82, 45, 0.42) 55px, rgba(8, 82, 45, 0.42) 110px)` }}
                  >
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-slate-950/90 z-30 flex flex-col items-center justify-center animate-pulse">
                        <span className="font-black text-lg md:text-2xl uppercase text-red-400 tracking-widest mb-2">🚨 ULTIMA CHIAMATA 🚨</span>
                        <div className="text-9xl md:text-[180px] font-black text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.8)] scale-110">
                          {countdown}
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 pointer-events-none opacity-25">
                      <div className="absolute inset-2.5 border-2 border-emerald-100 rounded-xl" />
                      <div className="absolute top-1/2 left-2.5 right-2.5 h-0.5 bg-emerald-100 -translate-y-1/2" />
                      <div className="absolute top-1/2 left-1/2 w-40 h-40 border-2 border-emerald-100 rounded-full -translate-x-1/2 -translate-y-1/2" />
                    </div>

                    <div className="w-full bg-[#060D1E]/95 rounded-xl p-2 flex flex-col gap-2 z-10 border border-slate-700">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="relative flex-1 min-w-[130px]">
                          <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                          <input type="text" placeholder="Cerca nel Listone Ufficiale..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0B132B] rounded-lg py-1 pl-7 pr-2 text-xs text-white" />
                        </div>
                        {[
                          { code: 'ALL', label: 'Tutti' },
                          { code: 'P', label: 'Por' },
                          { code: 'D', label: 'Dif' },
                          { code: 'C', label: 'Cen' },
                          { code: 'A', label: 'Att' },
                        ].map(r => (
                          <button
                            key={r.code}
                            onClick={() => handleRoleFilterChange(r.code as 'ALL' | Role)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${selectedRole === r.code ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-400'}`}
                          >
                            {r.label}
                          </button>
                        ))}
                        <button onClick={handleRandomPlayer} className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"><Shuffle size={12} /> 🎲 Pesca a Sorte</button>
                        <button
                          onClick={() => setActiveLeagueTab(activeLeagueTab === 'REGULAR' ? 'REPAIR' : 'REGULAR')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer border ${activeLeagueTab === 'REPAIR' ? 'bg-emerald-500 text-slate-950 border-emerald-300' : 'bg-[#0B132B] text-emerald-400 border-slate-700'}`}
                          title="Filtra solo i calciatori svincolati per Aste di Riparazione"
                        >
                          {activeLeagueTab === 'REPAIR' ? '🔄 Solo Svincolati (Riparazione)' : '📋 Listone Completo'}
                        </button>
                        <button onClick={() => setStartFromOne(!startFromOne)} className="px-2 py-1 bg-[#0B132B] border border-slate-700 rounded-lg text-[10px] font-bold text-amber-400 cursor-pointer">Base: {startFromOne ? '1 FM' : 'Quotazione'}</button>
                        <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer"><input type="checkbox" checked={hidePurchased} onChange={e => setHidePurchased(e.target.checked)} /> Solo Liberi</label>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto py-1 max-h-12 border-t border-slate-800">
                        {filteredList.slice(0, 80).map(p => (
                          <button key={p.id} onClick={() => handleSelectPlayer(p)} className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${activePlayer.id === p.id ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-300'}`}>[{p.role}] {p.name} ({p.basePrice})</button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto z-10 text-center space-y-1.5">
                      {activeDuel && <div className="bg-rose-600/40 border border-rose-400 px-3 py-0.5 rounded-full text-[10px] font-black uppercase text-rose-100 animate-pulse">🔥 SFIDA: {activeDuel} 🔥</div>}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-100 bg-[#060D1E]/90 px-2.5 py-0.5 rounded-full border border-slate-700"><TeamBadge team={activePlayer.team} size={16} /> <span>{activePlayer.team}</span></div>
                        {activePlayer.basePrice >= 15 && <span className="text-[10px] font-black text-amber-300 bg-amber-500/25 px-2 py-0.5 rounded-full border border-amber-400/50"><Flame size={11} className="inline" /> TOP</span>}
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white uppercase drop-shadow-[0_5px_18px_rgba(0,0,0,0.95)]">{activePlayer.name}</h2>
                      <div className="flex gap-3 text-xs font-bold text-slate-100 bg-slate-950/85 px-4 py-1 rounded-full border border-slate-700">
                        <span>Quotazione: <strong className="text-amber-400">{activePlayer.basePrice} FM</strong></span>
                        <span>•</span>
                        <span>MV: <strong className="text-emerald-400">{activePlayer.mv || '6.00'}</strong></span>
                        <span>•</span>
                        <span>FM: <strong className="text-cyan-400">{activePlayer.fm || '6.00'}</strong></span>
                      </div>
                    </div>

                    <div className="w-full max-w-3xl bg-[#060D1E]/95 p-3 rounded-2xl flex flex-col gap-2 z-10 border border-slate-700">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase block">Società in Testa</span>
                          <p className="text-base text-emerald-400 font-black uppercase">{highestBidder ? getCoachDisplay(highestBidder) : `Si parte da ${startingPrice} FM`}</p>
                        </div>
                        <div className="text-4xl md:text-5xl font-black text-amber-400">{currentBid || startingPrice} <span className="text-lg">FM</span></div>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setCountdown(3); if (activeChannel) activeChannel.send({ type: 'broadcast', event: 'start_countdown', payload: { seconds: 3 } }); }} className="px-3 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer"><Timer size={14} /> 🔔 3s Gong</button>
                          <button onClick={handleNextPlayer} className="px-3 py-2 bg-[#0B132B] hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer border border-slate-700"><SkipForward size={13} /> Salta (A→Z)</button>
                          <button onClick={handleAward} className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer"><Gavel size={15} /> Aggiudica</button>
                        </div>
                      </div>
                      {!isPureTvDisplay && (
                        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <select value={selectedWinnerManual} onChange={e => setSelectedWinnerManual(e.target.value)} className="bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-amber-400">
                            {coaches.map(c => <option key={c.name} value={c.name}>{c.teamName} - {c.name} ({c.budget} FM)</option>)}
                          </select>
                          <div className="flex gap-1.5 flex-1 justify-end">
                            {[1, 5, 10, 20].map(s => (
                              <button key={s} onClick={() => { setSelectedStep(s); handleRaise(s); }} className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#0B132B] text-white border border-slate-700 hover:border-amber-400 cursor-pointer">+{s} FM</button>
                            ))}
                            <input type="number" placeholder="Prezzo" value={manualPriceInput} onChange={e => setManualPriceInput(e.target.value)} className="w-16 bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 text-center" />
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <aside className="hidden lg:flex w-[205px] shrink-0 bg-[#060D1E] rounded-2xl p-3 flex-col gap-2 overflow-hidden border border-cyan-500/30">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1 pb-1.5 border-b border-cyan-500/20"><History size={13} /> Offerte</h3>
                    <div className="space-y-1.5 overflow-y-auto flex-1">
                      {bidHistory.map((item, idx) => (
                        <div key={idx} className="bg-[#0B132B] p-2 rounded-xl flex justify-between text-xs border border-slate-800">
                          <span className="font-bold truncate max-w-[105px]">{getCoachDisplay(item.bidder)}</span>
                          <span className="font-black text-emerald-400">{item.amount} FM</span>
                        </div>
                      ))}
                    </div>
                  </aside>
                </main>
              )}

              {activeTab === 'ROSTERS' && (
                <main className="flex-1 flex flex-col lg:flex-row gap-3 my-1 overflow-y-auto w-full min-h-0">
                  <aside className="w-full lg:w-[260px] bg-[#060D1E] border border-cyan-500/30 rounded-2xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-cyan-400 uppercase">Squadre di Lega</span>
                      <button onClick={handleExportCSV} className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"><Download size={11} /> Excel</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-800 text-center text-xs font-bold">
                      <button onClick={() => setRosterViewMode('GRID')} className={`py-1 rounded-lg cursor-pointer ${rosterViewMode === 'GRID' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>Tabellone</button>
                      <button onClick={() => setRosterViewMode('FIELD')} className={`py-1 rounded-lg cursor-pointer ${rosterViewMode === 'FIELD' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>⚽ Campo 11</button>
                    </div>

                    <div className="space-y-1.5 overflow-y-auto flex-1">
                      {coaches.map(c => (
                        <button key={c.name} onClick={() => setSelectedRosterCoach(c.name)} className={`w-full flex justify-between items-center p-2 rounded-xl border text-left cursor-pointer ${selectedRosterCoach === c.name ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md' : 'bg-[#0B132B] border-slate-800 text-white hover:border-slate-700'}`}>
                          <div className="truncate pr-1">
                            <span className="font-black text-xs block truncate uppercase">{c.teamName}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{c.name}</span>
                          </div>
                          <span className="font-black text-amber-400 text-xs shrink-0">{c.budget} FM</span>
                        </button>
                      ))}
                    </div>
                  </aside>

                  <section className="flex-1 bg-[#060D1E] border border-cyan-500/30 rounded-2xl p-4 overflow-y-auto">
                    {rosterViewMode === 'GRID' ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center bg-[#0B132B] p-3 rounded-2xl border-2 border-slate-800 gap-2">
                          <div>
                            <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                              {coaches.find(x => x.name === selectedRosterCoach)?.teamName}
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                              Mister: <strong className="text-white">{selectedRosterCoach}</strong> • Offerta Max Bid: <strong className="text-emerald-400">{getCoachMaxBid(selectedRosterCoach)} FM</strong> • Residui: <strong className="text-amber-400">{coaches.find(x => x.name === selectedRosterCoach)?.budget} FM</strong>
                            </p>
                          </div>
                          <span className="text-xs font-black bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl uppercase shadow-md">
                            {(purchasedPlayers[selectedRosterCoach] || []).length} / {TOTAL_SLOTS} Calciatori
                          </span>
                        </div>

                        {(['P', 'D', 'C', 'A'] as const).map(role => {
                          const items = (purchasedPlayers[selectedRosterCoach] || []).filter(i => i.player.role === role);
                          const max = ROLE_LIMITS[role];
                          const roleLabel = role === 'P' ? 'Portieri' : role === 'D' ? 'Difensori' : role === 'C' ? 'Centrocampisti' : 'Attaccanti';
                          return (
                            <div key={role} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${getRoleBadge(role)}`}>{role}</span>
                                <span className="text-xs font-bold text-slate-300 uppercase">{roleLabel} ({items.length}/{max})</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
                                {Array.from({ length: max }).map((_, idx) => {
                                  const item = items[idx];
                                  return item ? (
                                    <div key={idx} className="bg-gradient-to-b from-[#0F1E36] to-[#0A1424] border-2 border-amber-400/80 rounded-xl p-2 flex flex-col justify-between shadow-lg relative min-h-[68px]">
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                        <span>#{idx + 1}</span>
                                        <span className="text-slate-300 uppercase truncate max-w-[55px]">{item.player.team}</span>
                                      </div>
                                      <span className="font-black text-xs text-white uppercase truncate my-1" title={item.player.name}>
                                        {item.player.name}
                                      </span>
                                      <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-700/60 font-black">
                                        <span className="text-emerald-400">FM {item.price}</span>
                                        <span className="text-slate-400 text-[9px]">{item.player.mv || '6.0'}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div key={idx} className="bg-[#060D1E]/80 border-2 border-dashed border-slate-700/90 rounded-xl p-2 flex flex-col items-center justify-center min-h-[68px] text-center">
                                      <span className="text-[10px] font-black text-slate-500 uppercase">Slot #{idx + 1}</span>
                                      <span className="text-[11px] font-bold text-slate-400 mt-0.5">Libero</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="w-full h-full min-h-[480px] rounded-2xl p-4 flex flex-col items-center justify-around relative overflow-hidden border-2 border-emerald-400/50 shadow-inner"
                        style={{ background: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.35) 0%, rgba(4, 38, 22, 0.96) 80%, rgba(2, 18, 11, 1) 100%), repeating-linear-gradient(0deg, rgba(16, 120, 68, 0.3) 0px, rgba(16, 120, 68, 0.3) 40px, rgba(8, 80, 42, 0.3) 40px, rgba(8, 80, 42, 0.3) 80px)` }}
                      >
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                          <div className="absolute inset-4 border-2 border-emerald-100 rounded-xl" />
                          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-100 -translate-y-1/2" />
                          <div className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-emerald-100 rounded-full -translate-x-1/2 -translate-y-1/2" />
                        </div>

                        <div className="text-center z-10 bg-slate-950/80 px-4 py-1 rounded-full border border-emerald-500/40">
                          <h3 className="text-sm font-black text-white uppercase">{coaches.find(x => x.name === selectedRosterCoach)?.teamName} • Top 11 in Campo (4-3-3)</h3>
                        </div>

                        <div className="z-10 flex gap-2">
                          {((purchasedPlayers[selectedRosterCoach] || []).filter(i => i.player.role === 'P').slice(0, 1)).map((item, i) => (
                            <div key={i} className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs shadow-lg border border-white text-center">
                              🧤 {item.player.name} <span className="opacity-75">({item.price} FM)</span>
                            </div>
                          ))}
                        </div>

                        <div className="z-10 flex flex-wrap justify-center gap-2">
                          {((purchasedPlayers[selectedRosterCoach] || []).filter(i => i.player.role === 'D').slice(0, 4)).map((item, i) => (
                            <div key={i} className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs shadow-lg border border-white text-center">
                              🛡️ {item.player.name} <span className="opacity-75">({item.price} FM)</span>
                            </div>
                          ))}
                        </div>

                        <div className="z-10 flex flex-wrap justify-center gap-2">
                          {((purchasedPlayers[selectedRosterCoach] || []).filter(i => i.player.role === 'C').slice(0, 3)).map((item, i) => (
                            <div key={i} className="bg-sky-500 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs shadow-lg border border-white text-center">
                              ⚡ {item.player.name} <span className="opacity-75">({item.price} FM)</span>
                            </div>
                          ))}
                        </div>

                        <div className="z-10 flex flex-wrap justify-center gap-2">
                          {((purchasedPlayers[selectedRosterCoach] || []).filter(i => i.player.role === 'A').slice(0, 3)).map((item, i) => (
                            <div key={i} className="bg-rose-600 text-white px-3 py-1.5 rounded-xl font-black text-xs shadow-lg border border-white text-center">
                              ⚽ {item.player.name} <span className="opacity-75">({item.price} FM)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </main>
              )}

              {activeTab === 'HIGHLIGHTS' && (
                <main className="flex-1 flex flex-col gap-3 items-center justify-center p-4 bg-[#060D1E] border border-cyan-500/30 rounded-3xl my-1">
                  <h2 className="text-xl font-black text-white uppercase">🏆 CLASSIFICHE & STATISTICHE 🏆</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl text-center">
                    <div className="bg-[#0B132B] p-3 rounded-xl border border-slate-800"><Award size={20} className="text-amber-400 mx-auto" /><span className="text-[9px] text-slate-400 block">Più Crediti</span><strong className="text-xs">{richestCoach?.teamName} ({richestCoach?.budget} FM)</strong></div>
                    <div className="bg-[#0B132B] p-3 rounded-xl border border-slate-800"><Flame size={20} className="text-emerald-400 mx-auto" /><span className="text-[9px] text-slate-400 block">Più Acquisti</span><strong className="text-xs">{fullestCoach?.teamName} ({fullestCoach?.playersCount})</strong></div>
                    <div className="bg-[#0B132B] p-3 rounded-xl border border-slate-800"><PieChart size={20} className="text-sky-400 mx-auto" /><span className="text-[9px] text-slate-400 block">Totale Speso</span><strong className="text-xs">{coaches.reduce((a, c) => a + (initialBudget - c.budget), 0)} FM</strong></div>
                    <div className="bg-[#0B132B] p-3 rounded-xl border border-slate-800"><TrendingUp size={20} className="text-purple-400 mx-auto" /><span className="text-[9px] text-slate-400 block">Media Prezzo</span><strong className="text-xs">{Math.round(coaches.reduce((a, c) => a + (initialBudget - c.budget), 0) / Math.max(1, totalPurchasesCount))} FM</strong></div>
                  </div>
                </main>
              )}
            </>
          )}

          <div className="w-full bg-[#060D1E] border border-amber-500/40 rounded-xl h-8 flex items-center overflow-hidden shrink-0 shadow-lg mt-0.5">
            <div className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-3 h-full flex items-center gap-1 shrink-0 z-10"><Zap size={12} /> ULTIM'ORA FANTAMERCATO</div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
              <div className="flex whitespace-nowrap gap-10 text-xs font-bold text-slate-200" style={{ animation: 'tickerMarquee 24s linear infinite' }}>
                {[...tickerItems, ...tickerItems].map((item, i) => <span key={i} className="inline-flex items-center gap-2">{item} <span className="text-amber-400">•</span></span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showWelcomeGuide && userRole === 'PRESIDENT' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-center relative shadow-2xl">
            <button onClick={() => setShowWelcomeGuide(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={18} /></button>
            <h3 className="text-xl font-black text-white uppercase">Fai entrare i tuoi amici col Telefono 📱</h3>
            <p className="text-xs text-slate-300">
              Sul divano o a distanza: dagli questo Codice Stanza o inviagli il link WhatsApp:
            </p>
            <div className="bg-[#060D1E] border-2 border-dashed border-amber-400 rounded-2xl p-4 space-y-3">
              <div className="text-3xl font-black text-white tracking-widest bg-[#0B132B] py-2 rounded-xl">{roomCode}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCopyRoomCode} className="py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"><Copy size={13} /> {codeCopied ? 'Copiato! ✅' : 'Copia Codice'}</button>
                <button onClick={handleShareWhatsAppInvite} className="py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"><Share2 size={13} /> Invia WhatsApp</button>
              </div>
            </div>
            <button onClick={() => setShowWelcomeGuide(false)} className="w-full py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">Inizia l'Asta ⚽</button>
          </div>
        </div>
      )}

      {awardModal && awardModal.show && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="fixed inset-0 bg-white pointer-events-none z-50" style={{ animation: 'paparazziFlash 0.65s ease-out forwards' }} />
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full flex flex-col gap-3.5 text-center relative shadow-2xl overflow-hidden">
            <button onClick={handleCloseAwardAndNext} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={18} /></button>
            <div className="flex items-center justify-center gap-2 text-amber-400 text-[10px] font-black uppercase"><FileSignature size={15} /> Lega Fantacalcio • Deposito Contratto</div>
            <div className="bg-[#060D1E] border border-slate-700 rounded-2xl p-4 space-y-2">
              <h2 className="text-3xl font-black text-white uppercase">{awardModal.player.name}</h2>
              <p className="text-xs text-slate-400">Tesserato ufficialmente dalla fanta-società</p>
              <p className="text-xl font-black text-emerald-400 uppercase">{coaches.find(x => x.name === awardModal.winner)?.teamName || awardModal.winner}</p>
              <p className="text-xs text-slate-300">Mister: <strong>{awardModal.winner}</strong> • Prezzo: <strong className="text-amber-400">{awardModal.price} FM</strong></p>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[9px] uppercase text-slate-500 font-bold block">Firma del Calciatore</span>
                <div className="text-2xl text-amber-300 italic font-serif py-1" style={{ animation: 'signContractReveal 0.85s ease-out forwards' }}>{awardModal.player.name}</div>
              </div>
              {(() => {
                const s = getViralStampInfo(awardModal.price, awardModal.player.basePrice, initialBudget);
                return (
                  <div className={`inline-block border-2 ${s.border} px-3 py-1 rounded-lg font-black text-xs uppercase`} style={{ animation: 'stampSlamEffect 0.35s ease-out 0.55s backwards' }}>
                    {s.label}
                  </div>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleShareViralDealWhatsApp} className="py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer">
                <Share2 size={14} /> WhatsApp
              </button>
              <button onClick={handleDownloadSocialCard} className="py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer">
                <Sparkles size={14} /> Card IG / Social
              </button>
            </div>
            <button onClick={handleCloseAwardAndNext} className="w-full py-2.5 bg-[#060D1E] border border-slate-700 text-slate-200 font-black rounded-2xl text-xs uppercase cursor-pointer">Prossimo Calciatore ⏭️</button>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-6 z-50">
          <div className="bg-[#060D1E] border-2 border-cyan-400 rounded-3xl p-8 max-w-lg w-full flex flex-col items-center gap-5 text-center relative shadow-2xl">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={22} /></button>
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-3 py-1 rounded-full text-xs font-black uppercase">Collegamento Rapido Smartphone</span>
            <h3 className="text-3xl font-black text-white uppercase">Inquadra la TV col Telefono 📱</h3>
            <div className="bg-white p-5 rounded-3xl shadow-2xl">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(inviteUrl)}`} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="bg-[#0B132B] border border-amber-400/50 px-6 py-3 rounded-2xl w-full">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Oppure inserisci il Codice Stanza:</span>
              <strong className="text-3xl font-black text-amber-400 tracking-widest">{roomCode}</strong>
            </div>
            <button onClick={handleShareWhatsAppInvite} className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg">
              <Share2 size={16} /> Invia Link nel Gruppo WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* === MODALE CREAZIONE STANZA CON INTEGRAZIONE DIRETTA TIER TEST (0€) vs LEGA UFFICIALE === */}
      {showCustomLeagueModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-amber-500/40 rounded-3xl p-5 max-w-md w-full flex flex-col gap-3 text-center relative max-h-[92vh] overflow-y-auto">
            <button onClick={() => setShowCustomLeagueModal(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={16} /></button>
            <h3 className="text-base font-black text-white uppercase">Crea la tua Lega di Fantacalcio</h3>
            <input type="text" placeholder="Nome della Lega (es. FantaLega 2026)..." value={customLeagueInput} onChange={e => setCustomLeagueInput(e.target.value)} className="w-full bg-[#060D1E] border border-slate-700 rounded-xl p-2.5 text-xs text-amber-400 font-bold text-center" />
            
            <div className="flex items-center justify-between bg-[#060D1E] p-2.5 rounded-xl text-xs border border-slate-800">
              <span className="font-bold text-slate-300">Fantamilioni Iniziali Standard:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="50"
                  max="2000"
                  step="10"
                  value={initialBudget}
                  onChange={e => {
                    const val = Number(e.target.value) || 500;
                    setInitialBudget(val);
                    setCoaches(prev => prev.map(c => ({ ...c, budget: val })));
                  }}
                  className="w-20 bg-[#0B132B] border border-amber-400/60 rounded-lg p-1 text-xs font-black text-amber-400 text-center"
                />
                <span className="text-[10px] text-slate-400 font-bold">FM</span>
              </div>
            </div>

            <div className="space-y-1.5 bg-[#060D1E] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-black uppercase text-cyan-400 block text-left">Aggiungi Fanta-Squadre ({coaches.length}):</span>
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" placeholder="Squadra (es. Real Madrink)" value={newTeamNameInput} onChange={e => setNewTeamNameInput(e.target.value)} className="bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-amber-300" />
                <input type="text" placeholder="Mister (es. Pasquale R.)" value={newCoachInput} onChange={e => setNewCoachInput(e.target.value)} className="bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" />
              </div>
              <button
                onClick={() => {
                  if (!newCoachInput.trim()) return;
                  const cName = newCoachInput.trim();
                  const tName = newTeamNameInput.trim() || `FC ${cName}`;
                  setCoaches(prev => [...prev, { name: cName, teamName: tName, budget: initialBudget, playersCount: 0, isOnline: true }]);
                  setNewCoachInput(''); setNewTeamNameInput('');
                }}
                className="w-full py-1.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <UserPlus size={13} /> Aggiungi alla Lega
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 text-left">
              {coaches.map((c, i) => {
                const isPresident = i === 0;
                const isEditing = editingCoachIdx === i;

                if (isEditing) {
                  return (
                    <div key={i} className="p-2 bg-[#060D1E] border border-cyan-400/70 rounded-xl space-y-1.5">
                      <div className="grid grid-cols-2 gap-1">
                        <input type="text" value={editTeamName} onChange={e => setEditTeamName(e.target.value)} placeholder="Nome Squadra" className="bg-[#0B132B] border border-slate-700 rounded p-1 text-xs text-amber-300" />
                        <input type="text" value={editCoachName} onChange={e => setEditCoachName(e.target.value)} placeholder="Nome Mister" className="bg-[#0B132B] border border-slate-700 rounded p-1 text-xs text-white" />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Crediti:</span>
                        <input type="number" value={editBudgetVal} onChange={e => setEditBudgetVal(Number(e.target.value))} className="w-16 bg-[#0B132B] border border-slate-700 rounded p-1 text-xs text-amber-400 font-bold text-center" />
                        <button
                          type="button"
                          onClick={() => {
                            setCoaches(prev => prev.map((item, idx) => idx === i ? { ...item, name: editCoachName.trim() || item.name, teamName: editTeamName.trim() || item.teamName, budget: editBudgetVal } : item));
                            setEditingCoachIdx(null);
                          }}
                          className="px-2 py-1 bg-emerald-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={12} /> Salva
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={c.name} className={`flex justify-between items-center px-2.5 py-1.5 rounded-xl text-xs border ${isPresident ? 'bg-amber-500/15 border-amber-400/50' : 'bg-[#060D1E] border-slate-800'}`}>
                    <div className="truncate pr-1">
                      <strong>{i + 1}. {c.teamName}</strong> <span className="text-slate-400">({c.name})</span>
                      {isPresident && <span className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black uppercase">👑 Presidente</span>}
                      <span className="ml-2 text-emerald-400 font-bold text-[10px]">{c.budget} FM</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCoachIdx(i);
                          setEditCoachName(c.name);
                          setEditTeamName(c.teamName);
                          setEditBudgetVal(c.budget);
                        }}
                        className="text-amber-400 hover:text-amber-300 p-1 cursor-pointer"
                        title="Modifica squadra e crediti"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoaches(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="Rimuovi"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Badge trasparente sulle condizioni di prezzo in base al numero di squadre */}
            <div className="p-2 rounded-xl text-xs font-bold text-center border bg-[#060D1E]">
              {isFreeTestTier ? (
                <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                  <Sparkles size={13} /> <strong>Modalità Test Salotto:</strong> Gratis al 100% (fino a 3 partecipanti)
                </span>
              ) : (
                <span className="text-amber-300 flex items-center justify-center gap-1.5">
                  <Trophy size={13} /> <strong>Lega Ufficiale ({coaches.length} squadre):</strong> Licenza stagionale a circa 1€ a testa
                </span>
              )}
            </div>

            <button
              onClick={() => {
                if (coaches.length === 0) {
                  setCustomAlertMessage('Aggiungi almeno una squadra alla lega!');
                  return;
                }
                const n = customLeagueInput.trim() || leagueName;
                setLeagueName(n); setRoomCode(n.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'LEGA2026');
                setShowCustomLeagueModal(false); setUserRole('PRESIDENT'); setShowWelcomeGuide(true); setShowRoomCodeArrow(true);
                setSelectedRole('ALL'); setCurrentPlayer(listoneUfficiale[0]);
              }}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-lg"
            >
              {isFreeTestTier ? 'Avvia Stanza Test Gratis (0€) 🚀' : `Avvia Lega Ufficiale (${coaches.length} Squadre) 🏆`}
            </button>
          </div>
        </div>
      )}

      {/* === PAYWALL TRASPARENTE: TABELLONE FISSO 4,99€ VS BUZZER SCALARE === */}
      {showPaywall && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-5 max-w-lg w-full flex flex-col gap-3.5 relative text-center">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={16} /></button>
            <h2 className="text-xl font-black text-white uppercase">Sblocca la tua Lega Ufficiale 🏆</h2>
            <p className="text-xs text-slate-300">
              Pagamento unico per l'intera lega, valido per tutta la stagione 2026/2027 (inclusi i mercati di riparazione). Zero abbonamenti o rinnovi automatici.
            </p>

            <div className="grid grid-cols-2 gap-2.5 text-left">
              <button onClick={() => setSelectedPackage('TV')} className={`p-3 rounded-2xl border-2 cursor-pointer ${selectedPackage === 'TV' ? 'bg-amber-500/15 border-amber-400' : 'bg-[#060D1E] border-slate-800'}`}>
                <span className="text-xs font-black block">🖥️ Solo Tabellone TV</span>
                <span className="text-2xl font-black text-amber-400">€4,99</span>
                <span className="text-[10px] text-slate-400 block">Squadre illimitate • Chiamate a voce</span>
              </button>
              <button onClick={() => setSelectedPackage('LIVE')} className={`p-3 rounded-2xl border-2 cursor-pointer ${selectedPackage === 'LIVE' ? 'bg-emerald-500/15 border-emerald-400' : 'bg-[#060D1E] border-slate-800'}`}>
                <span className="text-xs font-black block">📱 TV + Telefoni Buzzer</span>
                <span className="text-2xl font-black text-emerald-400">€{currentLivePrice.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-300 font-bold block">~ €{perPersonPrice} a testa ({effectiveCoachesCount} squadre)</span>
              </button>
            </div>

            {selectedPackage === 'LIVE' && (
              <div className="bg-[#060D1E] p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-bold">Numero Fanta-Squadre:</span>
                  <strong className="text-amber-400">{effectiveCoachesCount} Partecipanti</strong>
                </div>
                <input
                  type="range"
                  min="4"
                  max="18"
                  value={effectiveCoachesCount}
                  onChange={e => setCustomCoachesCount(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block text-right">4-8: €7,99 • 9-10: €9,99 • Da 11 in su: +€1/squadra</span>
              </div>
            )}

            <div className="bg-[#060D1E] p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              {selectedPackage === 'TV' ? (
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  🖥️ Tabellone TV da studio, contratti con firma e rose stagionali per tutta la lega (offerte a voce)
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5"><Users2 size={15} className="text-amber-400" /> Quota stimata per partecipante:</span>
                  <strong className="text-emerald-400 font-black text-sm">Circa €{perPersonPrice} a testa</strong>
                </>
              )}
            </div>

            <button onClick={() => { setIsLicenseUnlocked(true); setShowPaywall(false); }} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2 shadow-lg">
              <CreditCard size={15} /> Sblocca Ora (€{currentPackagePrice.toFixed(2)} totale lega)
            </button>
          </div>
        </div>
      )}

      {activeLegalSection && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border-2 border-slate-700 rounded-3xl p-6 max-w-lg w-full flex flex-col gap-4 text-left relative max-h-[88vh] overflow-y-auto shadow-2xl">
            <button onClick={() => setActiveLegalSection(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>

            {activeLegalSection === 'TERMS' && (
              <>
                <h3 className="text-lg font-black text-amber-400 uppercase">Termini & Condizioni</h3>
                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <p><strong>1. Servizio:</strong> Web-app per la gestione live delle aste del Fantacalcio con regia su schermo TV e buzzer su dispositivi mobili.</p>
                  <p><strong>2. Modalità Test:</strong> Completamente gratuita fino a 3 partecipanti senza limiti di tempo o rose.</p>
                  <p><strong>3. Pagamento Una Tantum:</strong> Nessun abbonamento né rinnovo automatico. Licenza valida per l'intera stagione d'asta 2026/2027.</p>
                </div>
              </>
            )}

            {activeLegalSection === 'PRIVACY' && (
              <>
                <h3 className="text-lg font-black text-emerald-400 uppercase">Privacy (GDPR UE 2016/679)</h3>
                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <p>Non raccogliamo email né password dai partecipanti invitati. I dati dell'asta sono memorizzati sul dispositivo del Presidente e sincronizzati temporaneamente tramite canali crittografati.</p>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      setCustomAlertMessage('Dati locali cancellati con successo.');
                      setActiveLegalSection(null);
                    }}
                    className="mt-2 px-4 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    🗑️ Cancella dati memorizzati sul dispositivo
                  </button>
                </div>
              </>
            )}

            {activeLegalSection === 'REFUND' && (
              <>
                <h3 className="text-lg font-black text-cyan-400 uppercase">Garanzia Rimborso Entro 24h</h3>
                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <p>Se riscontri qualsiasi problema durante l'asta o il servizio non soddisfa la tua lega, scrivici a <strong>rimborsi@fantasybuzz.app</strong> entro 24 ore per ottenere il rimborso del 100%.</p>
                </div>
              </>
            )}

            {activeLegalSection === 'SUPPORT' && (
              <>
                <h3 className="text-lg font-black text-amber-400 uppercase">Assistenza & Supporto</h3>
                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <p>Email: <strong>supporto@fantasybuzz.app</strong></p>
                  {userRole && <p>Codice Stanza: <strong className="text-amber-400">{roomCode}</strong></p>}
                </div>
              </>
            )}

            <button onClick={() => setActiveLegalSection(null)} className="w-full py-2.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
              Chiudi
            </button>
          </div>
        </div>
      )}

      {customAlertMessage && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3 text-center">
            <AlertCircle size={24} className="text-amber-400 mx-auto" />
            <p className="text-xs text-white font-semibold">{customAlertMessage}</p>
            <button onClick={() => setCustomAlertMessage(null)} className="w-full py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">Capito</button>
          </div>
        </div>
      )}
    </>
  );
}