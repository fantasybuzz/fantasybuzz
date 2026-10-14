import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuctionStore } from './store/useAuctionStore';
import {
  Trophy, Check, Zap, X, SkipForward, History, Users, ShieldCheck, LogOut,
  Share2, Search, Download, Shirt, Play, CreditCard, Tv, Smartphone, Users2,
  Monitor, Timer, Flame, Award, PieChart, AlertCircle, TrendingUp, Gavel,
  RotateCcw, Shuffle, UserPlus, Trash2, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import rawListone from './data/listone.json';
import { supabase } from './supabase';

// --- TIPI E COSTANTI ---
type Role = 'P' | 'D' | 'C' | 'A';

interface Player {
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
}

interface PurchasedItem {
  player: Player;
  price: number;
}

const ROLE_LIMITS: Record<Role, number> = { P: 3, D: 8, C: 8, A: 6 };
const TOTAL_SLOTS = 25; // 3 + 8 + 8 + 6

const listoneUfficiale: Player[] = Array.isArray(rawListone) && rawListone.length > 0
  ? rawListone.map((p: any, idx: number) => ({
      id: String(p?.Id || `player_${idx}`),
      name: p?.Nome || 'Calciatore',
      role: (['P', 'D', 'C', 'A'].includes(p?.R) ? p.R : 'C') as Role,
      team: p?.Squadra || 'Serie A',
      basePrice: Number(p?.Qt?.A) || 1,
      mv: String(p?.Mv || '6.00'),
      fm: String(p?.Fm || '6.00'),
      overall: (Number(p?.Qt?.A) || 1) > 20 ? 88 : (Number(p?.Qt?.A) || 1) > 10 ? 84 : 78,
    }))
  : [
      { id: '1', name: 'Lautaro Martinez', role: 'A', team: 'Inter', basePrice: 38, mv: '6.65', fm: '8.40', overall: 91 },
      { id: '2', name: 'Barella', role: 'C', team: 'Inter', basePrice: 22, mv: '6.45', fm: '7.10', overall: 87 },
      { id: '3', name: 'Buongiorno', role: 'D', team: 'Napoli', basePrice: 16, mv: '6.35', fm: '6.80', overall: 85 },
      { id: '4', name: 'Maignan', role: 'P', team: 'Milan', basePrice: 18, mv: '6.25', fm: '5.40', overall: 86 },
    ];

const TEAM_BADGES = [
  { aliases: ['inter', 'internazionale', 'fc internazionale'], short: 'INT', primary: '#0756a5', secondary: '#101820', ink: '#ffffff' },
  { aliases: ['milan', 'ac milan'], short: 'MIL', primary: '#c81d32', secondary: '#151515', ink: '#ffffff' },
  { aliases: ['juventus', 'juve'], short: 'JUV', primary: '#171717', secondary: '#f4f4f4', ink: '#ffffff' },
  { aliases: ['napoli', 'ssc napoli'], short: 'NAP', primary: '#087fb5', secondary: '#d9f4ff', ink: '#ffffff' },
  { aliases: ['lazio', 'ss lazio'], short: 'LAZ', primary: '#77b8dd', secondary: '#f6f7f8', ink: '#102743' },
  { aliases: ['roma', 'as roma'], short: 'ROM', primary: '#8d1830', secondary: '#f2a51a', ink: '#ffffff' },
  { aliases: ['atalanta'], short: 'ATA', primary: '#13295d', secondary: '#101010', ink: '#ffffff' },
  { aliases: ['udinese'], short: 'UDI', primary: '#171717', secondary: '#f3d52d', ink: '#ffffff' },
  { aliases: ['torino', 'torino fc'], short: 'TOR', primary: '#7e1c2a', secondary: '#f2e6e4', ink: '#ffffff' },
  { aliases: ['fiorentina'], short: 'FIO', primary: '#563184', secondary: '#f5f2f8', ink: '#ffffff' },
  { aliases: ['bologna'], short: 'BOL', primary: '#153f83', secondary: '#c72439', ink: '#ffffff' },
  { aliases: ['lecce'], short: 'LEC', primary: '#c42a35', secondary: '#e4c326', ink: '#ffffff' },
  { aliases: ['genoa', 'genoacfc'], short: 'GEN', primary: '#b21f34', secondary: '#193e69', ink: '#ffffff' },
  { aliases: ['cagliari', 'cagliari calcio'], short: 'CAG', primary: '#bd2637', secondary: '#16477c', ink: '#ffffff' },
  { aliases: ['parma'], short: 'PAR', primary: '#19519a', secondary: '#f2d12a', ink: '#ffffff' },
  { aliases: ['como', 'como 1907'], short: 'COM', primary: '#2187ae', secondary: '#f2f7fa', ink: '#ffffff' },
  { aliases: ['verona', 'hellas verona'], short: 'VER', primary: '#f0c928', secondary: '#1e4e9b', ink: '#17213a' },
  { aliases: ['empoli'], short: 'EMP', primary: '#1475b8', secondary: '#f4f8fb', ink: '#ffffff' },
  { aliases: ['monza'], short: 'MON', primary: '#c5223c', secondary: '#f4f4f4', ink: '#ffffff' },
  { aliases: ['venezia'], short: 'VEN', primary: '#171717', secondary: '#bd2639', ink: '#ffffff' },
  { aliases: ['sassuolo'], short: 'SAS', primary: '#087448', secondary: '#111111', ink: '#ffffff' },
  { aliases: ['pisa', 'pisa sc'], short: 'PIS', primary: '#1455a0', secondary: '#171717', ink: '#ffffff' },
  { aliases: ['cremonese', 'cremonese us'], short: 'CRE', primary: '#c92336', secondary: '#f2f2f2', ink: '#ffffff' },
] as const;

type TeamBadgeStyle = { short: string; primary: string; secondary: string; ink: string };

const normalizeTeamName = (team: unknown) =>
  String(team || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getTeamBadgeStyle = (team: unknown): TeamBadgeStyle => {
  const normalized = normalizeTeamName(team);
  const match = TEAM_BADGES.find(entry =>
    entry.aliases.some(alias => {
      const key = normalizeTeamName(alias);
      return normalized === key || normalized.includes(` ${key}`) || normalized.startsWith(`${key} `);
    })
  );
  if (match) return match;
  const words = normalized.split(' ').filter(w => !['fc', 'ac', 'as', 'ss', 'us', 'calcio'].includes(w));
  const short = words.slice(0, 2).map(w => w.slice(0, 1).toUpperCase()).join('') || 'FC';
  return { short, primary: '#1e293b', secondary: '#fbbf24', ink: '#ffffff' };
};

// --- SINGLETON AUDIO ENGINE ---
let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext | null => {
  try {
    if (!sharedAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch (e) {
    console.error('Web Audio API non supportata:', e);
    return null;
  }
};

const playBuzzSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.28);
};

const playGongSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 1.1);
  gain.gain.setValueAtTime(0.45, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 1.1);
};

const playTickSound = (isUrgent = false) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = isUrgent ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(isUrgent ? 1200 : 600, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

const playWinSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + idx * 0.08);
    osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
  });
};

// --- COMPONENTI GRAFICI ---
const BuzzMark = ({ size = 32 }: { size?: number }) => (
  <span className="inline-flex shrink-0 items-center justify-center drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" style={{ width: size, height: size }}>
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <path d="M13 2h22l11 11v22L35 46H13L2 35V13Z" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
      <path d="M27 7 14 26h9l-3 15 15-21h-9l4-13Z" fill="#0B132B" />
    </svg>
  </span>
);

const TeamBadge = ({ team, size = 30 }: { team: string; size?: number }) => {
  const badge = getTeamBadgeStyle(team);
  return (
    <span className="inline-flex shrink-0 items-center justify-center drop-shadow-md">
      <svg width={size} height={size * 1.16} viewBox="0 0 48 56">
        <path d="M24 2 L44 9 L42 29 C41 40 34 48 24 54 C14 48 7 40 6 29 L4 9 Z" fill={badge.primary} stroke="#F59E0B" strokeWidth="2.2" />
        <path d="M7 11 L41 11 L40 19 L8 19 Z" fill={badge.secondary} opacity=".96" />
        <path d="M10 23 L38 23" stroke={badge.secondary} strokeWidth="1.5" opacity=".82" />
        <text x="24" y="36" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize={badge.short.length > 2 ? 9 : 12} letterSpacing=".2" fill={badge.ink} stroke="rgba(0,0,0,.32)" strokeWidth=".5" paintOrder="stroke">{badge.short}</text>
        <path d="M26 39 L20 46 H24 L22 51 L30 42 H26 L29 39 Z" fill="#F59E0B" />
      </svg>
    </span>
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
  ctx.lineWidth = Math.max(2, width * 0.045);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(12, width * (badge.short.length > 2 ? 0.19 : 0.23))}px system-ui, sans-serif`;
  ctx.fillStyle = badge.ink;
  ctx.fillText(badge.short, x + width * 0.5, y + height * 0.61, width * 0.72);
  ctx.restore();
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'P': return 'bg-amber-500 text-slate-950';
    case 'D': return 'bg-emerald-500 text-slate-950';
    case 'C': return 'bg-sky-500 text-slate-950';
    case 'A': return 'bg-rose-600 text-white';
    default: return 'bg-slate-700 text-white';
  }
};

export default function App() {
  const { currentPlayer, currentBid, highestBidder, placeBid, setCurrentPlayer } = useAuctionStore();

  // --- STATI FILTRI E UI ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | Role>('ALL');
  const [hidePurchased, setHidePurchased] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [bidHistory, setBidHistory] = useState<{ bidder: string; amount: number; time: string }[]>([]);
  const [latestBidAlert, setLatestBidAlert] = useState<{ bidder: string; amount: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [displayBid, setDisplayBid] = useState(currentBid);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [isPureTvDisplay, setIsPureTvDisplay] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);

  // Reazioni Live Virali ("Trash Talk")
  const [liveReaction, setLiveReaction] = useState<{ sender: string; emoji: string; label: string } | null>(null);

  // Input Manuali Modalità TV
  const [manualPriceInput, setManualPriceInput] = useState<string>('');
  const [selectedWinnerManual, setSelectedWinnerManual] = useState<string>('');

  // Creazione Lega & Demo
  const [showCustomLeagueModal, setShowCustomLeagueModal] = useState(false);
  const [customLeagueInput, setCustomLeagueInput] = useState('');
  const [newCoachInput, setNewCoachInput] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoAuctionCount, setDemoAuctionCount] = useState(0);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoRoleChoice, setDemoRoleChoice] = useState<'PRESIDENT' | 'PLAYER'>('PRESIDENT');
  const [demoName1, setDemoName1] = useState('Presidente (Tu)');
  const [demoName2, setDemoName2] = useState('Pasquale');
  const [demoName3, setDemoName3] = useState('Gianni');

  // Paywall & Pacchetti
  const [showPaywall, setShowPaywall] = useState(false);
  const [activePackage, setActivePackage] = useState<'TV' | 'LIVE'>('LIVE');
  const [selectedPackage, setSelectedPackage] = useState<'TV' | 'LIVE'>('LIVE');
  const [paymentType, setPaymentType] = useState<'SINGLE' | 'SPLIT'>('SINGLE');
  const [coachesCount, setCoachesCount] = useState(8);
  const [selectedStep, setSelectedStep] = useState<number>(1);

  // Navigazione e Dati Lega (con Ripristino da LocalStorage)
  const [activeTab, setActiveTab] = useState<'AUCTION' | 'ROSTERS' | 'HIGHLIGHTS'>('AUCTION');
  const [userRole, setUserRole] = useState<'PRESIDENT' | 'PLAYER' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [inputLeagueName, setInputLeagueName] = useState('');
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('fb_roomCode') || 'BUZZ2026');
  const [isRoomCodeConfirmed, setIsRoomCodeConfirmed] = useState(false);

  const [initialBudget, setInitialBudget] = useState<number>(() => Number(localStorage.getItem('fb_initialBudget')) || 500);
  const [leagueName, setLeagueName] = useState(() => localStorage.getItem('fb_leagueName') || 'FantaLega Serie A');

  const [coaches, setCoaches] = useState<Coach[]>(() => {
    const saved = localStorage.getItem('fb_coaches');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { name: 'Presidente (Tu)', teamName: 'Real Presidente', budget: 500, playersCount: 0 },
      { name: 'Pasquale', teamName: 'FC Vesuvio', budget: 500, playersCount: 0 },
      { name: 'Gianni', teamName: 'Spartak Gianni', budget: 500, playersCount: 0 },
    ];
  });

  const [purchasedPlayers, setPurchasedPlayers] = useState<Record<string, PurchasedItem[]>>(() => {
    const saved = localStorage.getItem('fb_purchasedPlayers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {};
  });

  const [selectedRosterCoach, setSelectedRosterCoach] = useState<string>(coaches[0]?.name || 'Presidente (Tu)');
  const [awardModal, setAwardModal] = useState<{ show: boolean; player: Player; winner: string; price: number } | null>(null);
  const [lastAwardHistory, setLastAwardHistory] = useState<{ player: Player; winner: string; price: number } | null>(null);

  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Salvataggio automatico in LocalStorage
  useEffect(() => {
    if (!isDemoMode) {
      localStorage.setItem('fb_coaches', JSON.stringify(coaches));
      localStorage.setItem('fb_purchasedPlayers', JSON.stringify(purchasedPlayers));
      localStorage.setItem('fb_leagueName', leagueName);
      localStorage.setItem('fb_roomCode', roomCode);
      localStorage.setItem('fb_initialBudget', String(initialBudget));
    }
  }, [coaches, purchasedPlayers, leagueName, roomCode, initialBudget, isDemoMode]);

  // Controllo URL ?room=CODICE per accesso rapido da link/QR
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const clean = roomParam.trim().toUpperCase();
      setInputLeagueName(clean);
      setRoomCode(clean);
      setIsRoomCodeConfirmed(true);
    }
  }, []);

  // --- LOGICA FANTACALCIO: GIOCATORI GIA' ACQUISTATI E MAX BID ---
  const purchasedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(purchasedPlayers).forEach(list => {
      list.forEach(item => ids.add(item.player.id));
    });
    return ids;
  }, [purchasedPlayers]);

  // Calcola la puntata massima consentita per un allenatore (Budget - slot vuoti rimanenti)
  const getCoachMaxBid = useCallback((coachName: string) => {
    const coach = coaches.find(c => c.name === coachName);
    if (!coach) return 0;
    const remainingSlotsAfterThis = Math.max(0, TOTAL_SLOTS - coach.playersCount - 1);
    return Math.max(0, coach.budget - remainingSlotsAfterThis);
  }, [coaches]);

  const filteredList = useMemo(() => {
    return listoneUfficiale
      .filter(p => {
        if (hidePurchased && purchasedPlayerIds.has(p.id)) return false;
        if (selectedRole !== 'ALL' && p.role !== selectedRole) return false;
        return p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.team.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => b.basePrice - a.basePrice || a.name.localeCompare(b.name));
  }, [selectedRole, searchTerm, hidePurchased, purchasedPlayerIds]);

  const activePlayer: Player = currentPlayer || filteredList[0] || listoneUfficiale[0];
  const isTopPlayer = activePlayer.basePrice >= 15;

  // --- GESTIONE RILANCI E SINCRONIZZAZIONE ---
  const registerBidLocally = useCallback((bidder: string, amount: number) => {
    playBuzzSound();
    setIsBlinking(true);
    setCountdown(null);
    setTimeout(() => setIsBlinking(false), 300);

    placeBid(bidder, amount);

    setLatestBidAlert({ bidder, amount });
    setTimeout(() => setLatestBidAlert(null), 2500);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBidHistory(prev => [{ bidder, amount, time: timeStr }, ...prev]);
  }, [placeBid]);

  const applyAwardState = useCallback((player: Player, winnerName: string, finalPrice: number) => {
    playWinSound();
    try {
      confetti({
        particleCount: 130,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10b981', '#3b82f6', '#ec4899', '#ffffff']
      });
    } catch (e) { console.error(e); }

    setCoaches(prev => prev.map(c =>
      c.name === winnerName
        ? { ...c, budget: c.budget - finalPrice, playersCount: c.playersCount + 1 }
        : c
    ));
    setPurchasedPlayers(prev => ({
      ...prev,
      [winnerName]: [...(prev[winnerName] || []), { player, price: finalPrice }]
    }));
    setLastAwardHistory({ player, winner: winnerName, price: finalPrice });
    setAwardModal({ show: true, player, winner: winnerName, price: finalPrice });
    setCountdown(null);
  }, []);

  // Refs per evitare stale closures dentro il canale Supabase
  const stateRef = useRef({ coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole });
  useEffect(() => {
    stateRef.current = { coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole };
  }, [coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole]);

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room_${roomCode}`)
      .on('broadcast', { event: 'quick_bid' }, ({ payload }: any) => {
        if (payload?.bidder && payload?.amount) {
          registerBidLocally(payload.bidder, payload.amount);
        }
      })
      .on('broadcast', { event: 'start_countdown' }, ({ payload }: any) => {
        setCountdown(payload?.seconds || 3);
      })
      .on('broadcast', { event: 'change_player' }, ({ payload }: any) => {
        if (payload?.player) {
          setCurrentPlayer(payload.player as any);
          setBidHistory([]);
          setManualPriceInput('');
          setCountdown(null);
          setLatestBidAlert(null);
          setAwardModal(null);
        }
      })
      .on('broadcast', { event: 'player_awarded' }, ({ payload }: any) => {
        if (payload?.player && payload?.winner !== undefined) {
          applyAwardState(payload.player, payload.winner, payload.price);
        }
      })
      .on('broadcast', { event: 'sync_league_state' }, ({ payload }: any) => {
        if (payload?.coaches) setCoaches(payload.coaches);
        if (payload?.purchasedPlayers) setPurchasedPlayers(payload.purchasedPlayers);
      })
      .on('broadcast', { event: 'live_reaction' }, ({ payload }: any) => {
        if (payload?.sender && payload?.emoji) {
          setLiveReaction(payload);
          setTimeout(() => setLiveReaction(null), 3000);
        }
      })
      .on('broadcast', { event: 'request_sync' }, () => {
        if (stateRef.current.userRole === 'PRESIDENT') {
          channel.send({
            type: 'broadcast',
            event: 'sync_league_state',
            payload: {
              coaches: stateRef.current.coaches,
              purchasedPlayers: stateRef.current.purchasedPlayers,
            }
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setActiveChannel(channel);
          setIsConnected(true);
          channel.send({ type: 'broadcast', event: 'request_sync', payload: {} });
        } else {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setActiveChannel(null);
      setIsConnected(false);
    };
  }, [roomCode, registerBidLocally, setCurrentPlayer, applyAwardState]);

  // Effetto Slot Machine sul numero dell'offerta
  useEffect(() => {
    if (currentBid !== displayBid) {
      setIsSlotSpinning(true);
      const timer = setTimeout(() => {
        setDisplayBid(currentBid);
        setIsSlotSpinning(false);
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [currentBid, displayBid]);

  // Gestione Azioni Asta
  const handleSelectPlayer = useCallback(async (player: Player) => {
    setCurrentPlayer(player as any);
    setBidHistory([]);
    setManualPriceInput('');
    setCountdown(null);
    setLatestBidAlert(null);
    setAwardModal(null);

    if (activeChannel) {
      try {
        await activeChannel.send({
          type: 'broadcast',
          event: 'change_player',
          payload: { player },
        });
      } catch (e) { console.error('Errore sync giocatore', e); }
    }
  }, [activeChannel, setCurrentPlayer]);

  // Estrazione Random ("Modalità Urna")
  const handleRandomPlayer = () => {
    if (filteredList.length === 0) {
      setCustomAlertMessage('Nessun calciatore disponibile con i filtri attuali!');
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredList.length);
    handleSelectPlayer(filteredList[randomIndex]);
  };

  const handleRaise = useCallback(async (stepVal: number) => {
    if (awardModal?.show) return;

    const activeName = userRole === 'PRESIDENT' ? coaches[0]?.name : playerName;
    if (!activeName) return;

    // Evita l'auto-rilancio se sei già il miglior offerente (escluso il Presidente in regia)
    if (userRole === 'PLAYER' && highestBidder === activeName) {
      setCustomAlertMessage('Sei già il miglior offerente! Attendi i rilanci avversari.');
      return;
    }

    const nuovaOfferta = highestBidder ? currentBid + stepVal : Math.max(activePlayer.basePrice, stepVal);

    // Verifica Puntata Massima (Max Bid) e Limiti Ruolo
    if (!isDemoMode) {
      const maxAllowed = getCoachMaxBid(activeName);
      if (nuovaOfferta > maxAllowed) {
        setCustomAlertMessage(`Offerta bloccata! La puntata massima per ${activeName} è ${maxAllowed} FM (devi conservare 1 FM per ogni slot vuoto).`);
        return;
      }
      const coachRoster = purchasedPlayers[activeName] || [];
      const roleCount = coachRoster.filter(p => p.player.role === activePlayer.role).length;
      if (roleCount >= ROLE_LIMITS[activePlayer.role]) {
        setCustomAlertMessage(`${activeName} ha già completato gli slot per il ruolo ${activePlayer.role} (${ROLE_LIMITS[activePlayer.role]})!`);
        return;
      }
    }

    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);

    registerBidLocally(activeName, nuovaOfferta);

    if (activeChannel) {
      try {
        await activeChannel.send({
          type: 'broadcast',
          event: 'quick_bid',
          payload: { bidder: activeName, amount: nuovaOfferta }
        });
      } catch (err) { console.error('Errore broadcast', err); }
    }
  }, [awardModal, userRole, coaches, playerName, highestBidder, currentBid, activePlayer, isDemoMode, getCoachMaxBid, purchasedPlayers, registerBidLocally, activeChannel]);

  const handleAward = useCallback(async () => {
    let finalPrice = currentBid > 0 ? currentBid : activePlayer.basePrice;
    let winnerName = highestBidder || coaches[0]?.name;

    if (activePackage === 'TV' && !isDemoMode) {
      if (manualPriceInput && !isNaN(Number(manualPriceInput))) {
        finalPrice = Number(manualPriceInput);
      }
      if (selectedWinnerManual) {
        winnerName = selectedWinnerManual;
      }
    }

    const coachRoster = purchasedPlayers[winnerName] || [];
    const currentRoleCount = coachRoster.filter(p => p.player.role === activePlayer.role).length;
    const maxRoleLimit = ROLE_LIMITS[activePlayer.role] || 8;

    if (!isDemoMode) {
      if (currentRoleCount >= maxRoleLimit) {
        setCustomAlertMessage(`Blocco Acquisto: ${winnerName} ha già raggiunto il limite di ${maxRoleLimit} per il ruolo ${activePlayer.role}!`);
        return;
      }
      const maxAllowed = getCoachMaxBid(winnerName);
      if (finalPrice > maxAllowed) {
        setCustomAlertMessage(`Blocco Budget: ${winnerName} può spendere al massimo ${maxAllowed} FM!`);
        return;
      }
    }

    if (isDemoMode) setDemoAuctionCount(prev => prev + 1);

    applyAwardState(activePlayer, winnerName, finalPrice);

    if (activeChannel) {
      try {
        await activeChannel.send({
          type: 'broadcast',
          event: 'player_awarded',
          payload: { player: activePlayer, winner: winnerName, price: finalPrice },
        });
      } catch (e) { console.error('Errore sync aggiudicazione', e); }
    }
  }, [currentBid, activePlayer, highestBidder, coaches, activePackage, isDemoMode, manualPriceInput, selectedWinnerManual, purchasedPlayers, getCoachMaxBid, applyAwardState, activeChannel]);

  // Funzione ANNULLA ULTIMO ACQUISTO (Undo)
  const handleUndoLastAward = async () => {
    if (!lastAwardHistory) return;
    const { player, winner, price } = lastAwardHistory;

    const updatedCoaches = coaches.map(c =>
      c.name === winner ? { ...c, budget: c.budget + price, playersCount: Math.max(0, c.playersCount - 1) } : c
    );
    const updatedPurchased = {
      ...purchasedPlayers,
      [winner]: (purchasedPlayers[winner] || []).filter(item => item.player.id !== player.id)
    };

    setCoaches(updatedCoaches);
    setPurchasedPlayers(updatedPurchased);
    setLastAwardHistory(null);
    setAwardModal(null);
    setCustomAlertMessage(`Acquisto di ${player.name} (${winner}) annullato! Crediti ripristinati.`);

    if (activeChannel) {
      await activeChannel.send({
        type: 'broadcast',
        event: 'sync_league_state',
        payload: { coaches: updatedCoaches, purchasedPlayers: updatedPurchased }
      });
    }
  };

  // Invio Reazione "Trash Talk" dallo Smartphone alla TV
  const sendLiveReaction = async (emoji: string, label: string) => {
    const sender = userRole === 'PRESIDENT' ? 'Il Presidente' : playerName;
    const payload = { sender, emoji, label };
    setLiveReaction(payload);
    setTimeout(() => setLiveReaction(null), 3000);
    if (activeChannel) {
      await activeChannel.send({ type: 'broadcast', event: 'live_reaction', payload });
    }
  };

  // Timer Gong 3 Secondi
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      if (countdown === 3) playGongSound();
      else playTickSound(countdown <= 2);

      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      if (userRole === 'PRESIDENT') {
        handleAward();
      }
    }
  }, [countdown, userRole, handleAward]);

  // Scorciatoie da Tastiera per il Presidente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (userRole !== 'PRESIDENT' || activeTab !== 'AUCTION' || awardModal?.show) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === '1') { setSelectedStep(1); handleRaise(1); }
      else if (e.key === '5') { setSelectedStep(5); handleRaise(5); }
      else if (e.key === '0') { setSelectedStep(10); handleRaise(10); }
      else if (e.key === '2') { setSelectedStep(20); handleRaise(20); }
      else if (e.key === ' ') { e.preventDefault(); handleRaise(selectedStep); }
      else if (e.key === 'Enter') { e.preventDefault(); handleAward(); }
      else if (e.key === 'r' || e.key === 'R') { handleRandomPlayer(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userRole, activeTab, awardModal, selectedStep, handleRaise, handleAward]);

  const startGongTimer = async (seconds = 3) => {
    setCountdown(seconds);
    if (activeChannel) {
      try {
        await activeChannel.send({ type: 'broadcast', event: 'start_countdown', payload: { seconds } });
      } catch (e) { console.error(e); }
    }
  };

  const handleNextPlayer = () => {
    if (filteredList.length === 0) return;
    const currentIndex = filteredList.findIndex(p => p.id === activePlayer.id);
    const nextPlayer = filteredList[(currentIndex + 1) % filteredList.length] || listoneUfficiale[0];
    handleSelectPlayer(nextPlayer);
  };

  // --- GENERATORE SOCIAL CARD VIRALE (CON TIMBRO ROAST / SFOTTO') ---
  const handleDownloadSocialCard = async () => {
    if (!awardModal) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const winnerCoach = coaches.find(c => c.name === awardModal.winner);
    const roleColors: Record<string, string> = { P: '#f59e0b', D: '#10b981', C: '#38bdf8', A: '#f43f5e' };
    const roleColor = roleColors[awardModal.player.role] || '#10b981';

    // Calcolo Timbro Virale in base al prezzo pagato vs quotazione base
    const ratio = awardModal.price / Math.max(1, awardModal.player.basePrice);
    let viralStamp = 'ACQUISTO UFFICIALE ✅';
    let stampColor = '#10b981';
    if (awardModal.price === 1 && awardModal.player.basePrice >= 5) {
      viralStamp = 'FURTO CON SCASSO 🥷';
      stampColor = '#38bdf8';
    } else if (awardModal.price >= initialBudget * 0.35 || ratio >= 4.5) {
      viralStamp = 'FOLLIA PURA • SVENATO 💸';
      stampColor = '#f43f5e';
    } else if (awardModal.player.basePrice >= 20 && awardModal.price >= 80) {
      viralStamp = 'COLPO DA NOVANTA 👑';
      stampColor = '#f59e0b';
    } else if (awardModal.price < awardModal.player.basePrice) {
      viralStamp = 'AFFARE LOW COST 🔥';
      stampColor = '#10b981';
    }

    const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };

    const fittedText = (text: string, x: number, y: number, maxWidth: number, maxSize: number, minSize = 32, weight = 900, color = '#ffffff') => {
      let size = maxSize;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      while (size > minSize) {
        ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
        if (ctx.measureText(text).width <= maxWidth) break;
        size -= 2;
      }
      ctx.fillText(text, x, y, maxWidth);
    };

    // Sfondo Stadium
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#021B12');
    bg.addColorStop(0.55, '#062E1E');
    bg.addColorStop(1, '#021B12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    roundedRect(34, 34, W - 68, H - 68, 38);
    ctx.stroke();

    fittedText('FANTASYBUZZ LIVE ARENA', 540, 160, 880, 52, 40, 900, '#ffffff');
    fittedText(String(leagueName || 'LA TUA LEGA').toUpperCase(), 540, 225, 820, 28, 20, 800, '#F59E0B');

    // Badge Virale Dinamico
    roundedRect(220, 290, 640, 76, 38);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    fittedText(viralStamp, 540, 329, 590, 32, 22, 900, stampColor);

    // Box Calciatore
    const cardX = 100, cardY = 420, cardW = 880, cardH = 620;
    roundedRect(cardX, cardY, cardW, cardH, 42);
    ctx.fillStyle = '#0B132B';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.stroke();

    roundedRect(148, 470, 112, 64, 20);
    ctx.fillStyle = roleColor;
    ctx.fill();
    fittedText(awardModal.player.role, 204, 502, 90, 33, 30, 900, '#0B132B');
    drawTeamBadgeOnCanvas(ctx, awardModal.player.team, 612, 465, 60);
    fittedText(String(awardModal.player.team || '').toUpperCase(), 814, 502, 286, 24, 18, 800, '#d4e5dc');

    ctx.beginPath();
    ctx.arc(540, 700, 115, 0, Math.PI * 2);
    ctx.fillStyle = '#060D1E';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.stroke();
    fittedText(String(awardModal.player.name || '?').trim().charAt(0).toUpperCase(), 540, 700, 180, 110, 72, 900, '#F59E0B');

    fittedText(String(awardModal.player.name).toUpperCase(), 540, 895, 780, 62, 38, 900, '#ffffff');
    fittedText(`QUOTAZIONE BASE: ${awardModal.player.basePrice} FM  •  FVM: ${awardModal.player.fm || '6.00'}`, 540, 965, 750, 24, 20, 700, '#94A3B8');

    fittedText('PAGATO BEN', 540, 1130, 700, 28, 24, 800, '#94A3B8');
    fittedText(`${awardModal.price} FM`, 540, 1260, 820, 140, 82, 900, '#F59E0B');

    roundedRect(120, 1420, 840, 210, 32);
    ctx.fillStyle = '#0B132B';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();
    fittedText('ACQUISTATO DA', 540, 1470, 760, 24, 20, 800, '#94A3B8');
    fittedText(String(awardModal.winner).toUpperCase(), 540, 1530, 760, 46, 30, 900, '#10b981');
    if (winnerCoach) {
      fittedText(`${winnerCoach.teamName.toUpperCase()} (RESIDUI: ${winnerCoach.budget} FM)`, 540, 1585, 760, 24, 18, 700, '#CBD5E1');
    }

    fittedText('SFIDA I TUOI AMICI SU FANTASYBUZZ LIVE ARENA', 540, 1770, 880, 26, 20, 900, '#F59E0B');

    const fileName = `FantasyBuzz_${awardModal.player.name.replace(/\s+/g, '_')}.png`;
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Colpo d'asta: ${awardModal.player.name}`,
          text: `${awardModal.player.name} preso da ${awardModal.winner} per ${awardModal.price} FM! (${viralStamp})`
        });
        return;
      } catch (e) { console.error(e); }
    }

    const link = document.createElement('a');
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleShareWhatsAppInvite = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    const text = `⚽ Entra nel vivo dell'asta per la lega *${leagueName}*!\n\n📲 Clicca qui per aprire il tuo Buzzer Smartphone:\n${inviteUrl}\n\n🔑 Codice Stanza: *${roomCode}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,Allenatore,Squadra Lega,Calciatore,Ruolo,Squadra Serie A,Prezzo Pagato\n';
    coaches.forEach(c => {
      (purchasedPlayers[c.name] || []).forEach(item => {
        csvContent += `"${c.name}","${c.teamName}","${item.player.name}","${item.player.role}","${item.player.team}",${item.price}\n`;
      });
    });
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Rose_${leagueName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLaunchDemo = () => {
    setIsDemoMode(true);
    setActivePackage('LIVE');
    const uniqueDemoId = `DEMO_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setRoomCode(uniqueDemoId);
    setLeagueName('Lega Demo (3 Partecipanti)');
    setDemoAuctionCount(0);

    const c1 = demoName1.trim() || 'Presidente';
    const c2 = demoName2.trim() || 'Pasquale';
    const c3 = demoName3.trim() || 'Gianni';

    setCoaches([
      { name: c1, teamName: `FC ${c1}`, budget: 500, playersCount: 0 },
      { name: c2, teamName: `FC ${c2}`, budget: 500, playersCount: 0 },
      { name: c3, teamName: `FC ${c3}`, budget: 500, playersCount: 0 },
    ]);
    setPurchasedPlayers({});
    setCoachesCount(3);

    if (demoRoleChoice === 'PRESIDENT') {
      setUserRole('PRESIDENT');
    } else {
      setPlayerName(c1);
      setSelectedRosterCoach(c1);
      setUserRole('PLAYER');
    }
    setShowDemoModal(false);
  };

  const calculatePrice = () => {
    if (selectedPackage === 'TV') return 4.99;
    if (coachesCount <= 8) return 9.99;
    return 9.99 + (coachesCount - 8) * 1.0;
  };
  const totalPrice = calculatePrice();
  const splitPrice = (totalPrice / coachesCount + 0.15).toFixed(2);

  // Statistiche immutabili per gli Highlights (Senza mutare lo stato React!)
  const richestCoach = useMemo(() => [...coaches].sort((a, b) => b.budget - a.budget)[0], [coaches]);
  const fullestCoach = useMemo(() => [...coaches].sort((a, b) => b.playersCount - a.playersCount)[0], [coaches]);

  return (
    <>
      {!userRole ? (
        <div className="min-h-screen w-full bg-[#030914] text-white flex flex-col items-center justify-between p-4 md:p-8 select-none relative z-10 box-border overflow-y-auto">
          <div className="max-w-2xl w-full text-center space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 bg-[#060D1E] border border-cyan-500/30 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <BuzzMark size={24} />
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">FantasyBuzz Live Arena</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight">
              La tua asta di fantacalcio.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400">
                Con tutta un'altra energia.
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-xl mx-auto">
              Il presidente trasmette l'asta sulla TV. Gli amici rilanciano e mandano sfottò in tempo reale dal proprio smartphone con il Buzzer 3D.
            </p>
          </div>

          <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-3 gap-3 my-6">
            <div className="bg-[#060D1E] border border-cyan-500/20 rounded-2xl p-4 text-center flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400"><Tv size={20} /></div>
              <h3 className="text-xs font-black uppercase text-white">1. Tabellone TV & Urna</h3>
              <p className="text-[11px] text-slate-400">Chiamata libera o estrazione random con calcolo automatico della puntata massima.</p>
            </div>
            <div className="bg-[#060D1E] border border-emerald-500/20 rounded-2xl p-4 text-center flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400"><Smartphone size={20} /></div>
              <h3 className="text-xs font-black uppercase text-white">2. Buzzer & Trash Talk</h3>
              <p className="text-[11px] text-slate-400">Rilancia dal telefono e invia reazioni live sulla TV per mettere pressione agli amici.</p>
            </div>
            <div className="bg-[#060D1E] border border-cyan-500/20 rounded-2xl p-4 text-center flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400"><Award size={20} /></div>
              <h3 className="text-xs font-black uppercase text-white">3. Card Social Virali</h3>
              <p className="text-[11px] text-slate-400">Genera card Instagram con i timbri "Furto con Scasso" o "Svenato" ed esporta il CSV.</p>
            </div>
          </div>

          <div className="max-w-md w-full bg-[#060D1E] border border-cyan-500/30 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Play size={18} className="fill-slate-950" /> PROVA LA DEMO GRATUITA 🚀
              </button>
            </div>

            <div className="w-full h-px bg-slate-800" />

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowCustomLeagueModal(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ShieldCheck size={16} /> CREA O GESTISCI LA TUA LEGA 🏆
              </button>
            </div>

            <div className="w-full h-px bg-slate-800" />

            <div className="bg-[#0B132B] p-3.5 rounded-2xl space-y-2 border border-cyan-500/20 text-center">
              <span className="text-[10px] font-black uppercase text-cyan-400 block tracking-wider">
                Sei stato invitato? Entra con il Codice Stanza
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Codice Stanza..."
                  value={inputLeagueName}
                  onChange={(e) => { setInputLeagueName(e.target.value); setIsRoomCodeConfirmed(false); }}
                  className="flex-1 bg-[#060D1E] border border-slate-700 rounded-xl p-2.5 text-xs text-amber-400 font-black tracking-widest text-center uppercase"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputLeagueName.trim() !== '') {
                      const cleanCode = inputLeagueName.trim().toUpperCase().replace(/\s+/g, '');
                      setRoomCode(cleanCode);
                      setIsRoomCodeConfirmed(true);
                    } else {
                      setCustomAlertMessage('Inserisci il codice stanza ricevuto dal tuo Presidente!');
                    }
                  }}
                  className="px-3 bg-cyan-500 text-slate-950 rounded-xl font-black text-xs uppercase cursor-pointer"
                >
                  Verifica ⚡
                </button>
              </div>

              {isRoomCodeConfirmed && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-left">
                  <label className="text-[9px] font-bold text-slate-400 block uppercase text-center">
                    Seleziona il tuo nome allenatore:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                    {coaches.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setIsDemoMode(false);
                          setPlayerName(c.name);
                          setSelectedRosterCoach(c.name);
                          setUserRole('PLAYER');
                        }}
                        className="p-2 bg-[#060D1E] hover:bg-cyan-500/20 border border-slate-800 rounded-lg text-left cursor-pointer"
                      >
                        <span className="font-extrabold text-amber-400 text-xs block truncate">{c.name}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{c.budget} FM residui</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="text-[10px] text-slate-500 font-semibold py-4 text-center">
            FantasyBuzz Live Arena © 2026/2027 • L'Asta Live per Veri Fantallenatori
          </footer>
        </div>
      ) : (
        <div className="h-screen w-screen font-sans flex flex-col justify-between p-2 md:p-4 select-none overflow-hidden relative z-10 bg-[#030914] text-slate-200">
          
          {/* BANNER DEMO ATTIVA */}
          {isDemoMode && (
            <div className="bg-gradient-to-r from-cyan-600 via-emerald-500 to-cyan-600 text-slate-950 font-black text-center py-1 text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-md">
              <span>🎮 DEMO ATTIVA ({demoAuctionCount}/10 GIOCATORI)</span>
              <button onClick={() => setShowPaywall(true)} className="bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black hover:bg-slate-900 cursor-pointer shadow-sm">
                Sblocca Lega Completa 🚀
              </button>
            </div>
          )}

          {/* BANNER REAZIONI LIVE TRASH-TALK */}
          {liveReaction && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 px-6 py-3 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.6)] flex items-center gap-3 animate-bounce">
              <span className="text-4xl">{liveReaction.emoji}</span>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 block">{liveReaction.sender} dice:</span>
                <span className="text-sm font-black uppercase text-white">{liveReaction.label}!</span>
              </div>
            </div>
          )}

          {/* HEADER */}
          <header className="flex flex-col lg:flex-row justify-between items-center p-2.5 px-4 rounded-2xl bg-[#060D1E] border border-cyan-500/30 flex-shrink-0 my-1 gap-2">
            <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <BuzzMark size={30} />
                <div>
                  <h1 className="text-xs md:text-sm font-extrabold text-white flex items-center gap-2">
                    FantasyBuzz
                    <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                      {userRole === 'PRESIDENT' ? 'REGIA TV' : playerName}
                    </span>
                  </h1>
                  <p className="text-[10px] text-slate-400">{leagueName} • Stanza: <strong className="text-amber-400">{roomCode}</strong></p>
                </div>
              </div>

              <div className="flex gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-800">
                <button onClick={() => setActiveTab('AUCTION')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'AUCTION' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
                  <Zap size={13} /> Asta Live
                </button>
                <button onClick={() => setActiveTab('ROSTERS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'ROSTERS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
                  <Shirt size={13} /> Rose ({Object.values(purchasedPlayers).reduce((acc, l) => acc + l.length, 0)})
                </button>
                <button onClick={() => setActiveTab('HIGHLIGHTS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'HIGHLIGHTS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                  <Award size={13} /> Statistiche
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isConnected ? 'Live Sync ⚡' : 'Offline'}
              </span>

              {userRole === 'PRESIDENT' && (
                <>
                  <button onClick={handleShareWhatsAppInvite} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer">
                    <Share2 size={12} /> Invita su WhatsApp
                  </button>
                  {lastAwardHistory && (
                    <button onClick={handleUndoLastAward} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer" title="Annulla ultimo acquisto">
                      <RotateCcw size={12} /> Annulla Ultimo
                    </button>
                  )}
                  <button onClick={() => setIsPureTvDisplay(!isPureTvDisplay)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 cursor-pointer">
                    <Monitor size={12} /> {isPureTvDisplay ? 'Mostra Regia' : 'Solo TV'}
                  </button>
                </>
              )}

              <button onClick={() => { setUserRole(null); setPlayerName(''); setIsDemoMode(false); }} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 font-bold px-2.5 py-1.5 rounded-xl cursor-pointer">
                <LogOut size={12} /> Esci
              </button>
            </div>
          </header>

          {/* TAB ASTA LIVE */}
          {activeTab === 'AUCTION' && (
            userRole === 'PRESIDENT' ? (
              <main className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch my-1 overflow-y-auto lg:overflow-hidden w-full relative">
                {latestBidAlert && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-5 py-2 rounded-2xl shadow-2xl border-2 border-white animate-bounce flex items-center gap-2">
                    <Zap size={18} className="fill-slate-950" />
                    <span className="text-xs uppercase">RILANCIO DI {latestBidAlert.bidder}: {latestBidAlert.amount} FM!</span>
                  </div>
                )}

                {/* COLONNA SINISTRA: ALLENATORI E PUNTATA MASSIMA */}
                <aside className="hidden lg:flex w-[240px] shrink-0 bg-[#060D1E] rounded-2xl p-3.5 flex-col gap-3 overflow-hidden border border-cyan-500/30">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase flex items-center justify-between pb-2 border-b border-cyan-500/20">
                    <span className="flex items-center gap-1.5"><Trophy size={13} className="text-amber-400" /> Allenatori</span>
                    <span className="text-[9px] text-slate-400">Budget / MaxBid</span>
                  </h3>
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {coaches.map(c => {
                      const isHighest = highestBidder === c.name;
                      const maxBid = getCoachMaxBid(c.name);
                      return (
                        <div key={c.name} className={`flex justify-between items-center p-2.5 rounded-xl transition-all ${
                          isHighest ? 'bg-cyan-500/20 border border-cyan-400 text-white scale-[1.02]' : 'bg-[#0B132B]/80 border border-slate-800'
                        }`}>
                          <div className="truncate pr-1">
                            <span className="font-extrabold text-xs block text-white truncate">{c.name}</span>
                            <span className="text-[9px] text-slate-400 flex items-center gap-1"><Users size={9} /> {c.playersCount}/{TOTAL_SLOTS} in rosa</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-amber-400 text-xs block">{c.budget} FM</span>
                            <span className="text-[9px] text-emerald-400 font-bold block">Max: {maxBid}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* ARENA CENTRALE */}
                <section
                  className={`w-full lg:flex-1 shrink-0 min-h-[480px] lg:min-h-0 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-between relative overflow-hidden border-2 ${
                    isBlinking ? 'border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)]' : 'border-emerald-500/40'
                  }`}
                  style={{
                    background: `radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.25) 0%, rgba(6, 35, 22, 0.96) 75%, rgba(2, 18, 11, 1) 100%)`
                  }}
                >
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-2">
                      <span className="font-black text-sm uppercase tracking-widest text-red-400 animate-bounce">
                        🚨 GONG ZONE - ULTIMI SECONDI! 🚨
                      </span>
                      <div className="text-8xl font-black text-red-500 animate-ping">{countdown}</div>
                    </div>
                  )}

                  {/* BARRA RICERCA + FILTRI + URNA RANDOM */}
                  <div className="w-full bg-[#060D1E]/90 backdrop-blur-md rounded-xl p-2.5 flex flex-col gap-2 z-10 border border-slate-700/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[160px]">
                        <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cerca calciatore o squadra..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-[#0B132B] rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                      <div className="flex gap-1">
                        {(['ALL', 'P', 'D', 'C', 'A'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => setSelectedRole(r)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${selectedRole === r ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-400'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleRandomPlayer}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-md"
                        title="Estrai un calciatore casuale (Tasto R)"
                      >
                        <Shuffle size={12} /> Random
                      </button>
                      <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={hidePurchased} onChange={e => setHidePurchased(e.target.checked)} className="accent-amber-500" />
                        Solo Svincolati
                      </label>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto py-1 max-h-16 border-t border-slate-800">
                      {filteredList.slice(0, 60).map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPlayer(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 cursor-pointer ${activePlayer.id === p.id ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-300'}`}
                        >
                          <span className="mr-1 text-[9px] opacity-75">[{p.role}]</span> {p.name} ({p.basePrice})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DISPLAY GIOCATORE AL CENTRO */}
                  <div className="flex flex-col items-center justify-center my-auto z-10 text-center space-y-2 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-[#060D1E]/90 pl-1 pr-2.5 py-0.5 rounded-full uppercase border border-slate-700">
                        <TeamBadge team={activePlayer.team} size={18} />
                        <span>{activePlayer.team}</span>
                      </div>
                      {isTopPlayer && (
                        <span className="text-[10px] font-black text-amber-400 uppercase flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                          <Flame size={11} /> TOP PLAYER
                        </span>
                      )}
                    </div>

                    <h2 className={`text-4xl md:text-6xl font-black text-white uppercase tracking-tight transition-all drop-shadow-lg ${isBlinking ? 'scale-105 text-amber-300' : ''}`}>
                      {activePlayer.name}
                    </h2>

                    <div className="flex gap-2 text-xs font-bold text-slate-200 bg-slate-950/80 px-4 py-1 rounded-full border border-slate-700">
                      <span>Base: <strong className="text-amber-400">{activePlayer.basePrice} FM</strong></span>
                      <span>•</span>
                      <span>MV: <strong className="text-emerald-400">{activePlayer.mv || '6.00'}</strong></span>
                      <span>•</span>
                      <span>FM: <strong className="text-cyan-400">{activePlayer.fm || '6.00'}</strong></span>
                    </div>
                  </div>

                  {/* CONSOLE RILANCI & AGGIUDICAZIONE */}
                  <div className="w-full max-w-3xl bg-[#060D1E]/95 backdrop-blur-md p-4 rounded-2xl flex flex-col gap-3 z-10 border border-slate-700/80 shadow-2xl">
                    {activePackage === 'TV' && !isDemoMode ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-300 font-bold uppercase block mb-1">Vincitore Asta</label>
                            <select
                              value={selectedWinnerManual || coaches[0]?.name || ''}
                              onChange={(e) => setSelectedWinnerManual(e.target.value)}
                              className="w-full bg-[#0B132B] rounded-lg p-2 text-xs font-bold text-amber-300 focus:outline-none"
                            >
                              {coaches.map(c => (
                                <option key={c.name} value={c.name}>{c.name} ({c.teamName})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-full md:w-28">
                            <label className="text-[10px] text-slate-300 font-bold uppercase block mb-1">Prezzo (FM)</label>
                            <input
                              type="number"
                              placeholder="Es. 55"
                              value={manualPriceInput}
                              onChange={(e) => setManualPriceInput(e.target.value)}
                              className="w-full bg-[#0B132B] rounded-lg p-2 text-xs font-black text-emerald-400 text-center focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <button onClick={handleNextPlayer} className="flex-1 py-2 bg-[#0B132B] text-white font-bold rounded-lg text-xs uppercase flex items-center justify-center gap-1 cursor-pointer">
                            <SkipForward size={13} /> Salta
                          </button>
                          <button onClick={handleAward} className="flex-1 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                            <Gavel size={14} />
                            <span>Aggiudica</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase block">Miglior Offerente</span>
                          {highestBidder ? (
                            <p className="text-base text-emerald-400 font-black">{highestBidder}</p>
                          ) : (
                            <p className="text-xs text-slate-400 font-semibold">Nessuna offerta (Base {activePlayer.basePrice} FM)</p>
                          )}
                        </div>

                        <div className={`text-4xl md:text-6xl font-black text-amber-400 tabular-nums transition-all ${isSlotSpinning ? 'scale-110 text-white' : 'scale-100'}`}>
                          {displayBid || activePlayer.basePrice} <span className="text-xl text-amber-300 font-bold">FM</span>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <button onClick={() => startGongTimer(3)} className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1.5 cursor-pointer">
                            <Timer size={14} /> 3 SEC (GONG)
                          </button>
                          <div className="flex gap-1.5">
                            <button onClick={handleNextPlayer} className="px-3 py-2 bg-[#0B132B] hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer">
                              <SkipForward size={13} /> Salta
                            </button>
                            <button onClick={handleAward} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-lg">
                              <Gavel size={15} /> Aggiudica
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isPureTvDisplay && activePackage !== 'TV' && (
                      <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-2">
                        {[1, 5, 10, 20].map(step => (
                          <button
                            key={step}
                            onClick={() => { setSelectedStep(step); handleRaise(step); }}
                            className={`py-2.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all ${
                              selectedStep === step ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-white border border-slate-700'
                            }`}
                          >
                            +{step} FM
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* COLONNA DESTRA: CRONOLOGIA OFFERTE */}
                <aside className="hidden lg:flex w-[220px] shrink-0 bg-[#060D1E] rounded-2xl p-3.5 flex-col gap-3 overflow-hidden border border-cyan-500/30">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5 pb-2 border-b border-cyan-500/20">
                    <History size={13} className="text-emerald-400" /> Cronologia Live
                  </h3>
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {bidHistory.length > 0 ? (
                      bidHistory.map((item, idx) => (
                        <div key={idx} className="bg-[#0B132B]/80 p-2.5 rounded-xl flex justify-between items-center text-xs border border-slate-800">
                          <div>
                            <span className="font-extrabold text-white block truncate max-w-[95px]">{item.bidder}</span>
                            <span className="text-[9px] text-slate-500">{item.time}</span>
                          </div>
                          <span className="font-black text-emerald-400">{item.amount} FM</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">In attesa di offerte...</p>
                    )}
                  </div>
                </aside>
              </main>
            ) : (
              /* VISTA SMARTPHONE BUZZER PER PARTECIPANTI */
              <main className="flex-1 flex flex-col gap-2 max-w-sm mx-auto w-full my-auto overflow-hidden items-center justify-between relative py-2.5 px-3 rounded-3xl border-2 border-emerald-500/40 bg-[#041810]">
                <div className="text-center space-y-1 w-full bg-[#060D1E]/95 p-3 rounded-2xl border border-slate-700 z-10">
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className={`px-2 py-0.5 rounded-full uppercase ${getRoleBadge(activePlayer.role)}`}>
                      {activePlayer.role} • {activePlayer.team}
                    </span>
                    <span className="text-amber-400">
                      Budget: {coaches.find(c => c.name === playerName)?.budget || 0} FM (Max: {getCoachMaxBid(playerName)})
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase truncate">{activePlayer.name}</h2>
                  <p className="text-[11px] text-slate-400">Base d'asta: <strong className="text-amber-400">{activePlayer.basePrice} FM</strong></p>
                </div>

                {/* STATO OFFERTA */}
                <div className="w-full z-10">
                  {highestBidder === playerName ? (
                    <div className="w-full bg-emerald-500/20 border-2 border-emerald-400 p-2.5 rounded-2xl text-center">
                      <span className="text-xs font-black uppercase text-emerald-300 flex items-center justify-center gap-1">
                        <Check size={15} /> COMANDI TU L'ASTA ({currentBid} FM)
                      </span>
                    </div>
                  ) : (
                    <div className="w-full bg-[#060D1E]/90 border border-amber-500/40 p-2.5 rounded-2xl text-center">
                      <span className="text-[10px] font-bold uppercase text-amber-400 block">Offerta Attuale</span>
                      <span className="text-sm font-black text-white uppercase">
                        {highestBidder ? `${highestBidder} (${currentBid} FM)` : `Nessuna offerta (${activePlayer.basePrice} FM)`}
                      </span>
                    </div>
                  )}
                </div>

                {/* BUZZER 3D */}
                <div className="w-full bg-[#060D1E]/95 border border-slate-700 rounded-3xl p-3.5 flex flex-col items-center gap-3 z-10">
                  <button
                    disabled={Boolean(awardModal?.show) || highestBidder === playerName}
                    onClick={() => handleRaise(selectedStep)}
                    className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-1 transition-all select-none ${
                      highestBidder === playerName || awardModal?.show
                        ? 'bg-slate-800 border-4 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'
                        : 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 font-black border-4 border-amber-200 shadow-[0_10px_25px_rgba(245,158,11,0.7)] active:translate-y-2 cursor-pointer'
                    }`}
                  >
                    <Zap size={28} className="fill-slate-950" />
                    <span className="text-xl font-black uppercase">
                      {highestBidder === playerName ? 'IN TESTA' : `BUZZ +${selectedStep}`}
                    </span>
                  </button>

                  <div className="w-full grid grid-cols-4 gap-1.5">
                    {[1, 5, 10, 20].map(step => (
                      <button
                        key={step}
                        onClick={() => setSelectedStep(step)}
                        className={`py-2 text-xs font-black rounded-xl border cursor-pointer ${
                          selectedStep === step ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-[#0B132B] border-slate-700 text-white'
                        }`}
                      >
                        +{step}
                      </button>
                    ))}
                  </div>

                  {/* BARRA TRASH TALK LIVE */}
                  <div className="w-full pt-2 border-t border-slate-800">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block text-center mb-1">
                      Invia Sfottò Live sulla TV:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { emoji: '🤡', label: 'Pagliaccio' },
                        { emoji: '🔥', label: 'Follia Pura' },
                        { emoji: '💰', label: 'Sceicco' },
                        { emoji: '💤', label: 'Svegliaaa' },
                      ].map(r => (
                        <button
                          key={r.label}
                          onClick={() => sendLiveReaction(r.emoji, r.label)}
                          className="py-1.5 bg-[#0B132B] hover:bg-slate-800 border border-slate-700 rounded-xl text-xs flex flex-col items-center cursor-pointer active:scale-90"
                        >
                          <span className="text-base">{r.emoji}</span>
                          <span className="text-[8px] text-slate-300 font-bold">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            )
          )}

          {/* TAB ROSE LEGA */}
          {activeTab === 'ROSTERS' && (
            <main className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch my-1 overflow-y-auto w-full">
              <aside className="w-full lg:w-[240px] shrink-0 bg-[#060D1E] border border-cyan-500/30 rounded-2xl p-3.5 flex flex-col gap-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1"><Shirt size={13} /> Rose Lega</span>
                  <button onClick={handleExportCSV} className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer">
                    <Download size={11} /> CSV
                  </button>
                </div>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {coaches.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedRosterCoach(c.name)}
                      className={`w-full flex justify-between items-center p-2.5 rounded-xl border text-left cursor-pointer ${
                        selectedRosterCoach === c.name ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-[#0B132B] border-slate-800 text-white'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 block">{c.teamName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-amber-400 text-xs block">{c.budget} FM</span>
                        <span className="text-[9px] text-emerald-400 font-bold">{(purchasedPlayers[c.name] || []).length}/{TOTAL_SLOTS}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="w-full lg:flex-1 bg-[#060D1E] border border-cyan-500/30 rounded-2xl p-4 overflow-y-auto">
                {(() => {
                  const currentCoachData = coaches.find(c => c.name === selectedRosterCoach) || coaches[0];
                  const roster = (currentCoachData && purchasedPlayers[currentCoachData.name]) || [];
                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-[#0B132B] p-3 rounded-xl border border-slate-800">
                        <div>
                          <h2 className="text-lg font-black text-white uppercase">{currentCoachData?.name}</h2>
                          <p className="text-xs text-slate-400">Puntata Max attuale: <strong className="text-emerald-400">{getCoachMaxBid(currentCoachData?.name)} FM</strong></p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-amber-400 block">{currentCoachData?.budget} FM Residui</span>
                          <span className="text-xs text-slate-400">{roster.length} / {TOTAL_SLOTS} Calciatori</span>
                        </div>
                      </div>

                      {(['P', 'D', 'C', 'A'] as const).map(role => {
                        const items = roster.filter(i => i.player.role === role);
                        const max = ROLE_LIMITS[role];
                        return (
                          <div key={role} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${getRoleBadge(role)}`}>{role}</span>
                              <span className="text-xs font-bold text-slate-300">({items.length}/{max})</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
                              {Array.from({ length: max }).map((_, idx) => {
                                const item = items[idx];
                                return item ? (
                                  <div key={idx} className="bg-[#0B132B] border border-slate-800 p-2 rounded-lg flex flex-col justify-between">
                                    <span className="font-extrabold text-xs text-white truncate">{item.player.name}</span>
                                    <span className="text-[9px] text-slate-400 truncate">{item.player.team}</span>
                                    <span className="font-black text-amber-400 text-[10px] mt-1">{item.price} FM</span>
                                  </div>
                                ) : (
                                  <div key={idx} className="bg-[#0B132B]/40 border border-dashed border-slate-800 p-2 rounded-lg text-center text-[9px] text-slate-600">
                                    Slot {idx + 1} Vuoto
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>
            </main>
          )}

          {/* TAB HIGHLIGHTS & STATISTICHE (Senza mutazione .sort) */}
          {activeTab === 'HIGHLIGHTS' && (
            <main className="flex-1 flex flex-col gap-3 items-center justify-center p-4 bg-[#060D1E] border border-cyan-500/30 rounded-3xl my-1 overflow-y-auto">
              <h2 className="text-2xl font-black text-white uppercase">🏆 RIEPILOGO & RECORD ASTA 🏆</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
                <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-center">
                  <Award size={22} className="text-amber-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Più Crediti Residui</span>
                  <strong className="text-xs text-white block">{richestCoach?.name}</strong>
                  <span className="text-xs font-black text-emerald-400">{richestCoach?.budget} FM</span>
                </div>
                <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-center">
                  <Flame size={22} className="text-emerald-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Rosa Più Numerosa</span>
                  <strong className="text-xs text-white block">{fullestCoach?.name}</strong>
                  <span className="text-xs font-black text-amber-400">{fullestCoach?.playersCount} Calciatori</span>
                </div>
                <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-center">
                  <PieChart size={22} className="text-sky-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Totale Speso in Lega</span>
                  <strong className="text-sm text-white block">
                    {coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0)} FM
                  </strong>
                </div>
                <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-center">
                  <TrendingUp size={22} className="text-purple-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Prezzo Medio Calciatore</span>
                  <strong className="text-sm text-white block">
                    {Math.round(
                      coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0) /
                        Math.max(1, coaches.reduce((acc, c) => acc + c.playersCount, 0))
                    )} FM
                  </strong>
                </div>
              </div>
            </main>
          )}
        </div>
      )}

      {/* MODALE AGGIUDICAZIONE + CARD SOCIAL */}
      {awardModal && awardModal.show && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#060D1E] border-2 border-emerald-400 rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 text-center relative">
            <button onClick={() => setAwardModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
              <Gavel size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400">Aggiudicato!</span>
              <h2 className="text-2xl font-black text-white uppercase mt-1">{awardModal.player.name}</h2>
              <p className="text-sm text-slate-300">Prezzo: <strong className="text-amber-400 font-black">{awardModal.price} FM</strong></p>
            </div>
            <div className="bg-[#0B132B] p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Nuovo acquisto di</span>
              <span className="text-base font-black text-emerald-400 uppercase">{awardModal.winner}</span>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleDownloadSocialCard} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer">
                <Sparkles size={16} /> Scarica / Condividi Card Sfottò
              </button>
              <button onClick={() => { setAwardModal(null); handleNextPlayer(); }} className="w-full py-2.5 bg-[#0B132B] hover:bg-slate-800 text-slate-300 font-bold rounded-2xl text-xs uppercase cursor-pointer border border-slate-800">
                Prossimo Calciatore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFIGURAZIONE LEGA & PARTECIPANTI */}
      {showCustomLeagueModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-amber-500/40 rounded-3xl p-5 max-w-md w-full flex flex-col gap-3 text-center relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowCustomLeagueModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            <h3 className="text-base font-black text-white uppercase">Imposta la Tua Lega</h3>

            <input
              type="text"
              placeholder="Nome Lega (es. FantaLega 2026)"
              value={customLeagueInput}
              onChange={(e) => setCustomLeagueInput(e.target.value)}
              className="w-full bg-[#060D1E] border border-slate-700 rounded-xl p-2.5 text-xs text-amber-400 font-bold text-center"
            />

            <div className="flex items-center justify-between bg-[#060D1E] p-2.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-300 font-bold">Budget Iniziale (FM):</span>
              <div className="flex gap-1.5">
                {[300, 500, 1000].map(b => (
                  <button
                    key={b}
                    onClick={() => {
                      setInitialBudget(b);
                      setCoaches(prev => prev.map(c => ({ ...c, budget: b, playersCount: 0 })));
                      setPurchasedPlayers({});
                    }}
                    className={`px-2.5 py-1 rounded-lg font-black cursor-pointer ${initialBudget === b ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* GESTIONE LISTA ALLENATORI */}
            <div className="text-left space-y-2 bg-[#060D1E] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-black uppercase text-cyan-400 block">Partecipanti ({coaches.length}):</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Aggiungi allenatore..."
                  value={newCoachInput}
                  onChange={e => setNewCoachInput(e.target.value)}
                  className="flex-1 bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  onClick={() => {
                    if (!newCoachInput.trim()) return;
                    const name = newCoachInput.trim();
                    setCoaches(prev => [...prev, { name, teamName: `FC ${name}`, budget: initialBudget, playersCount: 0 }]);
                    setNewCoachInput('');
                  }}
                  className="px-3 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus size={13} /> Aggiungi
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {coaches.map((c, i) => (
                  <div key={c.name} className="flex justify-between items-center bg-[#0B132B] px-2.5 py-1.5 rounded-lg text-xs">
                    <span className="font-bold text-white">{i + 1}. {c.name}</span>
                    {coaches.length > 2 && (
                      <button
                        onClick={() => setCoaches(prev => prev.filter(item => item.name !== c.name))}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-3 py-2.5 bg-rose-500/20 text-rose-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                Reset Dati
              </button>
              <button
                onClick={() => {
                  const nameClean = customLeagueInput.trim() || leagueName;
                  setLeagueName(nameClean);
                  setRoomCode(nameClean.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setShowCustomLeagueModal(false);
                  setShowPaywall(true);
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer"
              >
                Avvia Sala Aste 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DEMO */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#060D1E] border border-cyan-500/40 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3.5 text-center relative">
            <button onClick={() => setShowDemoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            <h3 className="text-lg font-black text-white uppercase">Prova Demo Gratuita</h3>
            
            <div className="space-y-2 text-left">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">I Tuoi 3 Allenatori in Demo</label>
              <div className="space-y-1.5">
                <input type="text" placeholder="Allenatore 1 (Tu)" value={demoName1} onChange={(e) => setDemoName1(e.target.value)} className="w-full bg-[#0B132B] border border-slate-700 rounded-xl p-2 text-xs text-amber-400 font-bold focus:outline-none" />
                <input type="text" placeholder="Allenatore 2" value={demoName2} onChange={(e) => setDemoName2(e.target.value)} className="w-full bg-[#0B132B] border border-slate-700 rounded-xl p-2 text-xs text-white font-semibold focus:outline-none" />
                <input type="text" placeholder="Allenatore 3" value={demoName3} onChange={(e) => setDemoName3(e.target.value)} className="w-full bg-[#0B132B] border border-slate-700 rounded-xl p-2 text-xs text-white font-semibold focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDemoRoleChoice('PRESIDENT')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${demoRoleChoice === 'PRESIDENT' ? 'bg-amber-500/20 border-amber-400 text-white' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}>
                <Tv size={18} />
                <span className="text-xs font-black uppercase">Presidente (TV)</span>
              </button>
              <button onClick={() => setDemoRoleChoice('PLAYER')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${demoRoleChoice === 'PLAYER' ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}>
                <Smartphone size={18} />
                <span className="text-xs font-black uppercase">Buzzer (Telefono)</span>
              </button>
            </div>
            <button onClick={handleLaunchDemo} className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
              Avvia Demo Ora 🚀
            </button>
          </div>
        </div>
      )}

      {/* MODALE PAYWALL */}
      {showPaywall && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-lg w-full flex flex-col gap-4 relative">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            <div className="text-center">
              <h2 className="text-xl font-black text-white uppercase">Sblocca la tua Lega 🚀</h2>
              <p className="text-xs text-slate-400">Totale: €{totalPrice.toFixed(2)} ({paymentType === 'SPLIT' ? `~ €${splitPrice} a testa` : 'Pagamento unico'})</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setSelectedPackage('TV')} className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 transition-all cursor-pointer text-left ${selectedPackage === 'TV' ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-[#060D1E] border-slate-800 text-slate-400'}`}>
                <Tv size={20} className={selectedPackage === 'TV' ? 'text-amber-400' : 'text-slate-400'} />
                <div><h4 className="text-xs font-black uppercase text-white">FantasyBuzz TV</h4><p className="text-[9px] text-slate-400">Solo Tabellone TV e Rose</p></div>
                <span className="text-xs font-black text-amber-400 mt-1">€4,99 <span className="text-[9px] font-normal text-slate-400">una tantum</span></span>
              </button>
              <button onClick={() => setSelectedPackage('LIVE')} className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 transition-all cursor-pointer text-left relative overflow-hidden ${selectedPackage === 'LIVE' ? 'bg-emerald-500/10 border-emerald-400 text-white' : 'bg-[#060D1E] border-slate-800 text-slate-400'}`}>
                <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-black text-[7px] uppercase px-1.5 py-0.2 rounded-bl">Consigliato</div>
                <Smartphone size={20} className={selectedPackage === 'LIVE' ? 'text-emerald-400' : 'text-slate-400'} />
                <div><h4 className="text-xs font-black uppercase text-white">FantasyBuzz LIVE</h4><p className="text-[9px] text-slate-400">Schermo TV + Buzzer Smartphone</p></div>
                <span className="text-xs font-black text-emerald-400 mt-1">da €9,99 <span className="text-[9px] font-normal text-slate-400">una tantum</span></span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block uppercase">Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPaymentType('SINGLE')} className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${paymentType === 'SINGLE' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-[#060D1E] text-slate-400 border-slate-800'}`}><CreditCard size={13} /> Presidente</button>
                <button onClick={() => setPaymentType('SPLIT')} className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${paymentType === 'SPLIT' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-[#060D1E] text-slate-400 border-slate-800'}`}><Users2 size={13} /> Cassa Comune</button>
              </div>
            </div>

            <button
              onClick={() => {
                setActivePackage(selectedPackage);
                setIsDemoMode(false);
                setShowPaywall(false);
                setUserRole('PRESIDENT');
                setActiveTab('AUCTION');
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard size={15} /> Entra in Regia (Attiva Stanza)
            </button>
          </div>
        </div>
      )}

      {/* MODALE AVVISO */}
      {customAlertMessage && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3 text-center relative">
            <AlertCircle size={24} className="text-amber-400 mx-auto" />
            <p className="text-xs text-white font-semibold leading-relaxed">{customAlertMessage}</p>
            <button onClick={() => setCustomAlertMessage(null)} className="w-full py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
              Capito
            </button>
          </div>
        </div>
      )}
    </>
  );
}