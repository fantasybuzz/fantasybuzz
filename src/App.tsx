import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy, Zap, X, SkipForward, History, ShieldCheck, LogOut,
  Share2, Search, Download, Shirt, Play, CreditCard, Tv, Smartphone,
  Monitor, Timer, Flame, Award, PieChart, AlertCircle, TrendingUp, Gavel,
  RotateCcw, Shuffle, UserPlus, Trash2, Sparkles, QrCode, Volume2, VolumeX,
  FileSignature, HelpCircle, ChevronDown, Coins, ArrowUp, Info, Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import rawListone from './data/listone.json';
import { supabase } from './supabase';

// === 1. TIPI, COSTANTI E CONFIGURAZIONE ===
type Role = 'P' | 'D' | 'C' | 'A';
interface Player { id: string; name: string; role: Role; team: string; basePrice: number; mv?: string; fm?: string; }
interface Coach { name: string; teamName: string; budget: number; playersCount: number; }
interface PurchasedItem { player: Player; price: number; }

const ROLE_LIMITS: Record<Role, number> = { P: 3, D: 8, C: 8, A: 6 };
const TOTAL_SLOTS = 25;
const FREE_TRIAL_LIMIT = 6;

const EMOJI_CHOICES = [
  { emoji: '🤘', name: 'Gufata', msg: 'TI STO GUFANDO! SI ROMPE DOMANI!' },
  { emoji: '💸', name: 'Sceicco', msg: 'MA QUANTI SOLDI HAI?! SCEICCO!' },
  { emoji: '😂', name: 'Risata', msg: 'ACQUISTO RIDICOLO AHAHAH!' },
  { emoji: '🤫', name: 'Zitti', msg: 'TUTTI ZITTI, QUESTO È MIO!' },
  { emoji: '🗑️', name: 'Bidone', msg: 'CHE PACCO CLAMOROSO!' },
  { emoji: '💤', name: 'Sveglia', msg: 'SVEGLIAAA! STATE DORMENDO?!' },
];

const TRAILER_SCENES = [
  { badge: 'SCENA 1 • CHIAMATA & BUZZER 3D', title: 'LAUTARO MARTINEZ (38 FM)', sub: '📱 Marco P. preme il Buzzer dal telefono: +10 FM!', icon: '⚡', accent: 'border-amber-400 text-amber-300' },
  { badge: 'SCENA 2 • SFOTTÒ LIVE SULLA TV', title: '🤘 "SI ROMPE DOMANI!"', sub: '📣 Pasquale manda una gufata gigante sullo schermo del salotto!', icon: '🤘', accent: 'border-rose-400 text-rose-300' },
  { badge: 'SCENA 3 • FIRMA CONTRATTO PLAYSTATION', title: 'UFFICIALE AI "SEMPRE ULTIMI F.C."', sub: '✍️ Firma autografa in diretta, Timbro Colpo di Mercato e Card WhatsApp!', icon: '🏆', accent: 'border-emerald-400 text-emerald-300' },
];

const FAQ_ITEMS = [
  { q: 'Posso provare FantasyBuzz gratis con i miei amici prima di pagare?', a: 'Sì! Crei la tua stanza, fai collegare gli amici col Codice Stanza e fate i primi 6 acquisti veri completamente gratis (con Campo TV, Voce Telecronista, Firma Contratti e Buzzer 3D). Zero carte richieste per iniziare.' },
  { q: 'Cosa succede dopo i primi 6 acquisti di prova? Perdiamo i giocatori?', a: 'Assolutamente no! Rose e crediti restano salvati. Al 7° giocatore sbloccate l’asta completa con €2 (Solo TV) o 1€ a testa (€8 fino a 8 amici / €10 da 9+ amici col Buzzer). E l’export Excel è sempre gratuito!' },
  { q: 'Come funziona la Garanzia 100% Soddisfatti o Rimborsati?', a: 'Se durante la serata aveste qualsiasi imprevisto, vi basta richiedere il rimborso entro 24 ore per ricevere indietro il 100% dell’importo senza domande.' }
];

const listoneUfficiale: Player[] = Array.isArray(rawListone) && rawListone.length > 0
  ? rawListone.map((p: any, idx: number) => ({
      id: String(p?.Id || `p_${idx}`),
      name: p?.Nome || 'Calciatore',
      role: (['P', 'D', 'C', 'A'].includes(p?.R) ? p.R : 'C') as Role,
      team: p?.Squadra || 'Serie A',
      basePrice: Number(p?.Qt?.A) || 1,
      mv: String(p?.Mv || '6.00'),
      fm: String(p?.Fm || '6.00'),
    }))
  : [
      { id: '1', name: 'Lautaro Martinez', role: 'A', team: 'Inter', basePrice: 38, mv: '6.65', fm: '8.40' },
      { id: '2', name: 'Svilar', role: 'P', team: 'Roma', basePrice: 15, mv: '6.35', fm: '5.60' },
      { id: '3', name: 'Barella', role: 'C', team: 'Inter', basePrice: 22, mv: '6.45', fm: '7.10' },
      { id: '4', name: 'Buongiorno', role: 'D', team: 'Napoli', basePrice: 16, mv: '6.35', fm: '6.80' },
    ];

const TEAM_BADGES = [
  { aliases: ['inter'], short: 'INT', primary: '#0756a5', ink: '#ffffff' },
  { aliases: ['milan'], short: 'MIL', primary: '#c81d32', ink: '#ffffff' },
  { aliases: ['juve'], short: 'JUV', primary: '#171717', ink: '#ffffff' },
  { aliases: ['napoli'], short: 'NAP', primary: '#087fb5', ink: '#ffffff' },
  { aliases: ['lazio'], short: 'LAZ', primary: '#77b8dd', ink: '#102743' },
  { aliases: ['roma'], short: 'ROM', primary: '#8d1830', ink: '#ffffff' },
  { aliases: ['atalanta'], short: 'ATA', primary: '#13295d', ink: '#ffffff' },
  { aliases: ['fiorentina'], short: 'FIO', primary: '#563184', ink: '#ffffff' },
  { aliases: ['bologna'], short: 'BOL', primary: '#153f83', ink: '#ffffff' },
  { aliases: ['torino'], short: 'TOR', primary: '#7e1c2a', ink: '#ffffff' },
] as const;

const getTeamBadgeStyle = (team: unknown) => {
  const norm = String(team || '').toLowerCase().trim();
  return TEAM_BADGES.find(e => e.aliases.some(a => norm.includes(a))) || { short: norm.slice(0, 3).toUpperCase() || 'FC', primary: '#1e293b', ink: '#ffffff' };
};

// === 2. MOTORE AUDIO E TELECRONISTA VOCALE ===
let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext | null => {
  try {
    if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    return sharedAudioCtx;
  } catch { return null; }
};

const speakTelecronista = (text: string, enabled: boolean) => {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT'; u.rate = 1.06;
      const voices = window.speechSynthesis.getVoices();
      const itVoice = voices.find(v => v.lang.toLowerCase().includes('it') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Elsa'))) || voices.find(v => v.lang.toLowerCase().includes('it'));
      if (itVoice) u.voice = itVoice;
      window.speechSynthesis.speak(u);
    }, 60);
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
const playGongSound = () => playTone(220, 110, 1.0, 'sine');
const playTickSound = (u = false) => playTone(u ? 1200 : 600, u ? 1200 : 600, 0.09, u ? 'sawtooth' : 'sine');
const playContractShowSound = () => {
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

const getRoleBadge = (r: string) => r === 'P' ? 'bg-amber-500 text-slate-950' : r === 'D' ? 'bg-emerald-500 text-slate-950' : r === 'C' ? 'bg-sky-500 text-slate-950' : 'bg-rose-600 text-white';

export default function App() {
  // === 3. STATO ASTA, SQUADRE DI LEGA E SINCRONIZZAZIONE ===
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [highestBidder, setHighestBidder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | Role>('ALL');
  const [hidePurchased, setHidePurchased] = useState(true);
  const [startFromOne, setStartFromOne] = useState<boolean>(() => localStorage.getItem('fb_startFromOne') !== 'false');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => localStorage.getItem('fb_voiceEnabled') !== 'false');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [trailerStep, setTrailerStep] = useState(0);

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

  const [presidentSelectedBidder, setPresidentSelectedBidder] = useState<string>('');
  const [manualPriceInput, setManualPriceInput] = useState<string>('');
  const [activePackage, setActivePackage] = useState<'TV' | 'LIVE'>(() => (localStorage.getItem('fb_activePackage') as 'TV' | 'LIVE') || 'LIVE');
  const [isLicenseUnlocked, setIsLicenseUnlocked] = useState<boolean>(() => localStorage.getItem('fb_unlocked') === 'true');
  const [collettaPaidCoaches, setCollettaPaidCoaches] = useState<string[]>([]);

  const [showCustomLeagueModal, setShowCustomLeagueModal] = useState(false);
  const [customLeagueInput, setCustomLeagueInput] = useState('');
  const [newCoachInput, setNewCoachInput] = useState('');
  const [newTeamNameInput, setNewTeamNameInput] = useState('');
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
    if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    return [
      { name: 'Mario P.', teamName: 'Sempre Ultimi F.C.', budget: 500, playersCount: 0 },
      { name: 'Pasquale R.', teamName: 'Real Madrink', budget: 500, playersCount: 0 },
      { name: 'Gianni L.', teamName: 'Atletico Ma Non Troppo', budget: 500, playersCount: 0 },
      { name: 'Marco T.', teamName: 'AC Tua', budget: 500, playersCount: 0 },
    ];
  });

  const [purchasedPlayers, setPurchasedPlayers] = useState<Record<string, PurchasedItem[]>>(() => {
    const saved = localStorage.getItem('fb_purchasedPlayers');
    if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    return {};
  });

  const [selectedRosterCoach, setSelectedRosterCoach] = useState<string>(coaches[0]?.name || 'Mario P.');
  const [awardModal, setAwardModal] = useState<{ show: boolean; player: Player; winner: string; price: number } | null>(null);
  const [lastAwardHistory, setLastAwardHistory] = useState<{ player: Player; winner: string; price: number } | null>(null);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const liveRoundPrice = coaches.length <= 8 ? 8 : 10;
  const currentPackagePrice = activePackage === 'TV' ? 2 : liveRoundPrice;

  // Rotazione automatica del Mini-Trailer in Home Page
  useEffect(() => {
    if (userRole) return;
    const t = setInterval(() => setTrailerStep(prev => (prev + 1) % TRAILER_SCENES.length), 3200);
    return () => clearInterval(t);
  }, [userRole]);

  useEffect(() => { if (!presidentSelectedBidder && coaches.length > 0) setPresidentSelectedBidder(coaches[0].name); }, [coaches, presidentSelectedBidder]);

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
    if (hidePurchased && purchasedPlayerIds.has(p.id)) return false;
    if (selectedRole !== 'ALL' && p.role !== selectedRole) return false;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.team.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => b.basePrice - a.basePrice || a.name.localeCompare(b.name)), [selectedRole, searchTerm, hidePurchased, purchasedPlayerIds]);

  const activePlayer: Player = currentPlayer || filteredList[0] || listoneUfficiale[0];
  const startingPrice = startFromOne ? 1 : activePlayer.basePrice;

  const registerBidLocally = useCallback((bidder: string, amount: number) => {
    playBuzzSound(); setIsBlinking(true); setCountdown(null); setAwardModal(null);
    setTimeout(() => setIsBlinking(false), 300);
    setHighestBidder(bidder); setCurrentBid(amount);
    setLatestBidAlert({ bidder, amount }); setTimeout(() => setLatestBidAlert(null), 2200);
    setBidHistory(prev => [{ bidder, amount, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...prev]);
  }, []);

  const applyAwardState = useCallback((player: Player, winner: string, price: number, speak = false) => {
    playContractShowSound();
    try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch { /* ignore */ }
    const winnerObj = coaches.find(x => x.name === winner);
    const clubLabel = winnerObj?.teamName || winner;
    if (speak) {
      speakTelecronista(`Colpo di mercato! ${player.name} firma ufficialmente con ${clubLabel} per ${price} fantamilioni!`, voiceEnabled);
    }
    setCoaches(prev => prev.map(c => c.name === winner ? { ...c, budget: c.budget - price, playersCount: c.playersCount + 1 } : c));
    setPurchasedPlayers(prev => ({ ...prev, [winner]: [...(prev[winner] || []), { player, price }] }));
    setLastAwardHistory({ player, winner, price });
    setAwardModal({ show: true, player, winner, price });
    setCurrentBid(0); setHighestBidder(null); setCountdown(null);
  }, [coaches, voiceEnabled]);

  const stateRef = useRef({ coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked });
  useEffect(() => { stateRef.current = { coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked }; }, [coaches, purchasedPlayers, activePlayer, currentBid, highestBidder, userRole, leagueName, startFromOne, isLicenseUnlocked]);

  useEffect(() => {
    if (!roomCode) return;
    const ch = supabase.channel(`room_${roomCode}`)
      .on('broadcast', { event: 'quick_bid' }, ({ payload }: any) => payload?.bidder && registerBidLocally(payload.bidder, payload.amount))
      .on('broadcast', { event: 'start_countdown' }, ({ payload }: any) => setCountdown(payload?.seconds || 3))
      .on('broadcast', { event: 'change_player' }, ({ payload }: any) => {
        if (payload?.player) { setCurrentPlayer(payload.player); setCurrentBid(0); setHighestBidder(null); setBidHistory([]); setCountdown(null); setAwardModal(null); }
      })
      .on('broadcast', { event: 'close_award_modal' }, () => { setAwardModal(null); setCurrentBid(0); setHighestBidder(null); })
      .on('broadcast', { event: 'player_awarded' }, ({ payload }: any) => payload?.player && applyAwardState(payload.player, payload.winner, payload.price, false))
      .on('broadcast', { event: 'sync_league_state' }, ({ payload }: any) => {
        if (payload?.coaches) setCoaches(payload.coaches);
        if (payload?.purchasedPlayers) setPurchasedPlayers(payload.purchasedPlayers);
        if (payload?.leagueName) setLeagueName(payload.leagueName);
        if (payload?.activePlayer) setCurrentPlayer(payload.activePlayer);
        if (typeof payload?.currentBid === 'number') setCurrentBid(payload.currentBid);
        if (payload?.highestBidder !== undefined) setHighestBidder(payload.highestBidder);
        if (typeof payload?.isLicenseUnlocked === 'boolean') setIsLicenseUnlocked(payload.isLicenseUnlocked);
      })
      .on('broadcast', { event: 'live_reaction' }, ({ payload }: any) => {
        if (payload?.sender) { playTickSound(true); setLiveReaction(payload); setTimeout(() => setLiveReaction(null), 3800); }
      })
      .on('broadcast', { event: 'request_sync' }, () => {
        if (stateRef.current.userRole === 'PRESIDENT') ch.send({ type: 'broadcast', event: 'sync_league_state', payload: stateRef.current });
      })
      .subscribe(s => {
        setIsConnected(s === 'SUBSCRIBED');
        if (s === 'SUBSCRIBED') { setActiveChannel(ch); ch.send({ type: 'broadcast', event: 'request_sync', payload: {} }); }
      });
    return () => { supabase.removeChannel(ch); setActiveChannel(null); setIsConnected(false); };
  }, [roomCode, registerBidLocally, applyAwardState]);

  const handleSelectPlayer = useCallback(async (player: Player) => {
    setCurrentPlayer(player); setCurrentBid(0); setHighestBidder(null); setBidHistory([]); setManualPriceInput(''); setCountdown(null); setAwardModal(null);
    if (userRole === 'PRESIDENT') speakTelecronista(`In campo ${player.name}, ${player.team}.`, voiceEnabled);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'change_player', payload: { player } });
  }, [activeChannel, userRole, voiceEnabled]);

  const handleRandomPlayer = useCallback(() => {
    if (filteredList.length > 0) handleSelectPlayer(filteredList[Math.floor(Math.random() * filteredList.length)]);
  }, [filteredList, handleSelectPlayer]);

  const handleNextPlayer = useCallback(() => {
    const rem = listoneUfficiale.filter(p => !purchasedPlayerIds.has(p.id) && p.id !== activePlayer.id && (selectedRole === 'ALL' || p.role === selectedRole));
    handleSelectPlayer(rem[0] || filteredList[0] || listoneUfficiale[0]);
  }, [purchasedPlayerIds, activePlayer.id, selectedRole, filteredList, handleSelectPlayer]);

  const handleCloseAwardAndNext = useCallback(async () => {
    setAwardModal(null);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'close_award_modal', payload: {} });
    if (userRole === 'PRESIDENT') handleNextPlayer();
  }, [activeChannel, userRole, handleNextPlayer]);

  const handleRaise = useCallback(async (step: number, customBidder?: string) => {
    if (purchasedPlayerIds.has(activePlayer.id)) { if (userRole === 'PRESIDENT') handleNextPlayer(); return; }
    const bidder = customBidder || (userRole === 'PRESIDENT' ? (presidentSelectedBidder || coaches[0]?.name) : playerName);
    if (!bidder) return;
    if (userRole === 'PLAYER' && highestBidder === bidder) { setCustomAlertMessage('La tua squadra è già in testa!'); return; }
    const nextBid = highestBidder ? currentBid + step : (startFromOne ? step : Math.max(activePlayer.basePrice, step));
    if (!isDemoMode) {
      if (nextBid > getCoachMaxBid(bidder)) { setCustomAlertMessage(`Puntata max superata per ${bidder} (${getCoachMaxBid(bidder)} FM)!`); return; }
      if (getCoachRoleCount(bidder, activePlayer.role) >= ROLE_LIMITS[activePlayer.role]) { setCustomAlertMessage(`Ruolo ${activePlayer.role} pieno per ${bidder}!`); return; }
    }
    registerBidLocally(bidder, nextBid);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'quick_bid', payload: { bidder, amount: nextBid } });
  }, [purchasedPlayerIds, activePlayer, userRole, handleNextPlayer, presidentSelectedBidder, coaches, playerName, highestBidder, currentBid, startFromOne, isDemoMode, getCoachMaxBid, getCoachRoleCount, registerBidLocally, activeChannel]);

  const handleAward = useCallback(async () => {
    if (purchasedPlayerIds.has(activePlayer.id)) { handleNextPlayer(); return; }
    if (!isDemoMode && !isLicenseUnlocked && totalPurchasesCount >= FREE_TRIAL_LIMIT) { setShowPaywall(true); return; }
    let price = currentBid > 0 ? currentBid : startingPrice;
    const winner = highestBidder || presidentSelectedBidder || coaches[0]?.name;
    if (manualPriceInput && Number(manualPriceInput) > 0) price = Number(manualPriceInput);
    if (!isDemoMode) {
      if (getCoachRoleCount(winner, activePlayer.role) >= ROLE_LIMITS[activePlayer.role]) { setCustomAlertMessage(`Ruolo ${activePlayer.role} già completato per ${winner}!`); return; }
      if (price > getCoachMaxBid(winner)) { setCustomAlertMessage(`Budget insufficiente per ${winner}!`); return; }
    }
    applyAwardState(activePlayer, winner, price, userRole === 'PRESIDENT');
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'player_awarded', payload: { player: activePlayer, winner, price } });
  }, [purchasedPlayerIds, activePlayer, handleNextPlayer, isDemoMode, isLicenseUnlocked, totalPurchasesCount, currentBid, startingPrice, highestBidder, presidentSelectedBidder, coaches, manualPriceInput, getCoachRoleCount, getCoachMaxBid, applyAwardState, userRole, activeChannel]);

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
    playTickSound(true); setLiveReaction(payload); setTimeout(() => setLiveReaction(null), 3800);
    if (activeChannel) await activeChannel.send({ type: 'broadcast', event: 'live_reaction', payload });
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      if (countdown === 3) { playGongSound(); if (userRole === 'PRESIDENT') speakTelecronista('Ultima chiamata! Tre, due, uno...', voiceEnabled); }
      else playTickSound(countdown <= 2);
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else { setCountdown(null); if (userRole === 'PRESIDENT') handleAward(); }
  }, [countdown, userRole, voiceEnabled, handleAward]);

  // === 4. CONDIVISIONE VIRALE WHATSAPP & CARD SOCIAL ===
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const handleShareWhatsAppInvite = () => window.open(`https://wa.me/?text=${encodeURIComponent(`⚽ Entra nello studio TV dell'asta *${leagueName}*!\n📲 Clicca qui per aprire il tuo Buzzer: ${inviteUrl}\n🔑 Codice Stanza: *${roomCode}*`)}`, '_blank');
  const handleCopyRoomCode = () => { navigator.clipboard?.writeText(roomCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); };

  const handleShareViralDealWhatsApp = () => {
    if (!awardModal) return;
    const winnerObj = coaches.find(x => x.name === awardModal.winner);
    const club = winnerObj?.teamName || awardModal.winner;
    const viralText = `🔥 *COLPO DI MERCATO UFFICIALE!* 🔥\n✍️ *${awardModal.player.name}* (${awardModal.player.team}) firma con *${club.toUpperCase()}* (${awardModal.winner}) per *${awardModal.price} FM*!\n\n📺 Asta trasformata in uno Show TV con *FantasyBuzz*!\n👉 Provalo gratis con la tua lega su ${window.location.origin} e seguici su Instagram/TikTok *@FantasyBuzzApp*!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(viralText)}`, '_blank');
  };

  const handleDownloadSocialCard = () => {
    if (!awardModal) return;
    const winnerObj = coaches.find(x => x.name === awardModal.winner);
    const club = winnerObj?.teamName || `FC ${awardModal.winner}`;
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, '#021B12'); bg.addColorStop(0.5, '#062E1E'); bg.addColorStop(1, '#021B12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1920);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 8; ctx.strokeRect(40, 40, 1000, 1840);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.font = '900 56px sans-serif'; ctx.fillText('FANTASYBUZZ LIVE ARENA', 540, 170);
    ctx.fillStyle = '#F59E0B'; ctx.font = '800 34px sans-serif'; ctx.fillText(leagueName.toUpperCase(), 540, 230);
    ctx.fillStyle = '#10b981'; ctx.font = '900 42px sans-serif'; ctx.fillText('🔥 COLPO DI MERCATO UFFICIALE 🔥', 540, 340);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 82px sans-serif'; ctx.fillText(awardModal.player.name.toUpperCase(), 540, 740);
    ctx.fillStyle = '#94A3B8'; ctx.font = '700 34px sans-serif'; ctx.fillText(`RUOLO ${awardModal.player.role} • ${awardModal.player.team.toUpperCase()}`, 540, 815);
    ctx.fillStyle = '#F59E0B'; ctx.font = '900 155px sans-serif'; ctx.fillText(`${awardModal.price} FM`, 540, 1080);
    ctx.fillStyle = '#10b981'; ctx.font = '900 58px sans-serif'; ctx.fillText(club.toUpperCase(), 540, 1360);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '700 34px sans-serif'; ctx.fillText(`Presidente: ${awardModal.winner}`, 540, 1425);
    ctx.fillStyle = '#F59E0B'; ctx.font = '900 32px sans-serif'; ctx.fillText('📲 Seguici su IG & TikTok: @FantasyBuzzApp', 540, 1750);
    const a = document.createElement('a'); a.download = `Colpo_${awardModal.player.name}.png`; a.href = c.toDataURL(); a.click();
  };

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,Squadra Fantacalcio,Allenatore,Calciatore,Ruolo,Club Serie A,Prezzo\n';
    coaches.forEach(c => (purchasedPlayers[c.name] || []).forEach(i => { csv += `"${c.teamName}","${c.name}","${i.player.name}","${i.player.role}","${i.player.team}",${i.price}\n`; }));
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = `Rose_${leagueName}.csv`; a.click();
  };

  const handleLaunchDemo = () => {
    setIsDemoMode(true); setActivePackage('LIVE');
    setRoomCode(`DEMO_${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setLeagueName('Lega Demo Show TV');
    const dc = [
      { name: 'Mario P. (Tu)', teamName: 'Sempre Ultimi F.C.', budget: 500, playersCount: 0 },
      { name: 'Pasquale R.', teamName: 'Real Madrink', budget: 500, playersCount: 0 },
      { name: 'Gianni L.', teamName: 'Atletico Ma Non Troppo', budget: 500, playersCount: 0 },
    ];
    setCoaches(dc); setPurchasedPlayers({}); setCurrentBid(0); setHighestBidder(null); setPresidentSelectedBidder(dc[0].name);
    if (demoRoleChoice === 'PRESIDENT') { setUserRole('PRESIDENT'); setShowWelcomeGuide(true); setShowRoomCodeArrow(true); }
    else { setPlayerName(dc[0].name); setSelectedRosterCoach(dc[0].name); setUserRole('PLAYER'); }
    setShowDemoModal(false);
  };

  const richestCoach = useMemo(() => [...coaches].sort((a, b) => b.budget - a.budget)[0], [coaches]);
  const fullestCoach = useMemo(() => [...coaches].sort((a, b) => b.playersCount - a.playersCount)[0], [coaches]);
  const tickerItems = useMemo(() => {
    const items = allPurchasesFeed.slice(0, 8).map(p => `✅ UFFICIALE: ${p.player.name.toUpperCase()} AI "${p.teamName.toUpperCase()}" (${p.coachName}) PER ${p.price} FM`);
    if (items.length === 0) items.push(`⚽ STUDIO FANTASYBUZZ APERTO PER "${leagueName.toUpperCase()}" • CODICE STANZA AMICI: ${roomCode}`);
    if (richestCoach) items.push(`💰 PAPERONE: ${richestCoach.teamName.toUpperCase()} (${richestCoach.budget} FM)`);
    return items;
  }, [allPurchasesFeed, leagueName, roomCode, richestCoach]);

  // === 5. INTERFACCIA UTENTE (HOME CON TRAILER, TABELLONE TV, BUZZER TELEFONO E POPUP) ===
  return (
    <>
      <style>{`
        @keyframes paparazziFlash { 0% { opacity: 0.95; } 25% { opacity: 0.1; } 45% { opacity: 0.85; } 100% { opacity: 0; } }
        @keyframes signContractReveal { 0% { clip-path: inset(0 100% 0 0); } 100% { clip-path: inset(0 0 0 0); } }
        @keyframes stampSlamEffect { 0% { transform: scale(3.5) rotate(-25deg); opacity: 0; } 100% { transform: scale(1) rotate(-8deg); opacity: 1; } }
        @keyframes tickerMarquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
      `}</style>

      {!userRole ? (
        <div className="min-h-screen w-full bg-[#030914] text-white flex flex-col items-center justify-between p-4 md:p-6 select-none overflow-y-auto">
          <div className="max-w-3xl w-full text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#060D1E] border border-amber-500/40 px-4 py-1 rounded-full">
              <BuzzMark size={20} /> <span className="text-xs font-black uppercase text-amber-400">FantasyBuzz • Gran Galà del Fantamercato</span>
            </div>
            <h1 className="text-2xl md:text-5xl font-black uppercase leading-tight">
              Stanco del solito foglio Excel?<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400">Trasforma l'Asta in uno Show TV.</span>
            </h1>
          </div>

          {/* MINI-TRAILER FLASH INTERATTIVO AUTOMATICO IN HOME PAGE */}
          <div className="max-w-2xl w-full my-3 bg-gradient-to-r from-[#060D1E] via-[#0B2219] to-[#060D1E] border-2 border-emerald-500/40 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-400/40 px-2.5 py-0.5 rounded-full">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" /> ANTEPRIMA LIVE IN AZIONE
              </span>
              <div className="flex gap-1">
                {TRAILER_SCENES.map((_, i) => (
                  <button key={i} onClick={() => setTrailerStep(i)} className={`h-1.5 rounded-full transition-all cursor-pointer ${trailerStep === i ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'}`} />
                ))}
              </div>
            </div>
            <div className={`p-3.5 rounded-2xl bg-[#030914]/80 border ${TRAILER_SCENES[trailerStep].accent} flex items-center gap-4 transition-all duration-300`}>
              <div className="text-4xl shrink-0">{TRAILER_SCENES[trailerStep].icon}</div>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-80 block">{TRAILER_SCENES[trailerStep].badge}</span>
                <h4 className="text-base md:text-lg font-black text-white uppercase">{TRAILER_SCENES[trailerStep].title}</h4>
                <p className="text-xs text-slate-300">{TRAILER_SCENES[trailerStep].sub}</p>
              </div>
            </div>
          </div>

          {/* SCELTA TRASPARENTE MODALITÀ */}
          <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 my-2">
            <div className="bg-[#060D1E] border-2 border-amber-500/40 rounded-3xl p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">Asta a Voce</span>
                  <span className="text-2xl font-black text-amber-400">€2</span>
                </div>
                <h3 className="text-base font-black uppercase flex items-center gap-2"><Tv size={18} className="text-amber-400" /> 1. Solo Tabellone TV</h3>
                <p className="text-xs text-slate-300 mt-1">Colleghi il PC alla TV, gli amici chiamano a voce e tu assegni i colpi alle Squadre con 1 click.</p>
              </div>
              <button onClick={() => { setActivePackage('TV'); setShowCustomLeagueModal(true); }} className="w-full py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
                Inizia Gratis Modalità TV ({FREE_TRIAL_LIMIT} Acquisti) 🖥️
              </button>
            </div>

            <div className="bg-[#060D1E] border-2 border-emerald-500/50 rounded-3xl p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">TV + Telefoni</span>
                  <span className="text-2xl font-black text-emerald-400">€1 <span className="text-xs">/ a testa</span></span>
                </div>
                <h3 className="text-base font-black uppercase flex items-center gap-2"><Smartphone size={18} className="text-emerald-400" /> 2. TV + Telefoni Buzzer</h3>
                <p className="text-xs text-slate-300 mt-1">Ogni amico inserisce il Codice Stanza sul telefono per rilanciare col Buzzer e mandare sfottò (🤘 💸 😂) sulla TV.</p>
              </div>
              <button onClick={() => { setActivePackage('LIVE'); setShowCustomLeagueModal(true); }} className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">
                Inizia Gratis con Buzzer ({FREE_TRIAL_LIMIT} Acquisti) 🚀
              </button>
            </div>
          </div>

          <div className="max-w-md w-full bg-[#060D1E] border border-cyan-500/30 rounded-3xl p-4 flex flex-col gap-3 my-2">
            <div className="bg-[#0B132B] p-3 rounded-2xl space-y-2 border border-cyan-500/20 text-center">
              <span className="text-[10px] font-black uppercase text-cyan-400 block">Hai il Codice Stanza del Presidente? Scrivilo qui:</span>
              <div className="flex gap-2">
                <input type="text" placeholder="Codice Stanza..." value={inputLeagueName} onChange={e => { setInputLeagueName(e.target.value); setIsRoomCodeConfirmed(false); }} className="flex-1 bg-[#060D1E] border border-slate-700 rounded-xl p-2 text-xs text-amber-400 font-black text-center uppercase" />
                <button onClick={() => inputLeagueName.trim() ? (setRoomCode(inputLeagueName.trim().toUpperCase()), setIsRoomCodeConfirmed(true)) : setCustomAlertMessage('Inserisci il Codice Stanza!')} className="px-3 bg-cyan-500 text-slate-950 rounded-xl font-black text-xs uppercase cursor-pointer">Entra ⚡</button>
              </div>
              {isRoomCodeConfirmed && (
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800">
                  {coaches.map(c => (
                    <button key={c.name} onClick={() => { setIsDemoMode(false); setPlayerName(c.name); setSelectedRosterCoach(c.name); setUserRole('PLAYER'); }} className="p-2 bg-[#060D1E] border border-slate-800 rounded-lg text-left cursor-pointer">
                      <span className="font-extrabold text-amber-400 text-xs block truncate">{c.teamName}</span>
                      <span className="text-[9px] text-slate-300 block truncate">{c.name} • {c.budget} FM</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShowDemoModal(true)} className="w-full py-2.5 bg-[#0B132B] border border-emerald-500/40 text-emerald-300 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer">
              <Play size={14} /> Prova Demo Veloce (Mostra Codice Stanza)
            </button>
          </div>

          <div className="max-w-2xl w-full my-3 bg-[#060D1E] border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5"><HelpCircle size={15} /> Domande Frequenti & Garanzia 100% Rimborso</h3>
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="border border-slate-800 rounded-xl bg-[#0B132B]/70 overflow-hidden">
                <button onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)} className="w-full p-2.5 text-left flex justify-between text-xs font-bold text-white cursor-pointer">
                  <span>{item.q}</span> <ChevronDown size={15} className="text-amber-400" />
                </button>
                {openFaqIndex === idx && <div className="px-3 pb-2.5 text-[11px] text-slate-300 border-t border-slate-800 pt-2">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-screen w-screen font-sans flex flex-col justify-between p-2 select-none overflow-hidden relative z-10 bg-[#030914] text-slate-200">
          {!isLicenseUnlocked && (
            <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl px-3 py-1 mb-1 flex items-center justify-between text-[11px] shrink-0">
              <span>🎁 <strong className="text-amber-400">{isDemoMode ? 'Demo:' : 'Prova Gratis:'}</strong> {totalPurchasesCount}/{FREE_TRIAL_LIMIT} acquisti fatti</span>
              <div className="flex gap-2">
                <button onClick={() => setShowWelcomeGuide(true)} className="bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-black px-2 py-0.5 rounded-lg text-[10px] uppercase cursor-pointer flex items-center gap-1"><Info size={11} /> Invita Amici</button>
                <button onClick={() => setShowPaywall(true)} className="bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-[10px] uppercase cursor-pointer">Sblocca Asta (€{currentPackagePrice})</button>
              </div>
            </div>
          )}

          {liveReaction && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 px-6 py-3.5 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce max-w-md w-[92%]">
              <span className="text-5xl">{liveReaction.emoji}</span>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 block">📣 SFOTTÒ DA {liveReaction.sender.toUpperCase()}:</span>
                <span className="text-base font-black uppercase text-white">"{liveReaction.label}"</span>
              </div>
            </div>
          )}

          <header className="flex flex-wrap justify-between items-center p-2 px-3 rounded-2xl bg-[#060D1E] border border-cyan-500/30 shrink-0 gap-2 relative">
            <div className="flex items-center gap-3">
              <BuzzMark size={26} />
              {userRole === 'PRESIDENT' && activePackage === 'LIVE' && (
                <div className="relative">
                  <div onClick={() => setShowWelcomeGuide(true)} className="bg-amber-500/20 border-2 border-amber-400 px-3 py-1 rounded-xl flex items-center gap-2 cursor-pointer">
                    <QrCode size={14} className="text-amber-400" />
                    <span className="text-xs font-black text-white">CODICE: <strong className="text-amber-300 tracking-widest">{roomCode}</strong></span>
                  </div>
                  {showRoomCodeArrow && (
                    <div onClick={() => setShowRoomCodeArrow(false)} className="absolute top-11 left-0 z-40 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl shadow-2xl border-2 border-white w-56 animate-bounce cursor-pointer">
                      <div className="flex items-center gap-1 font-black text-[10px] uppercase"><ArrowUp size={13} /> <span>Dai questo codice agli amici!</span></div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-800">
                <button onClick={() => setActiveTab('AUCTION')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'AUCTION' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}><Zap size={12} /> Campo Asta</button>
                <button onClick={() => setActiveTab('ROSTERS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'ROSTERS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}><Shirt size={12} /> Rose ({totalPurchasesCount})</button>
                <button onClick={() => setActiveTab('HIGHLIGHTS')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${activeTab === 'HIGHLIGHTS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}><Award size={12} /> Classifiche</button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{isConnected ? '🟢 Connesso' : 'Connessione...'}</span>
              {userRole === 'PRESIDENT' && (
                <>
                  <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-amber-300 flex items-center gap-1 cursor-pointer">{voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />} {voiceEnabled ? 'Voce ON' : 'Muto'}</button>
                  <button onClick={handleShareWhatsAppInvite} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 cursor-pointer"><Share2 size={12} /> WhatsApp</button>
                  {lastAwardHistory && <button onClick={handleUndoLastAward} className="px-2 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 flex items-center gap-1 cursor-pointer"><RotateCcw size={12} /> Annulla</button>}
                  <button onClick={() => setIsPureTvDisplay(!isPureTvDisplay)} className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 cursor-pointer"><Monitor size={12} /></button>
                </>
              )}
              <button onClick={() => { setUserRole(null); setPlayerName(''); }} className="text-xs bg-slate-800 text-slate-400 font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"><LogOut size={12} /></button>
            </div>
          </header>

          {activeTab === 'AUCTION' && (
            userRole === 'PRESIDENT' ? (
              <main className="flex-1 flex flex-col lg:flex-row gap-2.5 items-stretch my-1 overflow-y-auto lg:overflow-hidden w-full relative min-h-0">
                {latestBidAlert && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-5 py-1.5 rounded-2xl shadow-2xl border-2 border-white animate-bounce flex items-center gap-2">
                    <Zap size={16} /> <span className="text-xs uppercase">{getCoachDisplay(latestBidAlert.bidder)}: {latestBidAlert.amount} FM!</span>
                  </div>
                )}

                {/* COLONNA SINISTRA CON NOME SQUADRA FANTACALCIO IN GRANDE E PERSONA IN PICCOLO */}
                <aside className="w-full lg:w-[270px] shrink-0 bg-[#060D1E] rounded-2xl p-3 flex flex-col gap-2 overflow-hidden border border-cyan-500/30">
                  <div className="flex justify-between pb-1.5 border-b border-cyan-500/20 text-xs font-black text-cyan-400">
                    <span className="flex items-center gap-1"><Trophy size={13} className="text-amber-400" /> Club in Sala</span>
                    <span className="text-[9px] text-amber-300">👆 Clicca = +1 FM</span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto flex-1">
                    {coaches.map(c => (
                      <div key={c.name} onClick={() => { setPresidentSelectedBidder(c.name); handleRaise(1, c.name); }} className={`p-2 rounded-xl cursor-pointer ${highestBidder === c.name ? 'bg-emerald-500/20 border-2 border-emerald-400' : presidentSelectedBidder === c.name ? 'bg-amber-500/15 border border-amber-400/60' : 'bg-[#0B132B] border border-slate-800'}`}>
                        <div className="flex justify-between items-start">
                          <div className="truncate pr-1">
                            <span className="font-black text-xs text-white uppercase block truncate">{c.teamName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block truncate">Mister: {c.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-amber-400 text-xs block">{c.budget} FM</span>
                            <span className="text-[9px] text-emerald-400 font-bold">Max {getCoachMaxBid(c.name)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-1 pt-1 border-t border-slate-800 text-[9px] font-bold text-center text-slate-300">
                          <span>P:{getCoachRoleCount(c.name, 'P')}/3</span>
                          <span>D:{getCoachRoleCount(c.name, 'D')}/8</span>
                          <span>C:{getCoachRoleCount(c.name, 'C')}/8</span>
                          <span>A:{getCoachRoleCount(c.name, 'A')}/6</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>

                {/* CAMPO DA CALCIO CENTRALE STILE DAZN / SKY */}
                <section
                  className={`w-full lg:flex-1 shrink-0 min-h-[430px] lg:min-h-0 rounded-2xl p-3 flex flex-col items-center justify-between relative overflow-hidden border-2 ${isBlinking ? 'border-amber-400' : 'border-emerald-400/60'}`}
                  style={{ background: `radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.34) 0%, rgba(5, 46, 28, 0.94) 72%, rgba(2, 22, 13, 1) 100%), repeating-linear-gradient(90deg, rgba(16, 120, 68, 0.42) 0px, rgba(16, 120, 68, 0.42) 55px, rgba(8, 82, 45, 0.42) 55px, rgba(8, 82, 45, 0.42) 110px)` }}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-25">
                    <div className="absolute inset-2.5 border-2 border-emerald-100 rounded-xl" />
                    <div className="absolute top-1/2 left-2.5 right-2.5 h-0.5 bg-emerald-100 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-40 h-40 border-2 border-emerald-100 rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-56 h-12 border-b-2 border-x-2 border-emerald-100" />
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-56 h-12 border-t-2 border-x-2 border-emerald-100" />
                  </div>

                  {countdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/85 z-30 flex flex-col items-center justify-center">
                      <span className="font-black text-sm uppercase text-red-400 animate-bounce">🚨 ULTIMA CHIAMATA! 🚨</span>
                      <div className="text-8xl font-black text-red-500 animate-ping">{countdown}</div>
                    </div>
                  )}

                  <div className="w-full bg-[#060D1E]/95 rounded-xl p-2 flex flex-col gap-2 z-10 border border-slate-700">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="relative flex-1 min-w-[130px]">
                        <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                        <input type="text" placeholder="Cerca calciatore..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0B132B] rounded-lg py-1 pl-7 pr-2 text-xs text-white" />
                      </div>
                      {(['ALL', 'P', 'D', 'C', 'A'] as const).map(r => (
                        <button key={r} onClick={() => setSelectedRole(r)} className={`px-2 py-1 rounded-lg text-xs font-black cursor-pointer ${selectedRole === r ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-400'}`}>{r === 'ALL' ? 'Tutti' : r}</button>
                      ))}
                      <button onClick={handleRandomPlayer} className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"><Shuffle size={12} /> 🎲 Pesca a Sorte</button>
                      <button onClick={() => setStartFromOne(!startFromOne)} className="px-2 py-1 bg-[#0B132B] border border-slate-700 rounded-lg text-[10px] font-bold text-amber-400 cursor-pointer">{startFromOne ? 'Da 1 FM' : 'Quotazione'}</button>
                      <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer"><input type="checkbox" checked={hidePurchased} onChange={e => setHidePurchased(e.target.checked)} /> Liberi</label>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto py-1 max-h-12 border-t border-slate-800">
                      {filteredList.slice(0, 50).map(p => (
                        <button key={p.id} onClick={() => handleSelectPlayer(p)} className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${activePlayer.id === p.id ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-300'}`}>[{p.role}] {p.name} ({p.basePrice})</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center my-auto z-10 text-center space-y-1.5">
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
                        <button onClick={() => { setCountdown(3); if (activeChannel) activeChannel.send({ type: 'broadcast', event: 'start_countdown', payload: { seconds: 3 } }); }} className="px-3 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer"><Timer size={14} /> 3s Gong</button>
                        <button onClick={handleNextPlayer} className="px-3 py-2 bg-[#0B132B] text-slate-300 font-bold rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer"><SkipForward size={13} /> Salta</button>
                        <button onClick={handleAward} className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center gap-1 cursor-pointer"><Gavel size={15} /> Aggiudica</button>
                      </div>
                    </div>
                    {!isPureTvDisplay && (
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <select value={presidentSelectedBidder} onChange={e => setPresidentSelectedBidder(e.target.value)} className="bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-amber-400">
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
            ) : (
              /* SMARTPHONE BUZZER LEGGERO CON 6 BOTTONI SFOTTÒ ISTANTANEI (ZERO TASTIERA) */
              <main
                className="flex-1 flex flex-col gap-2 max-w-sm mx-auto w-full my-auto overflow-y-auto items-center justify-between py-2.5 px-3 rounded-3xl border-2 border-emerald-400/50"
                style={{ background: `radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.34) 0%, rgba(5, 42, 26, 0.96) 75%, rgba(2, 18, 11, 1) 100%), repeating-linear-gradient(90deg, rgba(16, 120, 68, 0.35) 0px, rgba(16, 120, 68, 0.35) 45px, rgba(8, 82, 45, 0.35) 45px, rgba(8, 82, 45, 0.35) 90px)` }}
              >
                <div className="text-center w-full bg-[#060D1E]/95 p-2.5 rounded-2xl border border-slate-700">
                  <div className="flex justify-between text-[10px] font-black mb-1">
                    <span className={`px-2 py-0.5 rounded-full ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role} • {activePlayer.team}</span>
                    <span className="text-amber-400">Crediti: {coaches.find(c => c.name === playerName)?.budget || 0} FM (Max: {getCoachMaxBid(playerName)})</span>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase truncate">{activePlayer.name}</h2>
                  <p className="text-[10px] text-slate-400">In testa: <strong className="text-amber-400">{highestBidder ? `${getCoachDisplay(highestBidder)} (${currentBid} FM)` : `Da ${startingPrice} FM`}</strong></p>
                </div>

                <div className="w-full bg-[#060D1E]/95 border border-slate-700 rounded-3xl p-3 flex flex-col items-center gap-2.5">
                  <button disabled={highestBidder === playerName} onClick={() => handleRaise(selectedStep)} className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-1 select-none ${highestBidder === playerName ? 'bg-emerald-900/60 border-4 border-emerald-400 text-emerald-300' : 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 font-black border-4 border-amber-200 shadow-xl active:translate-y-2 cursor-pointer'}`}>
                    <Zap size={26} /> <span className="text-base font-black uppercase">{highestBidder === playerName ? 'SEI IN TESTA' : `OFFRI +${selectedStep}`}</span>
                  </button>
                  <div className="w-full grid grid-cols-4 gap-1.5">
                    {[1, 5, 10, 20].map(s => (
                      <button key={s} onClick={() => setSelectedStep(s)} className={`py-1.5 text-xs font-black rounded-xl border cursor-pointer ${selectedStep === s ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-[#0B132B] border-slate-700 text-white'}`}>+{s}</button>
                    ))}
                  </div>
                  <div className="w-full pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-amber-400 block text-center">📣 Tocca per sparare uno Sfottò in diretta sulla TV:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {EMOJI_CHOICES.map(item => (
                        <button key={item.name} onClick={() => sendLiveReaction(item.emoji, item.msg)} className="py-2 rounded-xl border bg-[#0B132B] hover:bg-slate-800 border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                          <span className="text-lg leading-none">{item.emoji}</span>
                          <span className="text-[10px] font-black text-slate-200">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            )
          )}

          {activeTab === 'ROSTERS' && (
            <main className="flex-1 flex flex-col lg:flex-row gap-3 my-1 overflow-y-auto w-full min-h-0">
              <aside className="w-full lg:w-[240px] bg-[#060D1E] border border-cyan-500/30 rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-cyan-400 uppercase">Club di Lega</span>
                  <button onClick={handleExportCSV} className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"><Download size={11} /> Excel</button>
                </div>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {coaches.map(c => (
                    <button key={c.name} onClick={() => setSelectedRosterCoach(c.name)} className={`w-full flex justify-between items-center p-2 rounded-xl border text-left cursor-pointer ${selectedRosterCoach === c.name ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-[#0B132B] border-slate-800 text-white'}`}>
                      <div className="truncate pr-1">
                        <span className="font-black text-xs block truncate uppercase">{c.teamName}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{c.name}</span>
                      </div>
                      <span className="font-black text-amber-400 text-xs shrink-0">{c.budget} FM</span>
                    </button>
                  ))}
                </div>
              </aside>
              <section className="flex-1 bg-[#060D1E] border border-cyan-500/30 rounded-2xl p-4 overflow-y-auto space-y-3">
                {(['P', 'D', 'C', 'A'] as const).map(role => {
                  const items = (purchasedPlayers[selectedRosterCoach] || []).filter(i => i.player.role === role);
                  return (
                    <div key={role} className="space-y-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${getRoleBadge(role)}`}>{role} ({items.length}/{ROLE_LIMITS[role]})</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
                        {Array.from({ length: ROLE_LIMITS[role] }).map((_, idx) => items[idx] ? (
                          <div key={idx} className="bg-[#0B132B] border border-slate-800 p-2 rounded-lg text-xs">
                            <span className="font-bold block truncate">{items[idx].player.name}</span>
                            <span className="text-amber-400 font-black text-[10px]">{items[idx].price} FM</span>
                          </div>
                        ) : <div key={idx} className="bg-[#0B132B]/40 border border-dashed border-slate-800 p-2 rounded-lg text-[9px] text-slate-600 text-center">Libero</div>)}
                      </div>
                    </div>
                  );
                })}
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

          {/* STRISCIA SCORREVOLE CON I NOMI DELLE SQUADRE DI LEGA (ES. SEMPRE ULTIMI F.C.) */}
          <div className="w-full bg-[#060D1E] border border-amber-500/40 rounded-xl h-8 flex items-center overflow-hidden shrink-0 shadow-lg mt-0.5">
            <div className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-3 h-full flex items-center gap-1 shrink-0 z-10"><Zap size={12} /> ULTIM'ORA MERCATO</div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
              <div className="flex whitespace-nowrap gap-10 text-xs font-bold text-slate-200" style={{ animation: 'tickerMarquee 24s linear infinite' }}>
                {[...tickerItems, ...tickerItems].map((item, i) => <span key={i} className="inline-flex items-center gap-2">{item} <span className="text-amber-400">•</span></span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PRE-ASTA PER INVITARE GLI AMICI */}
      {showWelcomeGuide && userRole === 'PRESIDENT' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-center relative">
            <button onClick={() => setShowWelcomeGuide(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={18} /></button>
            <h3 className="text-xl font-black text-white uppercase">Fai entrare i tuoi amici col Telefono 📱</h3>
            <p className="text-xs text-slate-300">Per far usare il Buzzer agli amici (anche adesso in Demo!), dagli questo Codice Stanza o inviaglielo su WhatsApp:</p>
            <div className="bg-[#060D1E] border-2 border-dashed border-amber-400 rounded-2xl p-4 space-y-3">
              <div className="text-3xl font-black text-white tracking-widest bg-[#0B132B] py-2 rounded-xl">{roomCode}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCopyRoomCode} className="py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"><Copy size={13} /> {codeCopied ? 'Copiato! ✅' : 'Copia Codice'}</button>
                <button onClick={handleShareWhatsAppInvite} className="py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"><Share2 size={13} /> Invia WhatsApp</button>
              </div>
            </div>
            <button onClick={() => { setShowWelcomeGuide(false); speakTelecronista('Studio televisivo pronto! Buon divertimento!', voiceEnabled); }} className="w-full py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">Tutto Chiaro, Inizia l'Asta! ⚽</button>
          </div>
        </div>
      )}

      {/* MODALE FIRMA CONTRATTO PLAYSTATION CON TIMBRO UNIVERSALE "COLPO DI MERCATO" & LEVA VIRALE */}
      {awardModal && awardModal.show && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="fixed inset-0 bg-white pointer-events-none z-50" style={{ animation: 'paparazziFlash 0.65s ease-out forwards' }} />
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full flex flex-col gap-3.5 text-center relative">
            <button onClick={handleCloseAwardAndNext} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={18} /></button>
            <div className="flex items-center justify-center gap-2 text-amber-400 text-[10px] font-black uppercase"><FileSignature size={15} /> Deposito Contratto Ufficiale</div>
            <div className="bg-[#060D1E] border border-slate-700 rounded-2xl p-4 space-y-2">
              <h2 className="text-3xl font-black text-white uppercase">{awardModal.player.name}</h2>
              <p className="text-xs text-slate-400">Firma ufficialmente per la società</p>
              <p className="text-xl font-black text-emerald-400 uppercase">{coaches.find(x => x.name === awardModal.winner)?.teamName || awardModal.winner}</p>
              <p className="text-xs text-slate-300">Presidente: <strong>{awardModal.winner}</strong> • Prezzo: <strong className="text-amber-400">{awardModal.price} FM</strong></p>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[9px] uppercase text-slate-500 font-bold block">Firma del Calciatore</span>
                <div className="text-2xl text-amber-300 italic font-serif py-1" style={{ animation: 'signContractReveal 0.85s ease-out forwards' }}>{awardModal.player.name}</div>
              </div>
              <div className="inline-block border-2 border-amber-400 text-amber-400 px-3 py-1 rounded-lg font-black text-xs uppercase" style={{ animation: 'stampSlamEffect 0.35s ease-out 0.55s backwards' }}>
                🔥 COLPO DI MERCATO • UFFICIALE 🔥
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleShareViralDealWhatsApp} className="py-3 bg-emerald-500 text-slate-950 font-black rounded-2xl text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer">
                <Share2 size={14} /> Invia su WhatsApp
              </button>
              <button onClick={handleDownloadSocialCard} className="py-3 bg-amber-500 text-slate-950 font-black rounded-2xl text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer">
                <Sparkles size={14} /> Scarica Card IG
              </button>
            </div>
            <button onClick={handleCloseAwardAndNext} className="w-full py-2.5 bg-[#060D1E] border border-slate-700 text-slate-200 font-black rounded-2xl text-xs uppercase cursor-pointer">Passa al Prossimo Calciatore ⏭️</button>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50">
          <div className="bg-[#060D1E] border-2 border-cyan-400 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center gap-4 text-center relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={18} /></button>
            <h3 className="text-lg font-black text-white uppercase">Codice: {roomCode}</h3>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`} alt="QR" className="w-48 h-48 bg-white p-2 rounded-xl" />
          </div>
        </div>
      )}

      {/* MODALE CONFIGURAZIONE LEGA CON NOME SQUADRA + NOME PERSONA */}
      {showCustomLeagueModal && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-amber-500/40 rounded-3xl p-5 max-w-md w-full flex flex-col gap-3 text-center relative">
            <button onClick={() => setShowCustomLeagueModal(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={16} /></button>
            <h3 className="text-base font-black text-white uppercase">Imposta Lega e Squadre</h3>
            <input type="text" placeholder="Nome della Lega (es. FantaLega 2026)..." value={customLeagueInput} onChange={e => setCustomLeagueInput(e.target.value)} className="w-full bg-[#060D1E] border border-slate-700 rounded-xl p-2 text-xs text-amber-400 font-bold text-center" />
            <div className="flex justify-between bg-[#060D1E] p-2 rounded-xl text-xs">
              <span>Crediti:</span>
              <div className="flex gap-1">{[300, 500, 1000].map(b => <button key={b} onClick={() => { setInitialBudget(b); setCoaches(prev => prev.map(c => ({ ...c, budget: b, playersCount: 0 }))); }} className={`px-2 py-0.5 rounded font-black ${initialBudget === b ? 'bg-amber-500 text-slate-950' : 'bg-slate-800'}`}>{b}</button>)}</div>
            </div>
            <div className="space-y-1.5 bg-[#060D1E] p-2.5 rounded-xl border border-slate-800">
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" placeholder="Squadra (es. Sempre Ultimi FC)" value={newTeamNameInput} onChange={e => setNewTeamNameInput(e.target.value)} className="bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-amber-300" />
                <input type="text" placeholder="Mister (es. Mario P.)" value={newCoachInput} onChange={e => setNewCoachInput(e.target.value)} className="bg-[#0B132B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" />
              </div>
              <button
                onClick={() => {
                  if (!newCoachInput.trim()) return;
                  const cName = newCoachInput.trim();
                  const tName = newTeamNameInput.trim() || `FC ${cName}`;
                  setCoaches(prev => [...prev, { name: cName, teamName: tName, budget: initialBudget, playersCount: 0 }]);
                  setNewCoachInput(''); setNewTeamNameInput('');
                }}
                className="w-full py-1.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <UserPlus size={13} /> Aggiungi Squadra alla Lega
              </button>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 text-left">
              {coaches.map((c, i) => (
                <div key={c.name} className="flex justify-between items-center bg-[#060D1E] px-2.5 py-1 rounded text-xs">
                  <span className="truncate"><strong>{i + 1}. {c.teamName}</strong> <span className="text-slate-400">({c.name})</span></span>
                  {coaches.length > 2 && <button onClick={() => setCoaches(prev => prev.filter(x => x.name !== c.name))} className="text-rose-400 cursor-pointer"><Trash2 size={13} /></button>}
                </div>
              ))}
            </div>
            <button onClick={() => { const n = customLeagueInput.trim() || leagueName; setLeagueName(n); setRoomCode(n.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'LEGA2026'); setIsDemoMode(false); setShowCustomLeagueModal(false); setUserRole('PRESIDENT'); setShowWelcomeGuide(true); setShowRoomCodeArrow(true); }} className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">Crea Stanza ({FREE_TRIAL_LIMIT} Acquisti di Prova) 🚀</button>
          </div>
        </div>
      )}

      {showDemoModal && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50">
          <div className="bg-[#060D1E] border border-cyan-500/40 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3.5 text-center relative">
            <button onClick={() => setShowDemoModal(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={16} /></button>
            <h3 className="text-lg font-black text-white uppercase">Prova Demo Gratuita</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDemoRoleChoice('PRESIDENT')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${demoRoleChoice === 'PRESIDENT' ? 'bg-amber-500/20 border-amber-400 text-white' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}><Tv size={18} /><span className="text-xs font-black">Presidente (TV)</span></button>
              <button onClick={() => setDemoRoleChoice('PLAYER')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${demoRoleChoice === 'PLAYER' ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}><Smartphone size={18} /><span className="text-xs font-black">Buzzer Telefono</span></button>
            </div>
            <button onClick={handleLaunchDemo} className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer">Avvia Demo e Mostra Codice 🚀</button>
          </div>
        </div>
      )}

      {showPaywall && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border-2 border-amber-400 rounded-3xl p-5 max-w-lg w-full flex flex-col gap-3.5 relative text-center">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer"><X size={16} /></button>
            <h2 className="text-xl font-black text-white uppercase">Sblocca l'Asta Completa fino al 25° Giocatore 🏆</h2>
            <div className="grid grid-cols-2 gap-2.5 text-left">
              <button onClick={() => setActivePackage('TV')} className={`p-3 rounded-2xl border-2 cursor-pointer ${activePackage === 'TV' ? 'bg-amber-500/15 border-amber-400' : 'bg-[#060D1E] border-slate-800'}`}><span className="text-xs font-black block">🖥️ Solo Studio TV</span><span className="text-2xl font-black text-amber-400">€2</span></button>
              <button onClick={() => setActivePackage('LIVE')} className={`p-3 rounded-2xl border-2 cursor-pointer ${activePackage === 'LIVE' ? 'bg-emerald-500/15 border-emerald-400' : 'bg-[#060D1E] border-slate-800'}`}><span className="text-xs font-black block">📱 Arena + Buzzer</span><span className="text-2xl font-black text-emerald-400">€{liveRoundPrice} (1€/testa)</span></button>
            </div>
            {activePackage === 'LIVE' && (
              <div className="bg-[#060D1E] border border-slate-800 rounded-2xl p-3 text-left space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1"><Coins size={13} /> Tabella Colletta 1€ ({collettaPaidCoaches.length}/{coaches.length})</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {coaches.map(c => (
                    <button key={c.name} onClick={() => setCollettaPaidCoaches(prev => prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name])} className={`p-1.5 rounded-lg border text-[11px] font-bold flex justify-between cursor-pointer ${collettaPaidCoaches.includes(c.name) ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-[#0B132B] border-slate-800 text-slate-400'}`}>
                      <span className="truncate">{c.teamName}</span> <span>{collettaPaidCoaches.includes(c.name) ? '✅' : '⏳'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { setIsLicenseUnlocked(true); setShowPaywall(false); }} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2"><CreditCard size={15} /> Sblocca Ora (€{currentPackagePrice})</button>
          </div>
        </div>
      )}

      {customAlertMessage && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50">
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