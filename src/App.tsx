import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy, Zap, X, SkipForward, History, ShieldCheck, LogOut,
  Share2, Search, Download, Shirt, Play, CreditCard, Tv, Smartphone,
  Monitor, Timer, Flame, Award, PieChart, AlertCircle, TrendingUp, Gavel,
  RotateCcw, Shuffle, UserPlus, Trash2, Sparkles, QrCode, Volume2, VolumeX,
  FileSignature, HelpCircle, ChevronDown, Coins, ArrowUp, Info, Send, Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import rawListone from './data/listone.json';
import { supabase } from './supabase';

type Role = 'P' | 'D' | 'C' | 'A';
interface Player { id: string; name: string; role: Role; team: string; basePrice: number; mv?: string; fm?: string; overall?: number; }
interface Coach { name: string; teamName: string; budget: number; playersCount: number; }
interface PurchasedItem { player: Player; price: number; }

const ROLE_LIMITS: Record<Role, number> = { P: 3, D: 8, C: 8, A: 6 };
const TOTAL_SLOTS = 25;
const FREE_TRIAL_PURCHASES_LIMIT = 6;

const EMOJI_CHOICES = [
  { emoji: '🤘', name: 'Corna', defaultMsg: 'TI STO GUFANDO! SI ROMPE DOMANI!' },
  { emoji: '💸', name: 'Soldi', defaultMsg: 'MA QUANTO SPENDI?! SCEICCO!' },
  { emoji: '😂', name: 'Risata', defaultMsg: 'ACQUISTO RIDICOLO AHAHAH!' },
  { emoji: '🤫', name: 'Zitti', defaultMsg: 'TUTTI ZITTI, QUESTO È MIO!' },
  { emoji: '🗑️', name: 'Bidone', defaultMsg: 'HAI COMPRATO UN BIDONE CLAMOROSO!' },
  { emoji: '🤡', name: 'Pagliaccio', defaultMsg: 'RILANCIA SE HAI IL CORAGGIO!' },
];

const FAQ_ITEMS = [
  { q: 'Posso provare FantasyBuzz gratis con i miei amici prima di pagare?', a: 'Sì, al 100%! Puoi creare la tua lega reale, far collegare gli amici col QR Code o Codice Stanza e fare i primi 6 acquisti veri completamente gratis (con Tabellone TV, Telecronista, Firma Contratti e Buzzer 3D attivi). Non serve alcuna carta per iniziare.' },
  { q: 'Cosa succede dopo i primi 6 acquisti gratuiti? Perdiamo le rose?', a: 'Assolutamente no! Tutti gli acquisti e i crediti restano salvati. Al 7° calciatore potrete sbloccare l’asta completa con €2 (Solo Tabellone TV) o 1€ a testa (€8 fino a 8 amici / €10 da 9+ amici per l’Arena con i telefoni). E potete sempre scaricare gratis il file Excel dei primi 6 acquisti!' },
  { q: 'Chi paga nella lega? Dobbiamo inserire 10 carte di credito diverse?', a: 'No! Sblocca la stanza una sola persona in 5 secondi e sulla TV compare la "Tabella Colletta 1€" per segnare in diretta gli amici che mettono la moneta da 1 euro sul tavolo.' },
  { q: 'Come funziona la Garanzia 100% Soddisfatti o Rimborsati?', a: 'Se durante la serata doveste avere qualsiasi imprevisto o l’app non dovesse piacervi, vi basta richiedere il rimborso entro 24 ore per ricevere indietro il 100% dell’importo senza domande.' }
];

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
  { aliases: ['inter', 'internazionale'], short: 'INT', primary: '#0756a5', secondary: '#101820', ink: '#ffffff' },
  { aliases: ['milan', 'ac milan'], short: 'MIL', primary: '#c81d32', secondary: '#151515', ink: '#ffffff' },
  { aliases: ['juventus', 'juve'], short: 'JUV', primary: '#171717', secondary: '#f4f4f4', ink: '#ffffff' },
  { aliases: ['napoli'], short: 'NAP', primary: '#087fb5', secondary: '#d9f4ff', ink: '#ffffff' },
  { aliases: ['lazio'], short: 'LAZ', primary: '#77b8dd', secondary: '#f6f7f8', ink: '#102743' },
  { aliases: ['roma'], short: 'ROM', primary: '#8d1830', secondary: '#f2a51a', ink: '#ffffff' },
  { aliases: ['atalanta'], short: 'ATA', primary: '#13295d', secondary: '#101010', ink: '#ffffff' },
  { aliases: ['udinese'], short: 'UDI', primary: '#171717', secondary: '#f3d52d', ink: '#ffffff' },
  { aliases: ['torino'], short: 'TOR', primary: '#7e1c2a', secondary: '#f2e6e4', ink: '#ffffff' },
  { aliases: ['fiorentina'], short: 'FIO', primary: '#563184', secondary: '#f5f2f8', ink: '#ffffff' },
  { aliases: ['bologna'], short: 'BOL', primary: '#153f83', secondary: '#c72439', ink: '#ffffff' },
  { aliases: ['lecce'], short: 'LEC', primary: '#c42a35', secondary: '#e4c326', ink: '#ffffff' },
  { aliases: ['genoa'], short: 'GEN', primary: '#b21f34', secondary: '#193e69', ink: '#ffffff' },
  { aliases: ['cagliari'], short: 'CAG', primary: '#bd2637', secondary: '#16477c', ink: '#ffffff' },
  { aliases: ['parma'], short: 'PAR', primary: '#19519a', secondary: '#f2d12a', ink: '#ffffff' },
  { aliases: ['como'], short: 'COM', primary: '#2187ae', secondary: '#f2f7fa', ink: '#ffffff' },
  { aliases: ['verona'], short: 'VER', primary: '#f0c928', secondary: '#1e4e9b', ink: '#17213a' },
  { aliases: ['empoli'], short: 'EMP', primary: '#1475b8', secondary: '#f4f8fb', ink: '#ffffff' },
  { aliases: ['monza'], short: 'MON', primary: '#c5223c', secondary: '#f4f4f4', ink: '#ffffff' },
  { aliases: ['venezia'], short: 'VEN', primary: '#171717', secondary: '#bd2639', ink: '#ffffff' },
] as const;

const getTeamBadgeStyle = (team: unknown) => {
  const norm = String(team || '').toLowerCase().trim();
  const match = TEAM_BADGES.find(e => e.aliases.some(a => norm.includes(a)));
  if (match) return match;
  return { short: norm.slice(0, 3).toUpperCase() || 'FC', primary: '#1e293b', secondary: '#fbbf24', ink: '#ffffff' };
};

let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext | null => {
  try {
    if (!sharedAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    return sharedAudioCtx;
  } catch { return null; }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

const speakTelecronista = (text: string, enabled: boolean) => {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT';
      u.rate = 1.06;
      const voices = window.speechSynthesis.getVoices();
      const itVoice = voices.find(v => v.lang.toLowerCase().includes('it') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Elsa'))) || voices.find(v => v.lang.toLowerCase().includes('it'));
      if (itVoice) u.voice = itVoice;
      window.speechSynthesis.speak(u);
    }, 60);
  } catch (e) { console.error(e); }
};

const playBuzzSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.14);
  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.25);
};

const playGongSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 1.0);
  gain.gain.setValueAtTime(0.45, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 1.0);
};

const playTickSound = (isUrgent = false) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = isUrgent ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(isUrgent ? 1200 : 600, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.09);
};

const playContractShowSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
    gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime + idx * 0.07);
    osc.stop(ctx.currentTime + idx * 0.07 + 0.35);
  });
  const sOsc = ctx.createOscillator();
  const sGain = ctx.createGain();
  sOsc.type = 'sine';
  sOsc.frequency.setValueAtTime(130, ctx.currentTime + 0.55);
  sOsc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.78);
  sGain.gain.setValueAtTime(0.65, ctx.currentTime + 0.55);
  sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  sOsc.connect(sGain); sGain.connect(ctx.destination);
  sOsc.start(ctx.currentTime + 0.55); sOsc.stop(ctx.currentTime + 0.8);
};

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
        <text x="24" y="36" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize={11} fill={badge.ink}>{badge.short}</text>
      </svg>
    </span>
  );
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

const getViralStampInfo = (price: number, basePrice: number, initialBudget: number) => {
  const ratio = price / Math.max(1, basePrice);
  if (price === 1 && basePrice >= 4) return { label: 'FURTO CON SCASSO 🥷', color: '#38bdf8', border: 'border-sky-400 text-sky-400' };
  if (price >= initialBudget * 0.35 || ratio >= 4.5) return { label: 'FOLLIA PURA • SVENATO 💸', color: '#f43f5e', border: 'border-rose-500 text-rose-400' };
  if (basePrice >= 20 && price >= 70) return { label: 'COLPO DA NOVANTA 👑', color: '#f59e0b', border: 'border-amber-400 text-amber-400' };
  if (price < basePrice) return { label: 'AFFARE LOW COST 🔥', color: '#10b981', border: 'border-emerald-400 text-emerald-400' };
  return { label: 'CONTRATTO DEPOSITATO ✅', color: '#10b981', border: 'border-emerald-400 text-emerald-400' };
};

export default function App() {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [highestBidder, setHighestBidder] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | Role>('ALL');
  const [hidePurchased, setHidePurchased] = useState(true);
  const [startFromOne, setStartFromOne] = useState<boolean>(() => localStorage.getItem('fb_startFromOne') !== 'false');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => localStorage.getItem('fb_voiceEnabled') !== 'false');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [showRoomCodeArrow, setShowRoomCodeArrow] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const [isBlinking, setIsBlinking] = useState(false);
  const [bidHistory, setBidHistory] = useState<{ bidder: string; amount: number; time: string }[]>([]);
  const [latestBidAlert, setLatestBidAlert] = useState<{ bidder: string; amount: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [displayBid, setDisplayBid] = useState(0);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [isPureTvDisplay, setIsPureTvDisplay] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);

  const [liveReaction, setLiveReaction] = useState<{ sender: string; emoji: string; label: string } | null>(null);
  const [selectedCustomEmoji, setSelectedCustomEmoji] = useState(EMOJI_CHOICES[0]);
  const [customTauntText, setCustomTauntText] = useState('');

  const [presidentSelectedBidder, setPresidentSelectedBidder] = useState<string>('');
  const [manualPriceInput, setManualPriceInput] = useState<string>('');

  const [activePackage, setActivePackage] = useState<'TV' | 'LIVE'>(() => (localStorage.getItem('fb_activePackage') as 'TV' | 'LIVE') || 'LIVE');
  const [isLicenseUnlocked, setIsLicenseUnlocked] = useState<boolean>(() => localStorage.getItem('fb_unlocked') === 'true');
  const [collettaPaidCoaches, setCollettaPaidCoaches] = useState<string[]>([]);

  const [showCustomLeagueModal, setShowCustomLeagueModal] = useState(false);
  const [customLeagueInput, setCustomLeagueInput] = useState('');
  const [newCoachInput, setNewCoachInput] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoRoleChoice, setDemoRoleChoice] = useState<'PRESIDENT' | 'PLAYER'>('PRESIDENT');

  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number>(1);

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
    if (saved) { try { return JSON.parse(saved); } catch (e) { console.error(e); } }
    return [
      { name: 'Presidente', teamName: 'Real Presidente', budget: 500, playersCount: 0 },
      { name: 'Pasquale', teamName: 'FC Vesuvio', budget: 500, playersCount: 0 },
      { name: 'Gianni', teamName: 'Spartak Gianni', budget: 500, playersCount: 0 },
      { name: 'Marco', teamName: 'AC Denti', budget: 500, playersCount: 0 },
    ];
  });

  const [purchasedPlayers, setPurchasedPlayers] = useState<Record<string, PurchasedItem[]>>(() => {
    const saved = localStorage.getItem('fb_purchasedPlayers');
    if (saved) { try { return JSON.parse(saved); } catch (e) { console.error(e); } }
    return {};
  });

  const [selectedRosterCoach, setSelectedRosterCoach] = useState<string>(coaches[0]?.name || 'Presidente');
  const [awardModal, setAwardModal] = useState<{ show: boolean; player: Player; winner: string; price: number } | null>(null);
  const [lastAwardHistory, setLastAwardHistory] = useState<{ player: Player; winner: string; price: number } | null>(null);

  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const liveRoundPrice = coaches.length <= 8 ? 8 : 10;
  const currentPackagePrice = activePackage === 'TV' ? 2 : liveRoundPrice;

  useEffect(() => {
    if (!presidentSelectedBidder && coaches.length > 0) setPresidentSelectedBidder(coaches[0].name);
  }, [coaches, presidentSelectedBidder]);

  useEffect(() => {
    if (!isDemoMode) {
      localStorage.setItem('fb_coaches', JSON.stringify(coaches));
      localStorage.setItem('fb_purchasedPlayers', JSON.stringify(purchasedPlayers));
      localStorage.setItem('fb_leagueName', leagueName);
      localStorage.setItem('fb_roomCode', roomCode);
      localStorage.setItem('fb_initialBudget', String(initialBudget));
      localStorage.setItem('fb_startFromOne', String(startFromOne));
      localStorage.setItem('fb_voiceEnabled', String(voiceEnabled));
      localStorage.setItem('fb_activePackage', activePackage);
      localStorage.setItem('fb_unlocked', String(isLicenseUnlocked));
    }
  }, [coaches, purchasedPlayers, leagueName, roomCode, initialBudget, startFromOne, voiceEnabled, activePackage, isLicenseUnlocked, isDemoMode]);

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

  const purchasedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(purchasedPlayers).forEach(list => list.forEach(item => ids.add(item.player.id)));
    return ids;
  }, [purchasedPlayers]);

  const allPurchasesFeed = useMemo(() => {
    const feed: { coachName: string; player: Player; price: number }[] = [];
    Object.entries(purchasedPlayers).forEach(([coachName, list]) => {
      list.forEach(item => feed.push({ coachName, player: item.player, price: item.price }));
    });
    return feed.reverse();
  }, [purchasedPlayers]);

  const totalPurchasesCount = purchasedPlayerIds.size;

  const getCoachMaxBid = useCallback((coachName: string) => {
    const coach = coaches.find(c => c.name === coachName);
    if (!coach) return 0;
    const rem = Math.max(0, TOTAL_SLOTS - coach.playersCount - 1);
    return Math.max(0, coach.budget - rem);
  }, [coaches]);

  const getCoachRoleCount = useCallback((coachName: string, role: Role) => {
    return (purchasedPlayers[coachName] || []).filter(item => item.player.role === role).length;
  }, [purchasedPlayers]);

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
  const startingPrice = startFromOne ? 1 : activePlayer.basePrice;

  const activeDuel = useMemo(() => {
    if (bidHistory.length < 4) return null;
    const uniq = Array.from(new Set(bidHistory.slice(0, 4).map(b => b.bidder)));
    return uniq.length === 2 ? `${uniq[0]} ⚔️ ${uniq[1]}` : null;
  }, [bidHistory]);

  const registerBidLocally = useCallback((bidder: string, amount: number) => {
    playBuzzSound();
    setIsBlinking(true);
    setCountdown(null);
    setAwardModal(null);
    setTimeout(() => setIsBlinking(false), 300);
    setHighestBidder(bidder);
    setCurrentBid(amount);
    setLatestBidAlert({ bidder, amount });
    setTimeout(() => setLatestBidAlert(null), 2200);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBidHistory(prev => [{ bidder, amount, time: timeStr }, ...prev]);
  }, []);

  const applyAwardState = useCallback((player: Player, winnerName: string, finalPrice: number, shouldSpeak = false) => {
    playContractShowSound();
    try { confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } }); } catch (e) { console.error(e); }

    if (shouldSpeak) {
      if (finalPrice === 1 && player.basePrice >= 5) {
        speakTelecronista(`Clamoroso! ${winnerName} si porta a casa ${player.name} a un solo fantamilione! Tutta la sala dormiva!`, voiceEnabled);
      } else if (finalPrice >= initialBudget * 0.35) {
        speakTelecronista(`Follia totale di ${winnerName}! Sborsa ben ${finalPrice} fantamilioni per ${player.name}! Contratto depositato!`, voiceEnabled);
      } else {
        speakTelecronista(`È ufficiale! ${player.name} firma il contratto con ${winnerName} per ${finalPrice} fantamilioni!`, voiceEnabled);
      }
    }

    setCoaches(prev => prev.map(c => c.name === winnerName ? { ...c, budget: c.budget - finalPrice, playersCount: c.playersCount + 1 } : c));
    setPurchasedPlayers(prev => ({ ...prev, [winnerName]: [...(prev[winnerName] || []), { player, price: finalPrice }] }));
    setLastAwardHistory({ player, winner: winnerName, price: finalPrice });
    setAwardModal({ show: true, player, winner: winnerName, price: finalPrice });
    setCurrentBid(0);
    setHighestBidder(null);
    setCountdown(null);
  }, [initialBudget, voiceEnabled]);

  const stateRef = useRef({ coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked });
  useEffect(() => {
    stateRef.current = { coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked };
  }, [coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked]);

  useEffect(() => {
    if (!roomCode) return;
    const channel = supabase.channel(`room_${roomCode}`)
      .on('broadcast', { event: 'quick_bid' }, ({ payload }: any) => {
        if (payload?.bidder && payload?.amount) registerBidLocally(payload.bidder, payload.amount);
      })
      .on('broadcast', { event: 'start_countdown' }, ({ payload }: any) => setCountdown(payload?.seconds || 3))
      .on('broadcast', { event: 'change_player' }, ({ payload }: any) => {
        if (payload?.player) {
          setCurrentPlayer(payload.player);
          setCurrentBid(0);
          setHighestBidder(null);
          setBidHistory([]);
          setManualPriceInput('');
          setCountdown(null);
          setLatestBidAlert(null);
          setAwardModal(null);
        }
      })
      .on('broadcast', { event: 'close_award_modal' }, () => {
        setAwardModal(null);
        setCurrentBid(0);
        setHighestBidder(null);
      })
      .on('broadcast', { event: 'player_awarded' }, ({ payload }: any) => {
        if (payload?.player && payload?.winner !== undefined) applyAwardState(payload.player, payload.winner, payload.price, false);
      })
      .on('broadcast', { event: 'sync_league_state' }, ({ payload }: any) => {
        if (payload?.coaches) setCoaches(payload.coaches);
        if (payload?.purchasedPlayers) setPurchasedPlayers(payload.purchasedPlayers);
        if (payload?.leagueName) setLeagueName(payload.leagueName);
        if (payload?.activePlayer) setCurrentPlayer(payload.activePlayer);
        if (typeof payload?.currentBid === 'number') setCurrentBid(payload.currentBid);
        if (payload?.highestBidder !== undefined) setHighestBidder(payload.highestBidder);
        if (typeof payload?.startFromOne === 'boolean') setStartFromOne(payload.startFromOne);
        if (typeof payload?.isLicenseUnlocked === 'boolean') {
          setIsLicenseUnlocked(payload.isLicenseUnlocked);
          if (payload.isLicenseUnlocked) setShowPaywall(false);
        }
      })
      .on('broadcast', { event: 'live_reaction' }, ({ payload }: any) => {
        if (payload?.sender && payload?.emoji) {
          playTickSound(true);
          setLiveReaction(payload);
          setTimeout(() => setLiveReaction(null), 3800);
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
              leagueName: stateRef.current.leagueName,
              activePlayer: stateRef.current.activePlayer,
              currentBid: stateRef.current.currentBid,
              highestBidder: stateRef.current.highestBidder,
              startFromOne: stateRef.current.startFromOne,
              isLicenseUnlocked: stateRef.current.isLicenseUnlocked,
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
  }, [roomCode, registerBidLocally, applyAwardState]);

  useEffect(() => {
    if (currentBid !== displayBid) {
      setIsSlotSpinning(true);
      const timer = setTimeout(() => { setDisplayBid(currentBid); setIsSlotSpinning(false); }, 90);
      return () => clearTimeout(timer);
    }
  }, [currentBid, displayBid]);

  const handleSelectPlayer = useCallback(async (player: Player) => {
    setCurrentPlayer(player);
    setCurrentBid(0);
    setHighestBidder(null);
    setBidHistory([]);
    setManualPriceInput('');
    setCountdown(null);
    setLatestBidAlert(null);
    setAwardModal(null);

    if (userRole === 'PRESIDENT') {
      const rNames: Record<Role, string> = { P: 'portiere', D: 'difensore', C: 'centrocampista', A: 'attaccante' };
      speakTelecronista(player.basePrice >= 20 ? `Attenzione in sala, entra un top player! ${player.name}, ${rNames[player.role]} del ${player.team}!` : `In campo ${player.name}, ${player.team}.`, voiceEnabled);
    }
    if (activeChannel) {
      try { await activeChannel.send({ type: 'broadcast', event: 'change_player', payload: { player } }); } catch (e) { console.error(e); }
    }
  }, [activeChannel, userRole, voiceEnabled]);

  const handleRandomPlayer = useCallback(() => {
    if (filteredList.length === 0) {
      setCustomAlertMessage('Nessun calciatore svincolato disponibile con i filtri attuali!');
      return;
    }
    handleSelectPlayer(filteredList[Math.floor(Math.random() * filteredList.length)]);
  }, [filteredList, handleSelectPlayer]);

  const handleNextPlayer = useCallback(() => {
    const rem = listoneUfficiale.filter(p => !purchasedPlayerIds.has(p.id) && p.id !== activePlayer.id && (selectedRole === 'ALL' || p.role === selectedRole));
    handleSelectPlayer(rem[0] || filteredList[0] || listoneUfficiale[0]);
  }, [purchasedPlayerIds, activePlayer.id, selectedRole, filteredList, handleSelectPlayer]);

  const handleCloseAwardAndNext = useCallback(async () => {
    setAwardModal(null);
    if (activeChannel) {
      try { await activeChannel.send({ type: 'broadcast', event: 'close_award_modal', payload: {} }); } catch (e) { console.error(e); }
    }
    if (userRole === 'PRESIDENT') handleNextPlayer();
  }, [activeChannel, userRole, handleNextPlayer]);

  const handleRaise = useCallback(async (stepVal: number, customBidderName?: string) => {
    if (purchasedPlayerIds.has(activePlayer.id)) {
      if (userRole === 'PRESIDENT') handleNextPlayer();
      return;
    }
    const activeName = customBidderName || (userRole === 'PRESIDENT' ? (presidentSelectedBidder || coaches[0]?.name) : playerName);
    if (!activeName) return;

    if (userRole === 'PLAYER' && highestBidder === activeName) {
      setCustomAlertMessage('Sei già tu il miglior offerente! Aspetta che qualcun altro rilanci.');
      return;
    }

    const nuovaOfferta = highestBidder ? currentBid + stepVal : (startFromOne ? stepVal : Math.max(activePlayer.basePrice, stepVal));

    if (!isDemoMode) {
      const maxAllowed = getCoachMaxBid(activeName);
      if (nuovaOfferta > maxAllowed) {
        setCustomAlertMessage(`Offerta bloccata! La puntata massima per ${activeName} è ${maxAllowed} FM.`);
        return;
      }
      if (getCoachRoleCount(activeName, activePlayer.role) >= ROLE_LIMITS[activePlayer.role]) {
        setCustomAlertMessage(`${activeName} ha già completato tutti i posti per il ruolo ${activePlayer.role}!`);
        return;
      }
    }

    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    if (userRole === 'PRESIDENT' && stepVal >= 10) speakTelecronista(`Botta sul tavolo di ${activeName}! Si sale a ${nuovaOfferta}!`, voiceEnabled);

    registerBidLocally(activeName, nuovaOfferta);
    if (activeChannel) {
      try { await activeChannel.send({ type: 'broadcast', event: 'quick_bid', payload: { bidder: activeName, amount: nuovaOfferta } }); } catch (e) { console.error(e); }
    }
  }, [purchasedPlayerIds, activePlayer, userRole, handleNextPlayer, presidentSelectedBidder, coaches, playerName, highestBidder, currentBid, startFromOne, isDemoMode, getCoachMaxBid, getCoachRoleCount, voiceEnabled, registerBidLocally, activeChannel]);

  const handleAward = useCallback(async () => {
    if (purchasedPlayerIds.has(activePlayer.id)) {
      handleNextPlayer();
      return;
    }
    if (!isDemoMode && !isLicenseUnlocked && totalPurchasesCount >= FREE_TRIAL_PURCHASES_LIMIT) {
      setShowPaywall(true);
      return;
    }

    let finalPrice = currentBid > 0 ? currentBid : startingPrice;
    const winnerName = highestBidder || presidentSelectedBidder || coaches[0]?.name;
    if (manualPriceInput && !isNaN(Number(manualPriceInput)) && Number(manualPriceInput) > 0) finalPrice = Number(manualPriceInput);

    if (!isDemoMode) {
      if (getCoachRoleCount(winnerName, activePlayer.role) >= ROLE_LIMITS[activePlayer.role]) {
        setCustomAlertMessage(`Blocco Acquisto: ${winnerName} ha già completato il ruolo ${activePlayer.role}!`);
        return;
      }
      if (finalPrice > getCoachMaxBid(winnerName)) {
        setCustomAlertMessage(`Blocco Budget: ${winnerName} può spendere al massimo ${getCoachMaxBid(winnerName)} FM!`);
        return;
      }
    }

    applyAwardState(activePlayer, winnerName, finalPrice, userRole === 'PRESIDENT');
    if (activeChannel) {
      try { await activeChannel.send({ type: 'broadcast', event: 'player_awarded', payload: { player: activePlayer, winner: winnerName, price: finalPrice } }); } catch (e) { console.error(e); }
    }
  }, [purchasedPlayerIds, activePlayer, handleNextPlayer, isDemoMode, isLicenseUnlocked, totalPurchasesCount, currentBid, startingPrice, highestBidder, presidentSelectedBidder, coaches, manualPriceInput, getCoachRoleCount, getCoachMaxBid, applyAwardState, userRole, activeChannel]);

  const handleUnlockRoomNow = async () => {
    setIsLicenseUnlocked(true);
    setShowPaywall(false);
    playContractShowSound();
    try { confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } }); } catch (e) { console.error(e); }
    if (activeChannel) {
      await activeChannel.send({ type: 'broadcast', event: 'sync_league_state', payload: { coaches, purchasedPlayers, leagueName, startFromOne, isLicenseUnlocked: true } });
    }
    setCustomAlertMessage(`Stanza sbloccata con successo! Garanzia 100% Soddisfatti o Rimborsati attiva.`);
  };

  const handleUndoLastAward = async () => {
    if (!lastAwardHistory) return;
    const { player, winner, price } = lastAwardHistory;
    const updatedCoaches = coaches.map(c => c.name === winner ? { ...c, budget: c.budget + price, playersCount: Math.max(0, c.playersCount - 1) } : c);
    const updatedPurchased = { ...purchasedPlayers, [winner]: (purchasedPlayers[winner] || []).filter(item => item.player.id !== player.id) };

    setCoaches(updatedCoaches);
    setPurchasedPlayers(updatedPurchased);
    setLastAwardHistory(null);
    setAwardModal(null);
    setCurrentPlayer(player);
    setCurrentBid(0);
    setHighestBidder(null);
    setCustomAlertMessage(`Acquisto di ${player.name} (${winner}) annullato! Crediti ripristinati.`);

    if (activeChannel) {
      await activeChannel.send({
        type: 'broadcast',
        event: 'sync_league_state',
        payload: { coaches: updatedCoaches, purchasedPlayers: updatedPurchased, leagueName, activePlayer: player, currentBid: 0, highestBidder: null, startFromOne, isLicenseUnlocked }
      });
    }
  };

  const sendLiveReaction = async (emoji: string, label: string) => {
    const payload = { sender: userRole === 'PRESIDENT' ? 'Il Presidente' : playerName, emoji, label: label.trim() || 'ATTENZIONE!' };
    playTickSound(true);
    setLiveReaction(payload);
    setTimeout(() => setLiveReaction(null), 3800);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'live_reaction', payload });
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      if (countdown === 3) {
        playGongSound();
        if (userRole === 'PRESIDENT') speakTelecronista('Ultima chiamata! Tre, due, uno...', voiceEnabled);
      } else playTickSound(countdown <= 2);
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      if (userRole === 'PRESIDENT') handleAward();
    }
  }, [countdown, userRole, voiceEnabled, handleAward]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (userRole !== 'PRESIDENT' || activeTab !== 'AUCTION') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (awardModal?.show) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); handleCloseAwardAndNext(); }
        return;
      }
      if (e.key === '1') { setSelectedStep(1); handleRaise(1); }
      else if (e.key === '5') { setSelectedStep(5); handleRaise(5); }
      else if (e.key === '0') { setSelectedStep(10); handleRaise(10); }
      else if (e.key === '2') { setSelectedStep(20); handleRaise(20); }
      else if (e.key === ' ') { e.preventDefault(); handleRaise(selectedStep); }
      else if (e.key === 'Enter') { e.preventDefault(); handleAward(); }
      else if (e.key === 'r' || e.key === 'R') handleRandomPlayer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userRole, activeTab, awardModal, selectedStep, handleRaise, handleAward, handleRandomPlayer, handleCloseAwardAndNext]);

  const startGongTimer = async (seconds = 3) => {
    setCountdown(seconds);
    if (activeChannel) {
      try { await activeChannel.send({ type: 'broadcast', event: 'start_countdown', payload: { seconds } }); } catch (e) { console.error(e); }
    }
  };

  const handleDownloadSocialCard = async () => {
    if (!awardModal) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stampInfo = getViralStampInfo(awardModal.price, awardModal.player.basePrice, initialBudget);
    const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, '#021B12'); bg.addColorStop(0.55, '#062E1E'); bg.addColorStop(1, '#021B12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1920);

    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, 1000, 1840);

    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('FANTASYBUZZ LIVE ARENA', 540, 170);
    ctx.fillStyle = '#F59E0B'; ctx.font = '800 32px system-ui, sans-serif';
    ctx.fillText(leagueName.toUpperCase(), 540, 235);

    ctx.fillStyle = stampInfo.color; ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillText(stampInfo.label, 540, 340);

    ctx.fillStyle = '#ffffff'; ctx.font = '900 72px system-ui, sans-serif';
    ctx.fillText(awardModal.player.name.toUpperCase(), 540, 780);
    ctx.fillStyle = '#94A3B8'; ctx.font = '700 32px system-ui, sans-serif';
    ctx.fillText(`${awardModal.player.role} • ${awardModal.player.team.toUpperCase()} ( Quot. ${awardModal.player.basePrice} FM )`, 540, 850);

    ctx.fillStyle = '#F59E0B'; ctx.font = '900 150px system-ui, sans-serif';
    ctx.fillText(`${awardModal.price} FM`, 540, 1180);

    ctx.fillStyle = '#10b981'; ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText(`FIRMATO DA: ${awardModal.winner.toUpperCase()}`, 540, 1480);

    const fileName = `FantasyBuzz_${awardModal.player.name.replace(/\s+/g, '_')}.png`;
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!blob) return;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  const handleShareWhatsAppInvite = () => {
    const text = `⚽ Entra nell'asta per la lega *${leagueName}*!\n\n📲 Apri il tuo Pulsante Buzzer qui:\n${inviteUrl}\n\n🔑 Codice Stanza: *${roomCode}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard?.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,Allenatore,Squadra Lega,Calciatore,Ruolo,Squadra Serie A,Prezzo Pagato\n';
    coaches.forEach(c => {
      (purchasedPlayers[c.name] || []).forEach(i => {
        csv += `"${c.name}","${c.teamName}","${i.player.name}","${i.player.role}","${i.player.team}",${i.price}\n`;
      });
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `Rose_${leagueName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleLaunchDemo = () => {
    setIsDemoMode(true);
    setActivePackage('LIVE');
    const uniqueDemoId = `DEMO_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setRoomCode(uniqueDemoId);
    setLeagueName('Lega Demo Show TV');
    const demoCoaches = [
      { name: 'Presidente (Tu)', teamName: 'FC Presidente', budget: 500, playersCount: 0 },
      { name: 'Pasquale', teamName: 'FC Vesuvio', budget: 500, playersCount: 0 },
      { name: 'Gianni', teamName: 'Spartak Gianni', budget: 500, playersCount: 0 },
    ];
    setCoaches(demoCoaches);
    setPurchasedPlayers({});
    setCurrentBid(0);
    setHighestBidder(null);
    setPresidentSelectedBidder(demoCoaches[0].name);

    if (demoRoleChoice === 'PRESIDENT') {
      setUserRole('PRESIDENT');
      setShowWelcomeGuide(true);
      setShowRoomCodeArrow(true);
    } else {
      setPlayerName(demoCoaches[0].name);
      setSelectedRosterCoach(demoCoaches[0].name);
      setUserRole('PLAYER');
    }
    setShowDemoModal(false);
  };

  const toggleCollettaCoach = (name: string) => {
    setCollettaPaidCoaches(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const richestCoach = useMemo(() => [...coaches].sort((a, b) => b.budget - a.budget)[0], [coaches]);
  const fullestCoach = useMemo(() => [...coaches].sort((a, b) => b.playersCount - a.playersCount)[0], [coaches]);

  const tickerItems = useMemo(() => {
    const items: string[] = [];
    if (allPurchasesFeed.length > 0) {
      allPurchasesFeed.slice(0, 8).forEach(p => items.push(`✅ UFFICIALE: ${p.player.name.toUpperCase()} (${p.player.role}) A ${p.coachName.toUpperCase()} PER ${p.price} FM`));
    } else {
      items.push(`⚽ STUDIO FANTASYBUZZ APERTO PER "${leagueName.toUpperCase()}" • CODICE STANZA AMICI: ${roomCode}`);
    }
    if (richestCoach) items.push(`💰 PAPERONE IN SALA: ${richestCoach.name.toUpperCase()} CON ${richestCoach.budget} FM DISPONIBILI`);
    if (fullestCoach && fullestCoach.playersCount > 0) items.push(`👕 ROSA PIÙ FOLTA: ${fullestCoach.name.toUpperCase()} (${fullestCoach.playersCount}/${TOTAL_SLOTS} CALCIATORI)`);
    return items;
  }, [allPurchasesFeed, leagueName, roomCode, richestCoach, fullestCoach]);

  return (
    <>
      <style>{`
        @keyframes paparazziFlash { 0% { opacity: 0.95; } 25% { opacity: 0.1; } 45% { opacity: 0.85; } 100% { opacity: 0; } }
        @keyframes signContractReveal { 0% { clip-path: inset(0 100% 0 0); } 100% { clip-path: inset(0 0 0 0); } }
        @keyframes stampSlamEffect { 0% { transform: scale(3.5) rotate(-25deg); opacity: 0; } 70% { transform: scale(0.9) rotate(-8deg); opacity: 1; } 100% { transform: scale(1) rotate(-8deg); opacity: 1; } }
        @keyframes tickerMarquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
      `}</style>

      {!userRole ? (
        <div className="min-h-screen w-full bg-[#030914] text-white flex flex-col items-center justify-between p-4 md:p-6 select-none relative z-10 box-border overflow-y-auto">
          <div className="max-w-3xl w-full text-center space-y-2.5 pt-2">
            <div className="inline-flex items-center gap-2 bg-[#060D1E] border border-amber-500/40 px-4 py-1.5 rounded-full">
              <BuzzMark size={22} />
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">FantasyBuzz • Gran Galà del Fantamercato</span>
            </div>
            <h1 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight">
              Stanco del solito foglio Excel?<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400">
                Trasforma l'Asta in uno Show TV.
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl mx-auto">
              Inizia subito gratis con i tuoi amici (primi {FREE_TRIAL_PURCHASES_LIMIT} acquisti inclusi, zero carte richieste). Campo TV stile DAZN/Sky, Voce del Telecronista, Firma Contratti PlayStation e Buzzer 3D con Sfottò in diretta.
            </p>
          </div>

          <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 my-5">
            <div className="bg-[#060D1E] border-2 border-amber-500/40 hover:border-amber-400 rounded-3xl p-4 flex flex-col justify-between gap-3 shadow-xl">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">Asta Classica a Voce</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-400">€2</span>
                    <span className="text-[10px] text-slate-400 block">totale tutta la lega</span>
                  </div>
                </div>
                <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                  <Tv size={18} className="text-amber-400" /> 1. Solo Tabellone TV
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Meno di un caffè per sostituire Excel.</strong> Colleghi il PC alla TV, gli amici rilanciano a voce dal divano e tu assegni i giocatori con <strong>un click sul nome</strong>.
                </p>
              </div>
              <button onClick={() => { setActivePackage('TV'); setShowCustomLeagueModal(true); }} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
                Inizia Gratis in Modalità TV ({FREE_TRIAL_PURCHASES_LIMIT} Acquisti) 🖥️
              </button>
            </div>

            <div className="bg-[#060D1E] border-2 border-emerald-500/50 hover:border-emerald-400 rounded-3xl p-4 flex flex-col justify-between gap-3 shadow-xl">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">Più Scelta • TV + Telefoni</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">€1 <span className="text-xs font-bold">/ a testa</span></span>
                    <span className="text-[10px] text-slate-400 block">€8 (fino a 8) • €10 (9-12 amici)</span>
                  </div>
                </div>
                <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                  <Smartphone size={18} className="text-emerald-400" /> 2. Tabellone TV + Telefoni Buzzer
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tutto lo spettacolo della TV + <strong>ogni amico riceve il Codice Stanza o link WhatsApp</strong> sul proprio telefono per rilanciare sul Gong e mandare sfottò (🤘 💸 😂) sulla TV.
                </p>
              </div>
              <button onClick={() => { setActivePackage('LIVE'); setShowCustomLeagueModal(true); }} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
                Inizia Gratis con Telefoni Buzzer ({FREE_TRIAL_PURCHASES_LIMIT} Acquisti) 🚀
              </button>
            </div>
          </div>

          <div className="max-w-md w-full bg-[#060D1E] border border-cyan-500/30 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="bg-[#0B132B] p-3 rounded-2xl space-y-2 border border-cyan-500/20 text-center">
              <span className="text-[10px] font-black uppercase text-cyan-400 block">Il tuo Presidente ti ha dato un Codice Stanza? Scrivilo qui:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Es. DEMO_1234 o LEGA2026"
                  value={inputLeagueName}
                  onChange={(e) => { setInputLeagueName(e.target.value); setIsRoomCodeConfirmed(false); }}
                  className="flex-1 bg-[#060D1E] border border-slate-700 rounded-xl p-2 text-xs text-amber-400 font-black tracking-widest text-center uppercase"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputLeagueName.trim() !== '') {
                      setRoomCode(inputLeagueName.trim().toUpperCase().replace(/\s+/g, ''));
                      setIsRoomCodeConfirmed(true);
                    } else setCustomAlertMessage('Scrivi il Codice Stanza che vedi in alto sulla TV del Presidente!');
                  }}
                  className="px-3 bg-cyan-500 text-slate-950 rounded-xl font-black text-xs uppercase cursor-pointer"
                >
                  Entra ⚡
                </button>
              </div>

              {isRoomCodeConfirmed && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-left">
                  <label className="text-[10px] font-bold text-emerald-400 block uppercase text-center">✅ Stanza trovata! Tocca il tuo nome:</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                    {coaches.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => { setIsDemoMode(false); setPlayerName(c.name); setSelectedRosterCoach(c.name); setUserRole('PLAYER'); }}
                        className="p-2 bg-[#060D1E] hover:bg-cyan-500/20 border border-slate-800 rounded-lg text-left cursor-pointer"
                      >
                        <span className="font-extrabold text-amber-400 text-xs block truncate">{c.name}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{c.budget} FM disponibili</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={() => setShowDemoModal(true)} className="w-full py-2.5 bg-[#0B132B] hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer">
              <Play size={14} className="fill-emerald-400 text-emerald-400" /> Vuoi fare una Prova Demo Veloce? Clicca qui
            </button>
          </div>

          <div className="max-w-2xl w-full my-6 space-y-4">
            <div className="bg-[#060D1E] border border-emerald-500/40 rounded-2xl p-3.5 flex items-center gap-3 shadow-lg">
              <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
              <div className="text-left">
                <span className="text-xs font-black uppercase text-emerald-400 block">Garanzia 100% Soddisfatti o Rimborsati • Zero Rischi</span>
                <p className="text-[11px] text-slate-300">Primi {FREE_TRIAL_PURCHASES_LIMIT} acquisti gratis, scaricamento rose Excel sempre incluso e rimborso completo entro 24h.</p>
              </div>
            </div>

            <div className="bg-[#060D1E] border border-slate-800 rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 mb-2">
                <HelpCircle size={15} /> Domande Frequenti
              </h3>
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border border-slate-800/90 rounded-xl bg-[#0B132B]/70 overflow-hidden">
                    <button type="button" onClick={() => setOpenFaqIndex(isOpen ? null : idx)} className="w-full p-3 text-left flex items-center justify-between gap-2 text-xs font-bold text-white cursor-pointer">
                      <span>{item.q}</span>
                      <ChevronDown size={15} className={`shrink-0 text-amber-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && <div className="px-3 pb-3 text-[11px] text-slate-300 border-t border-slate-800/60 pt-2">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen w-screen font-sans flex flex-col justify-between p-2 md:p-3 select-none overflow-hidden relative z-10 bg-[#030914] text-slate-200">
          {!isLicenseUnlocked && (
            <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl px-3 py-1 mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
              <span className="font-bold text-slate-200">
                🎁 <strong className="text-amber-400">{isDemoMode ? 'Modalità Demo:' : 'Giro di Prova Gratuito:'}</strong> {totalPurchasesCount} calciatori acquistati
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowWelcomeGuide(true)} className="bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-black px-2.5 py-0.5 rounded-lg text-[10px] uppercase cursor-pointer flex items-center gap-1">
                  <Info size={11} /> Come far entrare gli Amici
                </button>
                <button onClick={() => setShowPaywall(true)} className="bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-[10px] uppercase cursor-pointer">
                  Sblocca Asta Completa (€{currentPackagePrice})
                </button>
              </div>
            </div>
          )}

          {liveReaction && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 px-6 py-3.5 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce max-w-md w-[92%]">
              <span className="text-5xl shrink-0">{liveReaction.emoji}</span>
              <div className="text-left">
                <span className="text-[10px] font-black uppercase text-amber-400 block">📣 SFOTTÒ DA {liveReaction.sender.toUpperCase()}:</span>
                <span className="text-base font-black uppercase text-white block mt-0.5">"{liveReaction.label}"</span>
              </div>
            </div>
          )}

          <header className="flex flex-col lg:flex-row justify-between items-center p-2 px-3.5 rounded-2xl bg-[#060D1E] border border-cyan-500/30 flex-shrink-0 gap-2 relative">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
              <div className="flex items-center gap-2">
                <BuzzMark size={28} />
                <div>
                  <h1 className="text-xs md:text-sm font-extrabold text-white flex items-center gap-1.5">
                    FantasyBuzz
                    <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                      {userRole === 'PRESIDENT' ? 'PRESIDENTE (TV)' : playerName}
                    </span>
                  </h1>
                  <p className="text-[10px] text-slate-400">{leagueName}</p>
                </div>
              </div>

              {userRole === 'PRESIDENT' && activePackage === 'LIVE' && (
                <div className="relative">
                  <div onClick={() => setShowWelcomeGuide(true)} className="bg-amber-500/20 border-2 border-amber-400 px-3 py-1 rounded-xl flex items-center gap-2 cursor-pointer">
                    <QrCode size={15} className="text-amber-400" />
                    <div className="text-left">
                      <span className="text-[8px] font-black uppercase text-amber-300 block leading-none">Codice Stanza Amici</span>
                      <strong className="text-sm font-black text-white tracking-widest">{roomCode}</strong>
                    </div>
                  </div>
                  {showRoomCodeArrow && (
                    <div onClick={() => setShowRoomCodeArrow(false)} className="absolute top-12 left-0 z-40 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl shadow-2xl border-2 border-white w-60 animate-bounce cursor-pointer">
                      <div className="flex items-center gap-1 font-black text-[10px] uppercase">
                        <ArrowUp size={14} /> <span>Dai questo codice agli amici!</span>
                      </div>
                      <p className="text-[9px] font-bold leading-tight mt-0.5">Lo scrivono sul telefono per usare il Buzzer</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-800">
                <button onClick={() => setActiveTab('AUCTION')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'AUCTION' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
                  <Zap size={13} /> Campo Asta
                </button>
                <button onClick={() => setActiveTab('ROSTERS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'ROSTERS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
                  <Shirt size={13} /> Rose ({totalPurchasesCount})
                </button>
                <button onClick={() => setActiveTab('HIGHLIGHTS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'HIGHLIGHTS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                  <Award size={13} /> Classifiche
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isConnected ? 'Stanza Connessa' : 'Connessione...'}
              </span>

              {userRole === 'PRESIDENT' && (
                <>
                  <button
                    onClick={() => {
                      const next = !voiceEnabled;
                      setVoiceEnabled(next);
                      if (next) speakTelecronista('Telecronista attivato!', true);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${voiceEnabled ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                  >
                    {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                    {voiceEnabled ? 'Voce ON' : 'Muto'}
                  </button>
                  {activePackage === 'LIVE' && (
                    <button onClick={handleShareWhatsAppInvite} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 cursor-pointer">
                      <Share2 size={12} /> Invita WhatsApp
                    </button>
                  )}
                  {lastAwardHistory && (
                    <button onClick={handleUndoLastAward} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-pointer">
                      <RotateCcw size={12} /> Annulla
                    </button>
                  )}
                  <button onClick={() => setIsPureTvDisplay(!isPureTvDisplay)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 cursor-pointer">
                    <Monitor size={12} /> {isPureTvDisplay ? 'Mostra Bottoni' : 'Solo TV'}
                  </button>
                </>
              )}

              <button onClick={() => { setUserRole(null); setPlayerName(''); }} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 font-bold px-2.5 py-1.5 rounded-xl cursor-pointer">
                <LogOut size={12} /> Esci
              </button>
            </div>
          </header>

          {activeTab === 'AUCTION' && (
            userRole === 'PRESIDENT' ? (
              <main className="flex-1 flex flex-col lg:flex-row gap-2.5 items-stretch my-1 overflow-y-auto lg:overflow-hidden w-full relative min-h-0">
                {latestBidAlert && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-5 py-1.5 rounded-2xl shadow-2xl border-2 border-white animate-bounce flex items-center gap-2">
                    <Zap size={16} className="fill-slate-950" />
                    <span className="text-xs uppercase">OFFERTA DI {latestBidAlert.bidder}: {latestBidAlert.amount} FM!</span>
                  </div>
                )}

                <aside className="w-full lg:w-[265px] shrink-0 bg-[#060D1E] rounded-2xl p-3 flex flex-col gap-2 overflow-hidden border border-cyan-500/30">
                  <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
                    <span className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1.5"><Trophy size={13} className="text-amber-400" /> Squadre</span>
                    <span className="text-[9px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded">👆 Clicca = Offri +1</span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {coaches.map(c => {
                      const isHighest = highestBidder === c.name;
                      const maxBid = getCoachMaxBid(c.name);
                      const pCount = getCoachRoleCount(c.name, 'P');
                      const dCount = getCoachRoleCount(c.name, 'D');
                      const cCount = getCoachRoleCount(c.name, 'C');
                      const aCount = getCoachRoleCount(c.name, 'A');
                      return (
                        <div
                          key={c.name}
                          onClick={() => { setPresidentSelectedBidder(c.name); handleRaise(1, c.name); }}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer select-none ${
                            isHighest ? 'bg-emerald-500/20 border-2 border-emerald-400 text-white' : presidentSelectedBidder === c.name ? 'bg-amber-500/15 border border-amber-400/60' : 'bg-[#0B132B]/90 border border-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-xs text-white truncate flex items-center gap-1">
                              {isHighest && <Gavel size={12} className="text-emerald-400 shrink-0" />} {c.name}
                            </span>
                            <div className="text-right">
                              <span className="font-black text-amber-400 text-xs">{c.budget} FM</span>
                              <span className="text-[9px] text-emerald-400 font-bold ml-1">(Max {maxBid})</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1 mt-1.5 pt-1 border-t border-slate-800/80 text-[9px] font-bold text-center">
                            <span className={pCount >= 3 ? 'text-emerald-400' : 'text-amber-300'}>P:{pCount}/3</span>
                            <span className={dCount >= 8 ? 'text-emerald-400' : 'text-slate-300'}>D:{dCount}/8</span>
                            <span className={cCount >= 8 ? 'text-emerald-400' : 'text-sky-300'}>C:{cCount}/8</span>
                            <span className={aCount >= 6 ? 'text-emerald-400' : 'text-rose-300'}>A:{aCount}/6</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* CAMPO DA CALCIO CENTRALE STILE DAZN / SKY */}
                <section
                  className={`w-full lg:flex-1 shrink-0 min-h-[440px] lg:min-h-0 rounded-2xl p-3 flex flex-col items-center justify-between relative overflow-hidden border-2 ${
                    isBlinking ? 'border-amber-400 shadow-[0_0_55px_rgba(245,158,11,0.6)]' : 'border-emerald-400/60'
                  }`}
                  style={{
                    background: `radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.34) 0%, rgba(5, 46, 28, 0.94) 72%, rgba(2, 22, 13, 1) 100%), repeating-linear-gradient(90deg, rgba(16, 120, 68, 0.42) 0px, rgba(16, 120, 68, 0.42) 55px, rgba(8, 82, 45, 0.42) 55px, rgba(8, 82, 45, 0.42) 110px)`
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-25">
                    <div className="absolute inset-2.5 border-2 border-emerald-100 rounded-xl" />
                    <div className="absolute top-1/2 left-2.5 right-2.5 h-0.5 bg-emerald-100 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-44 h-44 border-2 border-emerald-100 rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-emerald-100 rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-60 h-14 border-b-2 border-x-2 border-emerald-100" />
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-60 h-14 border-t-2 border-x-2 border-emerald-100" />
                  </div>

                  {countdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-2">
                      <span className="font-black text-sm uppercase tracking-widest text-red-400 animate-bounce">🚨 ULTIMA CHIAMATA IN SALA! 🚨</span>
                      <div className="text-8xl font-black text-red-500 animate-ping">{countdown}</div>
                    </div>
                  )}

                  <div className="w-full bg-[#060D1E]/95 backdrop-blur-md rounded-xl p-2.5 flex flex-col gap-2 z-10 border border-slate-700/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[140px]">
                        <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cerca calciatore o squadra..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-[#0B132B] rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-1">
                        {[{ code: 'ALL', label: 'Tutti' }, { code: 'P', label: 'Por' }, { code: 'D', label: 'Dif' }, { code: 'C', label: 'Cen' }, { code: 'A', label: 'Att' }].map(r => (
                          <button key={r.code} onClick={() => setSelectedRole(r.code as 'ALL' | Role)} className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${selectedRole === r.code ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-400'}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <button onClick={handleRandomPlayer} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer">
                        <Shuffle size={12} /> 🎲 Pesca a Sorte
                      </button>
                      <button onClick={() => setStartFromOne(!startFromOne)} className="px-2.5 py-1 bg-[#0B132B] border border-slate-700 rounded-lg text-[10px] font-bold text-amber-400 cursor-pointer">
                        Partenza: {startFromOne ? 'Da 1 FM' : 'Da Quotazione'}
                      </button>
                      <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={hidePurchased} onChange={e => setHidePurchased(e.target.checked)} className="accent-amber-500" /> Solo Liberi
                      </label>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto py-1 max-h-14 border-t border-slate-800">
                      {filteredList.slice(0, 60).map(p => (
                        <button key={p.id} onClick={() => handleSelectPlayer(p)} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 cursor-pointer ${activePlayer.id === p.id ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-300'}`}>
                          <span className="mr-1 text-[9px] opacity-75">[{p.role}]</span> {p.name} ({p.basePrice})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center my-auto z-10 text-center space-y-2 py-2">
                    {activeDuel && <div className="bg-rose-600/40 border border-rose-400 px-3 py-0.5 rounded-full text-[10px] font-black uppercase text-rose-100 animate-pulse">🔥 SFIDA TESTA A TESTA: {activeDuel} 🔥</div>}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 bg-[#060D1E]/90 pl-1 pr-2.5 py-0.5 rounded-full uppercase border border-slate-700">
                        <TeamBadge team={activePlayer.team} size={18} /> <span>{activePlayer.team}</span>
                      </div>
                      {isTopPlayer && <span className="text-[10px] font-black text-amber-300 uppercase flex items-center gap-1 bg-amber-500/25 px-2.5 py-0.5 rounded-full border border-amber-400/50"><Flame size={11} /> TOP</span>}
                    </div>
                    <h2 className={`text-4xl md:text-6xl font-black text-white uppercase tracking-tight transition-all drop-shadow-[0_5px_18px_rgba(0,0,0,0.95)] ${isBlinking ? 'scale-105 text-amber-300' : ''}`}>
                      {activePlayer.name}
                    </h2>
                    <div className="flex gap-3 text-xs font-bold text-slate-100 bg-slate-950/85 px-4 py-1 rounded-full border border-slate-700">
                      <span>Quotazione: <strong className="text-amber-400">{activePlayer.basePrice} FM</strong></span>
                      <span>•</span>
                      <span>MV: <strong className="text-emerald-400">{activePlayer.mv || '6.00'}</strong></span>
                      <span>•</span>
                      <span>FM: <strong className="text-cyan-400">{activePlayer.fm || '6.00'}</strong></span>
                    </div>
                  </div>

                  <div className="w-full max-w-3xl bg-[#060D1E]/95 backdrop-blur-md p-3.5 rounded-2xl flex flex-col gap-2.5 z-10 border border-slate-700/80 shadow-2xl">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase block">Miglior Offerente</span>
                        {highestBidder ? <p className="text-lg text-emerald-400 font-black uppercase">{highestBidder}</p> : <p className="text-xs text-slate-400 font-semibold">Si parte da {startingPrice} FM</p>}
                      </div>
                      <div className={`text-4xl md:text-6xl font-black text-amber-400 tabular-nums transition-all ${isSlotSpinning ? 'scale-110 text-white' : 'scale-100'}`}>
                        {displayBid || startingPrice} <span className="text-xl text-amber-300 font-bold">FM</span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <button onClick={() => startGongTimer(3)} className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1.5 cursor-pointer">
                          <Timer size={14} /> 3 SEC (GONG)
                        </button>
                        <div className="flex gap-1.5">
                          <button onClick={handleNextPlayer} className="px-3 py-2 bg-[#0B132B] text-slate-300 font-bold rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer">
                            <SkipForward size={13} /> Salta
                          </button>
                          <button onClick={handleAward} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1.5 cursor-pointer">
                            <Gavel size={15} /> Aggiudica
                          </button>
                        </div>
                      </div>
                    </div>

                    {!isPureTvDisplay && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Offri / Assegna a:</span>
                            <select value={presidentSelectedBidder} onChange={e => setPresidentSelectedBidder(e.target.value)} className="bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-400">
                              {coaches.map(c => <option key={c.name} value={c.name}>{c.name} ({c.budget} FM)</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Prezzo Finale:</span>
                            <input type="number" placeholder="Es. 45" value={manualPriceInput} onChange={e => setManualPriceInput(e.target.value)} className="w-20 bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 text-center" />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 5, 10, 20].map(step => (
                            <button key={step} onClick={() => { setSelectedStep(step); handleRaise(step); }} className={`py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${selectedStep === step ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-white border border-slate-700'}`}>
                              +{step} FM ({presidentSelectedBidder.split(' ')[0]})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="hidden lg:flex w-[205px] shrink-0 bg-[#060D1E] rounded-2xl p-3 flex-col gap-2 overflow-hidden border border-cyan-500/30">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5 pb-1.5 border-b border-cyan-500/20">
                    <History size={13} className="text-emerald-400" /> Ultime Offerte
                  </h3>
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {bidHistory.length > 0 ? bidHistory.map((item, idx) => (
                      <div key={idx} className="bg-[#0B132B]/80 p-2 rounded-xl flex justify-between items-center text-xs border border-slate-800">
                        <div>
                          <span className="font-extrabold text-white block truncate max-w-[85px]">{item.bidder}</span>
                          <span className="text-[9px] text-slate-500">{item.time}</span>
                        </div>
                        <span className="font-black text-emerald-400">{item.amount} FM</span>
                      </div>
                    )) : <p className="text-xs text-slate-500 text-center py-6">In attesa di offerte...</p>}
                  </div>
                </aside>
              </main>
            ) : (
              /* SMARTPHONE BUZZER CON SFOTTO' CORNA/SOLDI/RISATA */
              <main
                className="flex-1 flex flex-col gap-2 max-w-sm mx-auto w-full my-auto overflow-y-auto items-center justify-between relative py-2.5 px-3 rounded-3xl border-2 border-emerald-400/50"
                style={{
                  background: `radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.34) 0%, rgba(5, 42, 26, 0.96) 75%, rgba(2, 18, 11, 1) 100%), repeating-linear-gradient(90deg, rgba(16, 120, 68, 0.35) 0px, rgba(16, 120, 68, 0.35) 45px, rgba(8, 82, 45, 0.35) 45px, rgba(8, 82, 45, 0.35) 90px)`
                }}
              >
                <div className="text-center space-y-1 w-full bg-[#060D1E]/95 p-2.5 rounded-2xl border border-slate-700 z-10">
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className={`px-2 py-0.5 rounded-full uppercase ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role} • {activePlayer.team}</span>
                    <span className="text-amber-400">Crediti: {coaches.find(c => c.name === playerName)?.budget || 0} FM (Max: {getCoachMaxBid(playerName)})</span>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase truncate">{activePlayer.name}</h2>
                  <p className="text-[10px] text-slate-400">
                    Offerta attuale: <strong className="text-amber-400">{highestBidder ? `${highestBidder} (${currentBid} FM)` : `Si parte da ${startingPrice} FM`}</strong>
                  </p>
                </div>

                <div className="w-full bg-[#060D1E]/95 border border-slate-700 rounded-3xl p-3 flex flex-col items-center gap-2.5 z-10">
                  <button
                    disabled={highestBidder === playerName}
                    onClick={() => handleRaise(selectedStep)}
                    className={`w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 transition-all select-none ${
                      highestBidder === playerName ? 'bg-emerald-900/60 border-4 border-emerald-400 text-emerald-300 cursor-not-allowed' : 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 font-black border-4 border-amber-200 shadow-xl active:translate-y-2 cursor-pointer'
                    }`}
                  >
                    <Zap size={24} className={highestBidder === playerName ? 'text-emerald-300' : 'fill-slate-950'} />
                    <span className="text-base font-black uppercase text-center leading-tight px-2">
                      {highestBidder === playerName ? 'SEI IN TESTA' : `OFFRI +${selectedStep}`}
                    </span>
                  </button>

                  <div className="w-full grid grid-cols-4 gap-1.5">
                    {[1, 5, 10, 20].map(step => (
                      <button key={step} onClick={() => setSelectedStep(step)} className={`py-1.5 text-xs font-black rounded-xl border cursor-pointer ${selectedStep === step ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-[#0B132B] border-slate-700 text-white'}`}>
                        +{step}
                      </button>
                    ))}
                  </div>

                  <div className="w-full pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[9px] font-black uppercase text-amber-400 block text-center">📣 Scegli Emoji e Manda uno Sfottò sulla TV:</span>
                    <div className="grid grid-cols-6 gap-1">
                      {EMOJI_CHOICES.map(item => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => {
                            setSelectedCustomEmoji(item);
                            if (!customTauntText.trim()) sendLiveReaction(item.emoji, item.defaultMsg);
                          }}
                          className={`py-1.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer ${selectedCustomEmoji.emoji === item.emoji ? 'bg-amber-500/25 border-amber-400' : 'bg-[#0B132B] border-slate-700'}`}
                        >
                          <span className="text-lg leading-none">{item.emoji}</span>
                          <span className="text-[8px] font-bold text-slate-300 mt-0.5">{item.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        maxLength={45}
                        placeholder={`Scrivi sfottò con ${selectedCustomEmoji.emoji}...`}
                        value={customTauntText}
                        onChange={e => setCustomTauntText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customTauntText.trim()) {
                            sendLiveReaction(selectedCustomEmoji.emoji, customTauntText);
                            setCustomTauntText('');
                          }
                        }}
                        className="flex-1 bg-[#0B132B] border border-slate-700 rounded-xl px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          sendLiveReaction(selectedCustomEmoji.emoji, customTauntText.trim() || selectedCustomEmoji.defaultMsg);
                          setCustomTauntText('');
                        }}
                        className="px-3 bg-amber-500 text-slate-950 font-black rounded-xl text-[10px] uppercase flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Send size={11} /> TV
                      </button>
                    </div>
                  </div>
                </div>
              </main>
            )
          )}

          {activeTab === 'ROSTERS' && (
            <main className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch my-1 overflow-y-auto w-full min-h-0">
              <aside className="w-full lg:w-[240px] shrink-0 bg-[#060D1E] border border-cyan-500/30 rounded-2xl p-3.5 flex flex-col gap-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1"><Shirt size={13} /> Rose Squadre</span>
                  <button onClick={handleExportCSV} className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer">
                    <Download size={11} /> Excel
                  </button>
                </div>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {coaches.map(c => (
                    <button key={c.name} onClick={() => setSelectedRosterCoach(c.name)} className={`w-full flex justify-between items-center p-2.5 rounded-xl border text-left cursor-pointer ${selectedRosterCoach === c.name ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-[#0B132B] border-slate-800 text-white'}`}>
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
                          <p className="text-xs text-slate-400">Offerta Max: <strong className="text-emerald-400">{getCoachMaxBid(currentCoachData?.name || '')} FM</strong></p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-amber-400 block">{currentCoachData?.budget} FM Rimasti</span>
                          <span className="text-xs text-slate-400">{roster.length} / {TOTAL_SLOTS} Acquistati</span>
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
                                    Posto {idx + 1} Libero
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

          {activeTab === 'HIGHLIGHTS' && (
            <main className="flex-1 flex flex-col gap-3 items-center justify-center p-4 bg-[#060D1E] border border-cyan-500/30 rounded-3xl my-1 overflow-y-auto">
              <h2 className="text-2xl font-black text-white uppercase">🏆 CLASSIFICHE & CURIOSITÀ ASTA 🏆</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
                <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-center">
                  <Award size={22} className="text-amber-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Più Crediti Rimasti</span>
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
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Totale Speso in Sala</span>
                  <strong className="text-sm text-white block">{coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0)} FM</strong>
                </div>
                <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-center">
                  <TrendingUp size={22} className="text-purple-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Prezzo Medio</span>
                  <strong className="text-sm text-white block">
                    {Math.round(coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0) / Math.max(1, coaches.reduce((acc, c) => acc + c.playersCount, 0)))} FM
                  </strong>
                </div>
              </div>
            </main>
          )}

          {/* STRISCIA SCORREVOLE IN BASSO STILE "SKY FANTAMERCATO 24" */}
          <div className="w-full bg-[#060D1E] border border-amber-500/40 rounded-xl h-8 flex items-center overflow-hidden shrink-0 shadow-lg mt-0.5">
            <div className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-3 h-full flex items-center gap-1.5 shrink-0 z-10">
              <Zap size={12} className="fill-slate-950" /> ULTIM'ORA MERCATO
            </div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
              <div className="flex whitespace-nowrap gap-10 text-xs font-bold text-slate-200" style={{ animation: 'tickerMarquee 26s linear infinite' }}>
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-2">{item} <span className="text-amber-400">•</span></span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PRE-ASTA PER INVITARE GLI AMICI COL CODICE O WHATSAPP */}
      {showWelcomeGuide && userRole === 'PRESIDENT' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-center relative shadow-2xl">
            <button onClick={() => setShowWelcomeGuide(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            <div>
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-3 py-1 rounded-full">👋 Sala Aste Pronta!</span>
              <h3 className="text-xl font-black text-white uppercase mt-2">Fai entrare i tuoi amici col Telefono</h3>
              <p className="text-xs text-slate-300 mt-1">Dagli questo Codice Stanza o inviaglielo su WhatsApp per attivare i loro Buzzer:</p>
            </div>
            <div className="bg-[#060D1E] border-2 border-dashed border-amber-400 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black uppercase text-amber-400 block">CODICE DELLA TUA STANZA:</span>
              <div className="text-3xl font-black text-white tracking-widest bg-[#0B132B] py-2 px-4 rounded-xl border border-slate-800">{roomCode}</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleCopyRoomCode} className="py-2.5 px-3 bg-slate-800 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer">
                  <Copy size={13} /> {codeCopied ? 'Copiato! ✅' : 'Copia Codice'}
                </button>
                <button type="button" onClick={handleShareWhatsAppInvite} className="py-2.5 px-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer">
                  <Share2 size={13} /> Invia WhatsApp
                </button>
              </div>
            </div>
            <button
              onClick={() => { setShowWelcomeGuide(false); speakTelecronista('Studio televisivo pronto! Buon divertimento!', voiceEnabled); }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer"
            >
              Tutto Chiaro, Inizia l'Asta! ⚽
            </button>
          </div>
        </div>
      )}

      {/* MODALE FIRMA DEL CONTRATTO STILE PLAYSTATION */}
      {awardModal && awardModal.show && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="fixed inset-0 bg-white pointer-events-none z-50" style={{ animation: 'paparazziFlash 0.65s ease-out forwards' }} />
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-center relative shadow-2xl overflow-hidden">
            <button onClick={handleCloseAwardAndNext} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            <div className="flex items-center justify-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest">
              <FileSignature size={15} /> Contratto Ufficiale Firmato • {leagueName}
            </div>
            <div className="bg-[#060D1E] border border-slate-700 rounded-2xl p-4 space-y-3 relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${getRoleBadge(awardModal.player.role)}`}>Ruolo {awardModal.player.role}</span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <TeamBadge team={awardModal.player.team} size={18} /> <span>{awardModal.player.team}</span>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase">{awardModal.player.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Nuovo calciatore ufficiale della squadra di</p>
                <p className="text-xl font-black text-emerald-400 uppercase mt-1">{awardModal.winner}</p>
              </div>
              <div className="bg-[#0B132B] py-2 px-4 rounded-xl border border-amber-500/30 inline-block">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Prezzo di Acquisto</span>
                <span className="text-3xl font-black text-amber-400">{awardModal.price} FM</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Firma del Calciatore</span>
                <div className="text-2xl md:text-3xl text-amber-300 italic font-serif tracking-wider py-1" style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive', animation: 'signContractReveal 0.85s ease-out forwards' }}>
                  {awardModal.player.name}
                </div>
              </div>
              {(() => {
                const stamp = getViralStampInfo(awardModal.price, awardModal.player.basePrice, initialBudget);
                return (
                  <div className={`mt-1 inline-block border-2 ${stamp.border} px-3 py-1 rounded-lg font-black text-xs uppercase bg-slate-950/90`} style={{ animation: 'stampSlamEffect 0.35s ease-out 0.55s backwards' }}>
                    {stamp.label}
                  </div>
                );
              })()}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleDownloadSocialCard} className="w-full py-3 bg-amber-500 text-slate-950 font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer">
                <Sparkles size={16} /> Scarica Card Contratto per WhatsApp
              </button>
              <button onClick={handleCloseAwardAndNext} className="w-full py-2.5 bg-emerald-500 text-slate-950 font-black rounded-2xl text-xs uppercase cursor-pointer">
                Passa al Prossimo Calciatore ⏭️
              </button>
            </div>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#060D1E] border-2 border-cyan-400 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center gap-4 text-center relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            <h3 className="text-lg font-black text-white uppercase">Fai Entrare i tuoi Amici 📱</h3>
            <p className="text-xs text-slate-300">Codice Stanza: <strong className="text-amber-400 text-sm">{roomCode}</strong></p>
            <div className="bg-white p-3 rounded-2xl">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}`} alt="QR Code" className="w-52 h-52" />
            </div>
            <button onClick={handleShareWhatsAppInvite} className="w-full py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer">
              <Share2 size={14} /> Invia Link su WhatsApp
            </button>
          </div>
        </div>
      )}

      {showCustomLeagueModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-amber-500/40 rounded-3xl p-5 max-w-md w-full flex flex-col gap-3 text-center relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowCustomLeagueModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            <h3 className="text-base font-black text-white uppercase">Inserisci i Nomi dei Fantallenatori</h3>
            <input type="text" placeholder="Nome della Lega (es. FantaLega 2026)" value={customLeagueInput} onChange={(e) => setCustomLeagueInput(e.target.value)} className="w-full bg-[#060D1E] border border-slate-700 rounded-xl p-2.5 text-xs text-amber-400 font-bold text-center" />
            <div className="flex items-center justify-between bg-[#060D1E] p-2.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-300 font-bold">Crediti Iniziali:</span>
              <div className="flex gap-1.5">
                {[300, 500, 1000].map(b => (
                  <button key={b} onClick={() => { setInitialBudget(b); setCoaches(prev => prev.map(c => ({ ...c, budget: b, playersCount: 0 }))); setPurchasedPlayers({}); }} className={`px-2.5 py-1 rounded-lg font-black cursor-pointer ${initialBudget === b ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                    {b} FM
                  </button>
                ))}
              </div>
            </div>
            <div className="text-left space-y-2 bg-[#060D1E] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-black uppercase text-cyan-400 block">Partecipanti ({coaches.length}):</span>
              <div className="flex gap-1.5">
                <input type="text" placeholder="Nome amico..." value={newCoachInput} onChange={e => setNewCoachInput(e.target.value)} className="flex-1 bg-[#0B132B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white" />
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
                      <button onClick={() => setCoaches(prev => prev.filter(item => item.name !== c.name))} className="text-rose-400 cursor-pointer"><Trash2 size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                const nameClean = customLeagueInput.trim() || leagueName;
                setLeagueName(nameClean);
                setRoomCode(nameClean.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'LEGA2026');
                setIsDemoMode(false);
                setShowCustomLeagueModal(false);
                setUserRole('PRESIDENT');
                setShowWelcomeGuide(true);
                setShowRoomCodeArrow(true);
                setActiveTab('AUCTION');
              }}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer"
            >
              Crea Stanza ({FREE_TRIAL_PURCHASES_LIMIT} Acquisti Gratis) 🚀
            </button>
          </div>
        </div>
      )}

      {showDemoModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#060D1E] border border-cyan-500/40 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3.5 text-center relative">
            <button onClick={() => setShowDemoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            <h3 className="text-lg font-black text-white uppercase">Prova Demo Gratuita</h3>
            <p className="text-xs text-slate-300">Scegli <strong>Presidente (TV)</strong>: ti daremo subito il <strong>Codice Stanza</strong> per collegare anche il tuo smartphone!</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDemoRoleChoice('PRESIDENT')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${demoRoleChoice === 'PRESIDENT' ? 'bg-amber-500/20 border-amber-400 text-white' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}>
                <Tv size={18} /> <span className="text-xs font-black uppercase">Presidente (TV)</span>
              </button>
              <button onClick={() => setDemoRoleChoice('PLAYER')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${demoRoleChoice === 'PLAYER' ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}>
                <Smartphone size={18} /> <span className="text-xs font-black uppercase">Buzzer Telefono</span>
              </button>
            </div>
            <button onClick={handleLaunchDemo} className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
              Avvia Demo e Mostra Codice Stanza 🚀
            </button>
          </div>
        </div>
      )}

      {showPaywall && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-5 max-w-lg w-full flex flex-col gap-3.5 relative text-center">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            <h2 className="text-xl font-black text-white uppercase">Sblocca l'Asta fino al 25° Calciatore 🏆</h2>
            <div className="grid grid-cols-2 gap-2.5 text-left">
              <button onClick={() => setActivePackage('TV')} className={`p-3 rounded-2xl border-2 cursor-pointer ${activePackage === 'TV' ? 'bg-amber-500/15 border-amber-400' : 'bg-[#060D1E] border-slate-800'}`}>
                <span className="text-xs font-black text-white uppercase block">🖥️ Solo Studio TV</span>
                <span className="text-2xl font-black text-amber-400 block">€2</span>
              </button>
              <button onClick={() => setActivePackage('LIVE')} className={`p-3 rounded-2xl border-2 cursor-pointer ${activePackage === 'LIVE' ? 'bg-emerald-500/15 border-emerald-400' : 'bg-[#060D1E] border-slate-800'}`}>
                <span className="text-xs font-black text-white uppercase block">📱 Arena + Buzzer</span>
                <span className="text-2xl font-black text-emerald-400 block">€{liveRoundPrice} (1€ a testa)</span>
              </button>
            </div>
            {activePackage === 'LIVE' && (
              <div className="bg-[#060D1E] border border-slate-800 rounded-2xl p-3 text-left space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                  <Coins size={13} /> Tabella Colletta 1€ ({collettaPaidCoaches.length}/{coaches.length} raccolti)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {coaches.map(c => {
                    const paid = collettaPaidCoaches.includes(c.name);
                    return (
                      <button key={c.name} type="button" onClick={() => toggleCollettaCoach(c.name)} className={`p-1.5 rounded-lg border text-[11px] font-bold flex justify-between cursor-pointer ${paid ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}>
                        <span className="truncate">{c.name}</span> <span>{paid ? '✅' : '⏳'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={handleUnlockRoomNow} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2">
              <CreditCard size={15} /> Sblocca Ora (€{currentPackagePrice})
            </button>
          </div>
        </div>
      )}

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