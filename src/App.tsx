import { useState, useEffect } from 'react';
import { useAuctionStore } from './store/useAuctionStore';
import { Trophy, Check, Zap, Sparkles, X, SkipForward, History, Users, ShieldCheck, LogOut, Settings, Plus, Trash2, Share2, Search, Download, Shirt, Play, ArrowRight, CreditCard, Tv, Smartphone, Users2, Monitor, Timer, Flame, Award, PieChart, AlertCircle, TrendingUp, MessageCircle, Send, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import rawListone from './data/listone.json';
import { supabase } from './supabase';

const listoneUfficiale = Array.isArray(rawListone) && rawListone.length > 0 
  ? rawListone.map((p: any) => ({
      id: String(p?.Id || Math.random()),
      name: p?.Nome || 'Calciatore',
      role: (p?.R as 'P' | 'D' | 'C' | 'A') || 'C',
      team: p?.Squadra || 'Serie A',
      basePrice: p?.Qt?.A || 1,
      mv: '6.00',
      fm: '6.00',
      overall: (p?.Qt?.A || 1) > 20 ? 88 : (p?.Qt?.A || 1) > 10 ? 84 : 78,
    }))
  : [];

const ROLE_LIMITS: Record<string, number> = { P: 3, D: 8, C: 8, A: 6 };

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
  { aliases: ['salernitana', 'salernitana 1919'], short: 'SAL', primary: '#8e1830', secondary: '#e9e6dc', ink: '#ffffff' },
  { aliases: ['fiorentina'], short: 'FIO', primary: '#563184', secondary: '#f5f2f8', ink: '#ffffff' },
  { aliases: ['sassuolo'], short: 'SAS', primary: '#087448', secondary: '#111111', ink: '#ffffff' },
  { aliases: ['verona', 'hellas verona'], short: 'VER', primary: '#f0c928', secondary: '#1e4e9b', ink: '#17213a' },
  { aliases: ['spezia'], short: 'SPE', primary: '#171717', secondary: '#dbc24b', ink: '#ffffff' },
  { aliases: ['empoli'], short: 'EMP', primary: '#1475b8', secondary: '#f4f8fb', ink: '#ffffff' },
  { aliases: ['bologna'], short: 'BOL', primary: '#153f83', secondary: '#c72439', ink: '#ffffff' },
  { aliases: ['lecce'], short: 'LEC', primary: '#c42a35', secondary: '#e4c326', ink: '#ffffff' },
  { aliases: ['sampdoria', 'samp'], short: 'SAM', primary: '#16427e', secondary: '#d62942', ink: '#ffffff' },
  { aliases: ['monza'], short: 'MON', primary: '#c5223c', secondary: '#f4f4f4', ink: '#ffffff' },
  { aliases: ['genoa', 'genoacfc'], short: 'GEN', primary: '#b21f34', secondary: '#193e69', ink: '#ffffff' },
  { aliases: ['cagliari'], short: 'CAG', primary: '#bd2637', secondary: '#16477c', ink: '#ffffff' },
  { aliases: ['parma'], short: 'PAR', primary: '#19519a', secondary: '#f2d12a', ink: '#ffffff' },
  { aliases: ['como', 'como 1907'], short: 'COM', primary: '#2187ae', secondary: '#f2f7fa', ink: '#ffffff' },
  { aliases: ['pisa', 'pisa sc'], short: 'PIS', primary: '#1455a0', secondary: '#171717', ink: '#ffffff' },
  { aliases: ['cremonese', 'cremonese us'], short: 'CRE', primary: '#c92336', secondary: '#f2f2f2', ink: '#ffffff' },
  { aliases: ['venezia'], short: 'VEN', primary: '#171717', secondary: '#bd2639', ink: '#ffffff' },
  { aliases: ['cagliari calcio'], short: 'CAG', primary: '#bd2637', secondary: '#16477c', ink: '#ffffff' },
] as const;

type TeamBadgeStyle = { short: string; primary: string; secondary: string; ink: string };

const normalizeTeamName = (team: unknown) => String(team || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getTeamBadgeStyle = (team: unknown): TeamBadgeStyle => {
  const normalized = normalizeTeamName(team);
  const match = TEAM_BADGES.find(entry => entry.aliases.some(alias => {
    const key = normalizeTeamName(alias);
    return normalized === key || normalized.includes(` ${key}`) || normalized.startsWith(`${key} `);
  }));
  if (match) return match;
  const words = normalized.split(' ').filter(word => !['fc', 'ac', 'as', 'ss', 'us', 'calcio', 'football', 'club'].includes(word));
  const short = words.slice(0, 2).map(word => word.slice(0, 1).toUpperCase()).join('') || 'FC';
  return { short, primary: '#1e293b', secondary: '#fbbf24', ink: '#ffffff' };
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
  ctx.moveTo(x + width * .5, y + height * .035);
  ctx.lineTo(x + width * .92, y + height * .16);
  ctx.lineTo(x + width * .88, y + height * .54);
  ctx.quadraticCurveTo(x + width * .84, y + height * .82, x + width * .5, y + height * .97);
  ctx.quadraticCurveTo(x + width * .16, y + height * .82, x + width * .12, y + height * .54);
  ctx.lineTo(x + width * .08, y + height * .16);
  ctx.closePath();
  ctx.fillStyle = badge.primary;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = .94;
  ctx.fillStyle = badge.secondary;
  ctx.fillRect(x + width * .58, y + height * .10, width * .42, height * .20);
  ctx.restore();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = Math.max(2, width * .045);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(12, width * (badge.short.length > 2 ? .19 : .23))}px system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, width * .045);
  ctx.strokeStyle = 'rgba(0,0,0,.48)';
  ctx.strokeText(badge.short, x + width * .5, y + height * .61, width * .72);
  ctx.fillStyle = badge.ink;
  ctx.fillText(badge.short, x + width * .5, y + height * .61, width * .72);
  ctx.beginPath();
  ctx.moveTo(x + width * .60, y + height * .78);
  ctx.lineTo(x + width * .48, y + height * .89);
  ctx.lineTo(x + width * .56, y + height * .89);
  ctx.lineTo(x + width * .53, y + height * .96);
  ctx.lineTo(x + width * .68, y + height * .83);
  ctx.lineTo(x + width * .59, y + height * .83);
  ctx.closePath();
  ctx.fillStyle = '#F59E0B';
  ctx.fill();
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

const playBuzzSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) { console.error(e); }
};

const playTickSound = (isGongZone = false) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = isGongZone ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isGongZone ? 1200 : 600, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) { console.error(e); }
};

const playWinSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.09 + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + idx * 0.09);
      osc.stop(audioCtx.currentTime + idx * 0.09 + 0.45);
    });
  } catch (e) { console.error(e); }
};

export default function App() {
  const { currentPlayer, currentBid, highestBidder, placeBid, setCurrentPlayer } = useAuctionStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'P' | 'D' | 'C' | 'A'>('ALL');
  const [isBlinking, setIsBlinking] = useState(false);
  const [bidHistory, setBidHistory] = useState<{ bidder: string; amount: number; time: string }[]>([]);
  const [latestBidAlert, setLatestBidAlert] = useState<{ bidder: string; amount: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [displayBid, setDisplayBid] = useState(currentBid);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);

  const [isPureTvDisplay, setIsPureTvDisplay] = useState(false);
  const [showMobileCoaches, setShowMobileCoaches] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);

  const [manualPriceInput, setManualPriceInput] = useState<string>('');
  const [selectedWinnerManual, setSelectedWinnerManual] = useState<string>('');

  const [showCustomLeagueModal, setShowCustomLeagueModal] = useState(false);
  const [customLeagueInput, setCustomLeagueInput] = useState('');

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [isDemoGuideMinimized, setIsDemoGuideMinimized] = useState(true);
  const [playerGuideStep, setPlayerGuideStep] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const [showPlayerPaymentModal, setShowPlayerPaymentModal] = useState(false);
  const [pendingPlayerAuth, setPendingPlayerAuth] = useState<any>(null);

  const [activePackage, setActivePackage] = useState<'TV' | 'LIVE'>('LIVE');
  const [selectedPackage, setSelectedPackage] = useState<'TV' | 'LIVE'>('LIVE');
  const [paymentType, setPaymentType] = useState<'SINGLE' | 'SPLIT'>('SINGLE');
  const [coachesCount, setCoachesCount] = useState(10);
  const [selectedStep, setSelectedStep] = useState<number>(1);

  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const [activeTab, setActiveTab] = useState<'AUCTION' | 'ROSTERS' | 'HIGHLIGHTS'>('AUCTION');
  const [selectedRosterCoach, setSelectedRosterCoach] = useState<string>('Presidente (Tu)');
  const [purchasedPlayers, setPurchasedPlayers] = useState<{ [coachName: string]: { player: any; price: number }[] }>({});

  const [userRole, setUserRole] = useState<'PRESIDENT' | 'PLAYER' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [inputLeagueName, setInputLeagueName] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [roomCode, setRoomCode] = useState('BUZZ2026');
  const [showConfig, setShowConfig] = useState(false);
  
  const [activeChannel, setActiveChannel] = useState<any>(null);

  const [initialBudget, setInitialBudget] = useState(500);
  const [leagueName, setLeagueName] = useState('FantaLega Serie A');
  const [coaches, setCoaches] = useState([
    { name: 'Presidente (Tu)', teamName: 'Real Presidente', budget: 500, playersCount: 0 },
    { name: 'Pasquale', teamName: 'FC Vesuvio', budget: 500, playersCount: 0 },
    { name: 'Gianni', teamName: 'Spartak Gianni', budget: 500, playersCount: 0 },
  ]);

  const [newCoachName, setNewCoachName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [awardModal, setAwardModal] = useState<{ show: boolean; player: any; winner: string; price: number; } | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room_${roomCode}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_bids', filter: `room_code=eq.${roomCode}` }, (payload) => {
        const newBid = payload.new;
        if (newBid && newBid.bidder_name) {
          playBuzzSound();
          setIsBlinking(true);
          setCountdown(null);
          setTimeout(() => setIsBlinking(false), 300);

          placeBid(newBid.bidder_name, newBid.bid_amount);

          setLatestBidAlert({ bidder: newBid.bidder_name, amount: newBid.bid_amount });
          setTimeout(() => setLatestBidAlert(null), 2500);

          const timeStr = new Date(newBid.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setBidHistory(prev => [{ bidder: newBid.bidder_name, amount: newBid.bid_amount, time: timeStr }, ...prev]);
        }
      })
      .on('broadcast', { event: 'change_player' }, (payload: any) => {
        const { player } = payload.payload;
        if (player) {
          setCurrentPlayer(player);
          setBidHistory([]);
          setManualPriceInput('');
          setCountdown(null);
          setLatestBidAlert(null);
          setAwardModal(null);
        }
      })
      .on('broadcast', { event: 'player_awarded' }, (payload: any) => {
        const { player, winner, price } = payload.payload;
        if (player) {
          playWinSound();
          setAwardModal({ show: true, player, winner, price });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setActiveChannel(channel);
        }
      });

    return () => { 
      supabase.removeChannel(channel); 
      setActiveChannel(null);
    };
  }, [roomCode, placeBid, setCurrentPlayer]);

  useEffect(() => {
    if (currentBid !== displayBid) {
      setIsSlotSpinning(true);
      const timer = setTimeout(() => {
        setDisplayBid(currentBid);
        setIsSlotSpinning(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentBid]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      playTickSound(countdown <= 2);
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      handleAward();
    }
  }, [countdown]);

  const calculatePrice = () => {
    if (selectedPackage === 'TV') return 4.99;
    if (coachesCount <= 8) return 9.99;
    return 9.99 + (coachesCount - 8) * 1.0;
  };
  const totalPrice = calculatePrice();
  const splitPrice = (totalPrice / coachesCount + 0.15).toFixed(2);

  const handlePayment = () => {
    setCustomAlertMessage(`Pagamento completato! Modalità attivata: FantasyBuzz ${selectedPackage}`);
    setActivePackage(selectedPackage);
    setIsDemoMode(false);
    setDemoStep(null);
    setShowPaywall(false);
    setUserRole('PRESIDENT');
    setActiveTab('AUCTION');
  };

  const handlePlayerAuthClick = (coach: any) => {
    if (paymentType === 'SPLIT') {
      setPendingPlayerAuth(coach);
      setShowPlayerPaymentModal(true);
    } else {
      loginPlayerDirectly(coach);
    }
  };

  const loginPlayerDirectly = (coach: any) => {
    setIsDemoMode(false);
    setPlayerName(coach.name);
    setSelectedRosterCoach(coach.name);
    setUserRole('PLAYER');
    setPlayerGuideStep(1);
    setShowPlayerPaymentModal(false);
  };

  const filteredList = listoneUfficiale
    .filter(p => (selectedRole === 'ALL' || p.role === selectedRole) && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activePlayer = currentPlayer || listoneUfficiale[0];
  const isTopPlayer = activePlayer.basePrice >= 15;

  const handleStartDemo = () => {
    setIsDemoMode(true);
    setActivePackage('LIVE');
    setRoomCode('BUZZ2026');
    setLeagueName('Lega Demo (3 Partecipanti)');
    setInitialBudget(500);
    setCoaches([
      { name: 'Presidente (Tu)', teamName: 'Real Presidente', budget: 500, playersCount: 0 },
      { name: 'Pasquale', teamName: 'FC Vesuvio', budget: 500, playersCount: 0 },
      { name: 'Gianni', teamName: 'Spartak Gianni', budget: 500, playersCount: 0 },
    ]);
    setCoachesCount(3);
    setSelectedRosterCoach('Presidente (Tu)');
    setUserRole('PRESIDENT');
    setDemoStep(1);
    setIsDemoGuideMinimized(true);
  };

  const handleTryStartAuction = () => {
    setCoaches(prev => prev.map(c => ({
      ...c,
      budget: initialBudget - ((purchasedPlayers[c.name] || []).reduce((acc, item) => acc + item.price, 0))
    })));

    if (coaches.length !== coachesCount) {
      setShowIncompleteWarning(true);
    } else {
      setUserRole('PRESIDENT');
      setActiveTab('AUCTION');
      setShowConfig(false);
    }
  };

  const getShareMessage = () => {
    const inviteUrl = window.location.href.split('?')[0];
    return encodeURIComponent(`⚽ *INIZIA L'ASTA DI FANTASYBUZZ!* ⚽\n\n🏆 Lega: *${leagueName}*\n🔑 Codice Stanza: *${roomCode}*\n\nEntra subito dal link, seleziona il tuo nome e collega il tuo smartphone per preparare il buzzer: \n${inviteUrl}\n\nTi aspettiamo in sala! 🚀`);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${getShareMessage()}`, '_blank');
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${window.location.href.split('?')[0]}&text=${getShareMessage()}`, '_blank');
  };

  const handleCopyInviteLink = () => {
    const text = `Unisciti alla lega "${leagueName}" su FantasyBuzz! Codice stanza: ${roomCode} - Link: ${window.location.href.split('?')[0]}`;
    navigator.clipboard.writeText(text);
    setCustomAlertMessage('📋 Nome Lega, Codice Stanza e Link copiati negli appunti!');
  };

  const handleSelectPlayer = async (player: any) => { 
    setCurrentPlayer(player); 
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
      } catch (e) { console.error("Errore sync giocatore", e); }
    }
  };

  const handleRaise = async (stepVal: number) => {
    if (awardModal?.show) return;

    if (navigator.vibrate) {
      navigator.vibrate(40);
    }

    const activeName = userRole === 'PRESIDENT' ? 'Presidente (Tu)' : playerName;
    const nuovaOfferta = highestBidder ? currentBid + stepVal : stepVal;

    try {
      await supabase.from('room_bids').insert([
        {
          room_code: roomCode,
          bidder_name: activeName,
          bid_amount: nuovaOfferta
        }
      ]);
    } catch (e) {
      console.error("Errore salvataggio offerta:", e);
    }
  };

  const handleNextPlayer = async () => {
    const currentIndex = filteredList.findIndex(p => p.id === activePlayer.id);
    const nextPlayer = filteredList[(currentIndex + 1) % filteredList.length] || listoneUfficiale[0];
    
    setCurrentPlayer(nextPlayer as any);
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
          payload: { player: nextPlayer },
        });
      } catch (e) { console.error("Errore sync prossimo giocatore", e); }
    }
  };

  const handleAward = async () => {
    let finalPrice = currentBid;
    let winnerName = highestBidder || coaches[0].name;

    if (activePackage === 'TV') {
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

    if (currentRoleCount >= maxRoleLimit) {
      setCustomAlertMessage(`⚠️ Blocco Acquisto: ${winnerName} ha già raggiunto il limite di ${maxRoleLimit} per il ruolo ${activePlayer.role}!`);
      return;
    }

    playWinSound();

    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10b981', '#3b82f6', '#ec4899', '#ffffff']
      });
    } catch (e) { console.error(e); }

    setCoaches(prev => prev.map(c => c.name === winnerName ? { ...c, budget: c.budget - finalPrice, playersCount: c.playersCount + 1 } : c));
    setPurchasedPlayers(prev => ({ ...prev, [winnerName]: [...(prev[winnerName] || []), { player: activePlayer, price: finalPrice }] }));
    setAwardModal({ show: true, player: activePlayer, winner: winnerName, price: finalPrice });

    if (activeChannel) {
      try {
        await activeChannel.send({
          type: 'broadcast',
          event: 'player_awarded',
          payload: { player: activePlayer, winner: winnerName, price: finalPrice },
        });
      } catch (e) { console.error("Errore sync aggiudicazione", e); }
    }
  };

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
    const roleColors: Record<string, string> = {
      P: '#f59e0b', D: '#10b981', C: '#38bdf8', A: '#f43f5e'
    };
    const roleColor = roleColors[awardModal.player.role] || '#10b981';

    const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };

    const fittedText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      maxSize: number,
      minSize = 36,
      weight = 900,
      color = '#ffffff'
    ) => {
      let size = maxSize;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      while (size > minSize) {
        ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
        if (ctx.measureText(text).width <= maxWidth) break;
        size -= 2;
      }
      ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(text, x, y, maxWidth);
    };

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#021B12');
    bg.addColorStop(0.55, '#062E1E');
    bg.addColorStop(1, '#021B12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(540, 720, 30, 540, 720, 780);
    glow.addColorStop(0, 'rgba(16,185,129,0.25)');
    glow.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (let i = -700; i < 1500; i += 130) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 700, H);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    roundedRect(34, 34, W - 68, H - 68, 38);
    ctx.stroke();

    roundedRect(456, 112, 168, 110, 32);
    const logoGrad = ctx.createLinearGradient(456, 112, 624, 222);
    logoGrad.addColorStop(0, '#F59E0B');
    logoGrad.addColorStop(1, '#D97706');
    ctx.fillStyle = logoGrad;
    ctx.fill();
    ctx.fillStyle = '#0B132B';
    ctx.beginPath();
    ctx.moveTo(553, 132);
    ctx.lineTo(515, 174);
    ctx.lineTo(544, 174);
    ctx.lineTo(528, 205);
    ctx.lineTo(569, 160);
    ctx.lineTo(540, 160);
    ctx.closePath();
    ctx.fill();

    fittedText('FANTASYBUZZ', 540, 275, 820, 58, 48, 900, '#ffffff');
    fittedText('LIVE ARENA  •  OFFICIAL CARD', 540, 335, 820, 24, 20, 800, '#94A3B8');
    fittedText(String(leagueName || 'LA TUA LEGA').toUpperCase(), 540, 375, 820, 22, 18, 800, '#F59E0B');

    roundedRect(330, 414, 420, 68, 34);
    ctx.fillStyle = 'rgba(16,185,129,0.2)';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();
    fittedText('AGGIUDICATO!', 540, 449, 370, 28, 24, 900, '#10b981');

    const cardX = 100, cardY = 540, cardW = 880, cardH = 585;
    const playerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    playerGrad.addColorStop(0, '#0B132B');
    playerGrad.addColorStop(0.6, '#0B251A');
    playerGrad.addColorStop(1, '#051811');
    roundedRect(cardX, cardY, cardW, cardH, 42);
    ctx.fillStyle = playerGrad;
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.stroke();

    roundedRect(148, 590, 112, 64, 20);
    ctx.fillStyle = roleColor;
    ctx.fill();
    fittedText(awardModal.player.role, 204, 622, 90, 33, 30, 900, '#0B132B');
    drawTeamBadgeOnCanvas(ctx, awardModal.player.team, 612, 585, 60);
    fittedText(String(awardModal.player.team || '').toUpperCase(), 814, 622, 286, 22, 18, 800, '#d4e5dc');

    const avatarGlow = ctx.createRadialGradient(540, 820, 12, 540, 820, 168);
    avatarGlow.addColorStop(0, 'rgba(245,158,11,0.25)');
    avatarGlow.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = avatarGlow;
    ctx.beginPath();
    ctx.arc(540, 820, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(540, 820, 118, 0, Math.PI * 2);
    ctx.fillStyle = '#0B132B';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.stroke();
    fittedText(String(awardModal.player.name || '?').trim().charAt(0).toUpperCase(), 540, 820, 180, 112, 72, 900, '#F59E0B');

    fittedText(String(awardModal.player.name || 'CALCIATORE').toUpperCase(), 540, 1010, 780, 60, 38, 900, '#ffffff');
    fittedText(`BASE D'ASTA  ${awardModal.player.basePrice} FM`, 540, 1075, 700, 24, 21, 700, '#94A3B8');

    fittedText('PRESO A', 540, 1218, 700, 28, 24, 800, '#94A3B8');
    fittedText(`${awardModal.price} FM`, 540, 1350, 820, 132, 82, 900, '#F59E0B');
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(330, 1438);
    ctx.lineTo(750, 1438);
    ctx.stroke();

    roundedRect(120, 1500, 840, 185, 32);
    ctx.fillStyle = '#0B132B';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();
    fittedText('NUOVO ACQUISTO PER', 540, 1545, 760, 22, 20, 800, '#94A3B8');
    fittedText(String(awardModal.winner).toUpperCase(), 540, 1600, 760, 42, 30, 900, '#10b981');
    if (winnerCoach?.teamName) {
      fittedText(String(winnerCoach.teamName).toUpperCase(), 540, 1645, 760, 22, 18, 700, '#CBD5E1');
    }

    fittedText('LA PROSSIMA ASTA, GIOCATELA QUI.', 540, 1762, 820, 27, 23, 900, '#ffffff');
    fittedText('FANTASYBUZZ  •  CREA LA TUA LEGA LIVE', 540, 1810, 820, 20, 18, 800, '#F59E0B');
    fittedText('IL COLPO È TUO. FALLO GIRARE.', 540, 1855, 820, 18, 16, 600, '#94A3B8');

    const fileName = `FantasyBuzz_${String(awardModal.player.name).trim().replace(/\s+/g, '_')}.png`;
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Colpo d'asta: ${awardModal.player.name}`,
          text: `${awardModal.player.name} è stato preso da ${awardModal.winner} per ${awardModal.price} FM nella lega ${leagueName}. Asta live su FantasyBuzz.`
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Condivisione non disponibile, scarico la card.', error);
      }
    }

    const link = document.createElement('a');
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleAddCoach = () => {
    if (isDemoMode && coaches.length >= 3) { setCustomAlertMessage('La versione DEMO è limitata a 3 Partecipanti.'); return; }
    if (newCoachName.trim()) {
      setCoaches(prev => [...prev, { name: newCoachName.trim(), teamName: newTeamName.trim() || `FC ${newCoachName.trim()}`, budget: initialBudget, playersCount: 0 }]);
      setNewCoachName(''); setNewTeamName('');
    }
  };

  const handleRemoveCoach = (nameToRemove: string) => setCoaches(prev => prev.filter(c => c.name !== nameToRemove));

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

  return (
    <>
      {!userRole ? (
        <div className="min-h-screen w-full bg-[#030914] text-white flex flex-col items-center justify-center p-4 select-none relative z-10 box-border">
          <div className="max-w-md w-full bg-[#0B132B] border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5 my-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500"></div>
            
            <BuzzMark size={62} />

            <div className="text-center">
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">FantasyBuzz</h1>
              <p className="text-xs text-amber-400 font-extrabold mt-1 tracking-widest">LIVE ARENA SHOWDOWN</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">IL TUO TAVOLO. LA TUA DIRETTA.</p>
            </div>

            <div className="w-full bg-[#060D1E] p-4 rounded-2xl space-y-3 border border-slate-800">
              <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">Accesso Partecipanti / Ospiti</span>
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs text-slate-300 font-bold uppercase block mb-1.5">Nome della Lega</label>
                  <input
                    type="text"
                    placeholder="Es. FantaLega Serie A"
                    value={inputLeagueName}
                    onChange={(e) => {
                      setInputLeagueName(e.target.value);
                      if (e.target.value.trim() !== '') {
                        setLeagueName(e.target.value.trim());
                        setRoomCode(e.target.value.trim().toUpperCase().replace(/\s+/g, ''));
                      }
                    }}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold uppercase block mb-1.5">Codice Stanza (Nome Lega o BUZZ2026 per Demo)</label>
                  <input
                    type="text"
                    placeholder="Es. FANTALEGASERIEA"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl p-2.5 text-xs text-amber-400 font-black tracking-widest text-center focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={handleStartDemo}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Play size={16} className="fill-slate-950" /> Prova la Demo Gratuita (Codice: BUZZ2026)
              </button>

              <button
                onClick={() => {
                  if (inputLeagueName && inputLeagueName.trim() !== '' && inputLeagueName !== 'FantaLega Serie A') {
                    setLeagueName(inputLeagueName.trim());
                    setRoomCode(inputLeagueName.trim().toUpperCase().replace(/\s+/g, ''));
                    setShowPaywall(true);
                  } else {
                    setShowCustomLeagueModal(true);
                  }
                }}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <ShieldCheck size={18} /> Crea Nuova Lega / Sblocca Stanza 🚀
              </button>

              <div className="flex items-center my-1 gap-2">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">oppure seleziona il tuo profilo</span>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block text-center uppercase tracking-wider">
                  Seleziona il tuo nome in lista
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {coaches.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        const cleanRoomCode = roomCode.toUpperCase().replace(/\s+/g, '');
                        const inputClean = inputRoomCode.toUpperCase().replace(/\s+/g, '');

                        if (inputClean !== cleanRoomCode && inputClean !== 'BUZZ2026') {
                          setCustomAlertMessage(`❌ Codice stanza errato! Per entrare nella lega "${leagueName}", inserisci il codice corretto.`);
                          return;
                        }
                        handlePlayerAuthClick(c);
                      }}
                      className="p-3 bg-[#060D1E] hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-800 rounded-xl font-bold text-xs text-white flex flex-col items-start gap-1 transition-all active:scale-95 cursor-pointer text-left"
                    >
                      <span className="font-extrabold text-amber-400 truncate w-full">{c.name}</span>
                      <span className="text-[10px] text-slate-400 truncate w-full">{c.teamName}</span>
                      <span className="text-[10px] text-emerald-400 font-black">{c.budget} FM</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen w-screen font-sans flex flex-col justify-between p-2 md:p-5 select-none overflow-hidden relative z-10 bg-[#030914] text-slate-200">
          
          {isDemoMode && (
            <div className="bg-emerald-500 text-slate-950 font-black text-center py-1 text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md">
              <span>🎮 Modalità DEMO Attiva</span>
              <button onClick={() => setShowPaywall(true)} className="bg-slate-950 text-white px-2 py-0.5 rounded-lg text-[10px] lowercase font-semibold hover:bg-slate-800 cursor-pointer">
                Sblocca Lega Completa 🚀
              </button>
            </div>
          )}

          <header className="flex flex-col lg:flex-row justify-between items-center p-2.5 px-3 md:px-6 rounded-2xl bg-[#0B132B] border border-slate-800 flex-shrink-0 my-1 gap-2 lg:gap-0 lg:h-14 shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <BuzzMark size={32} />
                <div>
                  <h1 className="text-xs md:text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
                    FantasyBuzz 
                    {userRole === 'PRESIDENT' ? (
                      <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1 shadow-md">
                        <Tv size={10} /> TABELLONE TV
                      </span>
                    ) : (
                      <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1 shadow-md">
                        <Smartphone size={10} /> SMARTPHONE BUZZER
                      </span>
                    )}
                  </h1>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="text-amber-400 font-black tracking-wide">LIVE ARENA</span>
                    <span className="text-slate-600">·</span>
                    <span className="truncate max-w-[150px] md:max-w-none">{userRole === 'PRESIDENT' ? `REGIA · ${leagueName}` : `IN CAMPO · ${playerName.toUpperCase()}`}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto bg-[#060D1E] p-1 rounded-xl border border-slate-800 w-full lg:w-auto justify-start lg:justify-center">
                <button
                  onClick={() => setActiveTab('AUCTION')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'AUCTION' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  <Zap size={13} /> Asta Live
                </button>
                <button
                  onClick={() => {
                    if (!selectedRosterCoach && coaches.length > 0) setSelectedRosterCoach(coaches[0].name);
                    setActiveTab('ROSTERS');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'ROSTERS' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  <Shirt size={13} /> Rose Lega
                </button>
                {userRole === 'PRESIDENT' && (
                  <button
                    onClick={() => setActiveTab('HIGHLIGHTS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'HIGHLIGHTS' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Award size={13} /> Highlights
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
              {userRole === 'PRESIDENT' && (
                <button
                  onClick={() => setIsPureTvDisplay(!isPureTvDisplay)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isPureTvDisplay ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Monitor size={13} /> {isPureTvDisplay ? 'TV: Attiva' : 'Vista TV'}
                </button>
              )}

              {activePackage === 'LIVE' && userRole === 'PRESIDENT' && (
                <div className="inline-flex items-center gap-1.5 bg-[#060D1E] px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-amber-400 border border-slate-800">
                  <Share2 size={11} /> Codice: <strong className="text-white tracking-widest">{roomCode}</strong>
                </div>
              )}

              {userRole === 'PRESIDENT' && activeTab === 'ROSTERS' && (
                <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer shadow-md">
                  <Download size={13} /> CSV
                </button>
              )}

              {userRole === 'PRESIDENT' && (
                <button onClick={() => setShowConfig(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition-all cursor-pointer">
                  <Settings size={13} /> Configura
                </button>
              )}

              <button
                onClick={() => { setUserRole(null); setPlayerName(''); setIsDemoMode(false); setDemoStep(null); setPlayerGuideStep(null); }}
                className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <LogOut size={12} /> ESCI
              </button>
            </div>
          </header>

          {activeTab === 'AUCTION' && (
            userRole === 'PRESIDENT' ? (
              <main className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch my-1 overflow-y-auto lg:overflow-hidden w-full relative pb-8 lg:pb-0">
                
                {latestBidAlert && (
                  <div className="absolute top-2 lg:top-10 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-4 py-1.5 rounded-2xl shadow-2xl border-2 border-white animate-bounce flex items-center gap-2">
                    <Zap size={18} className="fill-slate-950" />
                    <span className="text-xs uppercase tracking-wider">RILANCIO DA {latestBidAlert.bidder.toUpperCase()}: {latestBidAlert.amount} FM!</span>
                  </div>
                )}

                <aside className="hidden lg:flex w-[220px] shrink-0 bg-[#0B132B] rounded-2xl p-3.5 flex-col gap-3 overflow-hidden border border-slate-800">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5"><Trophy size={13} className="text-amber-400" /> Allenatori</span>
                    <span className="text-[10px] text-slate-500">Rosa / Budget</span>
                  </h3>
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {coaches.map(c => (
                      <div key={c.name} className={`flex justify-between items-center p-2 rounded-xl transition-all ${
                        highestBidder === c.name 
                          ? 'bg-amber-500/20 border border-amber-500/60 text-white' 
                          : 'bg-[#060D1E]'
                      }`}>
                        <div>
                          <span className="font-bold text-xs block text-white">{c.name}</span>
                          <span className="text-[10px] text-slate-400 block">{c.teamName}</span>
                          <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5"><Users size={9} /> {c.playersCount} slot</span>
                        </div>
                        <span className="font-black text-amber-400 text-xs">{c.budget} FM</span>
                      </div>
                    ))}
                  </div>
                </aside>

                {/* CONTAINER CENTRALE: STADIO CON BORDO LED ED EFFETTO RIFLETTORI DISCRETO */}
                <section className={`w-full lg:flex-1 shrink-0 min-h-[500px] lg:min-h-0 ${
                  isBlinking ? 'border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)]' :
                  countdown !== null && countdown <= 2 
                    ? 'border-2 border-red-500 animate-pulse' 
                    : 'border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                } rounded-2xl p-3 md:p-4 flex flex-col items-center justify-between relative overflow-hidden transition-all duration-300`}
                style={{
                  background: `
                    radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.28) 0%, rgba(6, 35, 22, 0.95) 75%, rgba(2, 18, 11, 1) 100%),
                    repeating-linear-gradient(90deg, rgba(10, 80, 45, 0.35) 0px, rgba(10, 80, 45, 0.35) 50px, rgba(6, 60, 34, 0.35) 50px, rgba(6, 60, 34, 0.35) 100px)
                  `
                }}>
                  
                  {/* Riflettori tattici d'angolo molto sottili */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 via-emerald-400/5 to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-400/10 via-emerald-400/5 to-transparent pointer-events-none"></div>

                  {/* Linee tattiche dello stadio */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="w-full h-full border border-emerald-200/80 rounded-xl m-1.5"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-200/80 -translate-y-1/2"></div>
                    <div className="absolute top-1/2 left-1/2 w-40 h-40 border border-emerald-200/80 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                  </div>

                  {countdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-2">
                      <span className={`font-black text-xs uppercase tracking-widest ${countdown <= 2 ? 'text-red-400 animate-bounce' : 'text-amber-400 animate-pulse'}`}>
                        {countdown <= 2 ? '🚨 GONG ZONE - ULTIMISSIMI SECONDI! 🚨' : 'Ultima Chiamata!'}
                      </span>
                      <div className={`text-7xl font-black ${countdown <= 2 ? 'text-red-500' : 'text-white'} drop-shadow-2xl animate-ping`}>
                        {countdown}
                      </div>
                      <p className="text-xs text-slate-400">Premi BUZZ per interrompere!</p>
                    </div>
                  )}

                  {/* Cerca Calciatore */}
                  <div className="w-full bg-[#060D1E]/90 backdrop-blur-md rounded-xl p-2.5 flex flex-col gap-2 z-10 border border-slate-700/60 shadow-md">
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                        <input type="text" placeholder="Cerca calciatore..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0B132B] rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                      </div>
                      <div className="flex gap-1 overflow-x-auto">
                        {['ALL', 'P', 'D', 'C', 'A'].map(r => (
                          <button key={r} onClick={() => setSelectedRole(r as any)} className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${selectedRole === r ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-400 hover:text-white'}`}>{r}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto py-1 max-h-20 border-t border-slate-800">
                      {filteredList.map(p => (
                        <button key={p.id} onClick={() => handleSelectPlayer(p)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all cursor-pointer ${activePlayer.id === p.id ? 'bg-amber-500 text-slate-950' : 'bg-[#0B132B] text-slate-300 hover:text-white'}`}>
                          <span className="mr-1 text-[9px] opacity-80">[{p.role}]</span> {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* GIOCATORE AL CENTRO SOTTO I RIFLETTORI DELLO STADIO */}
                  <div className="hidden lg:flex flex-col items-center justify-center my-auto z-10 text-center space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/20 px-2 py-0.5 text-[9px] font-black tracking-widest text-rose-300"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" /></span>LIVE</span>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-[#060D1E]/90 pl-1 pr-2.5 py-0.5 rounded-full uppercase border border-slate-700 shadow-md"><TeamBadge team={activePlayer.team} size={18} /><span>{activePlayer.team}</span></div>
                      {isTopPlayer && <span className="text-[10px] font-black text-amber-400 uppercase flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40"><Flame size={11}/> TOP</span>}
                    </div>

                    <h2 className={`text-5xl md:text-6xl font-black text-white uppercase tracking-tight transition-all z-10 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] ${isBlinking ? 'scale-105 text-amber-300' : ''}`}>
                      {activePlayer.name}
                    </h2>

                    <p className="text-xs font-bold text-slate-100 bg-slate-950/80 px-3 py-0.5 rounded-full border border-slate-700/80 z-10 backdrop-blur-md shadow-md">Quotazione Base: <strong className="text-amber-400 font-extrabold">{activePlayer.basePrice} FM</strong></p>
                  </div>

                  {/* SCHERMATA COMPATTA MOBILE PER IL GIOCATORE */}
                  <div className="flex lg:hidden w-full bg-[#060D1E]/90 backdrop-blur-md rounded-xl p-2.5 items-center justify-between my-1.5 z-10 relative border border-slate-700/60 shadow-md">
                    <div>
                       <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/20 px-1.5 py-0.2 text-[8px] font-black tracking-wider text-rose-300"><span className="h-1 w-1 rounded-full bg-rose-400" />LIVE</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                       </div>
                       <h3 className="text-xl font-black text-white uppercase leading-tight truncate max-w-[200px]">{activePlayer.name}</h3>
                       <div className="mt-0.5 flex items-center gap-1"><TeamBadge team={activePlayer.team} size={15} /><p className="text-[11px] text-slate-300 uppercase font-bold">{activePlayer.team} • Base: {activePlayer.basePrice} FM</p></div>
                    </div>
                  </div>

                  {/* BANNER AUMENTO OFFERTA / CONTROLLI */}
                  <div className="w-full max-w-2xl bg-[#060D1E]/95 backdrop-blur-md p-3 md:p-4 rounded-xl flex flex-col gap-3 z-10 border border-slate-700/80 shadow-xl">
                    {activePackage === 'TV' && !isDemoMode ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-300 font-bold uppercase block mb-1">Vincitore Asta</label>
                            <select
                              value={selectedWinnerManual || coaches[0].name}
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
                          <button onClick={handleAward} className="flex-1 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs uppercase flex items-center justify-center gap-1 cursor-pointer shadow-md">
                            <Check size={15} /> Aggiudica
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-1">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Offerta Corrente</span>
                            {highestBidder ? <p className="text-xs text-emerald-400 font-extrabold truncate max-w-[100px]">{highestBidder}</p> : <p className="text-[10px] text-slate-500">Base {activePlayer.basePrice} FM</p>}
                          </div>

                          <div className={`text-4xl md:text-5xl font-black text-amber-400 tabular-nums transition-all ${isSlotSpinning ? 'scale-110' : 'scale-100'}`}>
                            {displayBid} <span className="text-lg md:text-xl text-amber-300">FM</span>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => setCountdown(3)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <Timer size={12} /> 3 sec
                            </button>
                            <div className="flex gap-1">
                              <button onClick={handleNextPlayer} className="px-2.5 py-1.5 bg-[#0B132B] text-slate-300 font-bold rounded-lg text-[11px] uppercase flex items-center gap-1 cursor-pointer"><SkipForward size={11} /> Salta</button>
                              <button onClick={handleAward} className="px-2.5 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-[11px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm"><Check size={13} /> Prendi</button>
                            </div>
                          </div>
                        </div>

                        {!isPureTvDisplay && (
                          <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-slate-800">
                            {[1, 5, 10, 20].map(step => (
                              <button key={step} onClick={() => handleRaise(step)} className="py-2.5 bg-[#0B132B] hover:bg-amber-500 hover:text-slate-950 text-white font-black text-xs rounded-lg cursor-pointer transition-all">+{step}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex lg:hidden gap-1.5 w-full mt-1.5 z-10">
                    <button onClick={() => setShowMobileCoaches(true)} className="flex-1 py-2.5 bg-[#060D1E] border border-slate-800 rounded-lg flex items-center justify-center gap-1.5 text-white font-bold text-xs shadow-sm">
                       <Users size={13} className="text-amber-400"/> Status Rose
                    </button>
                    <button onClick={() => setShowMobileHistory(true)} className="flex-1 py-2.5 bg-[#060D1E] border border-slate-800 rounded-lg flex items-center justify-center gap-1.5 text-white font-bold text-xs shadow-sm">
                       <History size={13} className="text-emerald-400"/> Rilanci
                    </button>
                  </div>
                </section>

                <aside className="hidden lg:flex w-[220px] shrink-0 bg-[#0B132B] rounded-2xl p-3.5 flex-col gap-3 overflow-hidden border border-slate-800">
                  {activePackage === 'TV' && !isDemoMode ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-3">
                      <div className="w-12 h-12 rounded-full bg-[#060D1E] flex items-center justify-center mb-3"><Tv size={24} className="text-slate-500" /></div>
                      <h3 className="text-xs font-black text-white uppercase">Modalità TV</h3>
                      <p className="text-[11px] text-slate-400 mt-3 p-2.5 bg-[#060D1E] rounded-xl font-semibold border border-slate-800">Aggiudica a voce dal pannello centrale.</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
                        <History size={13} className="text-emerald-400" /> Cronologia Live
                      </h3>
                      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                        {bidHistory.length > 0 ? (
                          bidHistory.map((item, idx) => (
                            <div key={idx} className="bg-[#060D1E] p-2 rounded-lg flex justify-between items-center text-xs border border-slate-800/80">
                              <div><span className="font-bold text-white block truncate max-w-[90px]">{item.bidder}</span><span className="text-[9px] text-slate-500">{item.time}</span></div>
                              <span className="font-black text-emerald-400">{item.amount} FM</span>
                            </div>
                          ))
                        ) : (<p className="text-xs text-slate-500 text-center py-6">Nessun rilancio.</p>)}
                      </div>
                    </>
                  )}
                </aside>
              </main>
            ) : (
              /* PAGINA BUZZER DEDICATA A SMARTPHONE */
              <main className="flex-1 flex flex-col gap-3 max-w-sm mx-auto w-full my-auto overflow-hidden items-center justify-between relative py-1 px-1">
                <div className="text-center space-y-1 w-full bg-[#0B132B] p-3 rounded-2xl border border-slate-800 shadow-md">
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/20 px-2 py-0.2 text-[8px] font-black tracking-wider text-rose-300"><span className="h-1 w-1 rounded-full bg-rose-400" />LIVE</span>
                    <span className={`text-[9px] font-black px-2 py-0.2 rounded-full uppercase ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 bg-[#060D1E] pl-1 pr-2 py-0.2 rounded-full uppercase border border-slate-800"><TeamBadge team={activePlayer.team} size={14} /><span>{activePlayer.team}</span></div>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight truncate">{activePlayer.name}</h2>
                  <p className="text-xs font-bold text-slate-400">Base D'Asta: <strong className="text-amber-400">{activePlayer.basePrice} FM</strong></p>
                </div>

                <div className="w-full bg-[#0B132B] border border-slate-800 rounded-3xl p-4 flex flex-col items-center gap-3 shadow-xl">
                  <div className="text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Offerta Corrente</span>
                    <div className="text-4xl font-black text-amber-400">{currentBid} <span className="text-lg text-amber-300">FM</span></div>
                    {highestBidder ? <p className="text-xs text-emerald-400 font-extrabold mt-0.5 truncate max-w-[200px]">Rilancio da: {highestBidder}</p> : <p className="text-[10px] text-slate-500">In attesa di offerte</p>}
                  </div>

                  {/* PULSANTE BUZZ GRANDE E BEN VISIBILE DA SMARTPHONE */}
                  <button 
                    disabled={Boolean(awardModal?.show)}
                    onClick={() => handleRaise(selectedStep)} 
                    className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                      awardModal?.show 
                        ? 'bg-slate-800 border-2 border-slate-700 text-slate-500 cursor-not-allowed opacity-50' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_40px_rgba(16,185,129,0.3)] ring-4 ring-emerald-500/20 cursor-pointer'
                    }`}
                  >
                    <Zap size={40} className={awardModal?.show ? 'fill-slate-500' : 'fill-slate-950'} />
                    <span className="text-xl tracking-widest uppercase font-black">
                      {awardModal?.show ? 'BLOCCATO' : 'BUZZ'}
                    </span>
                  </button>

                  <div className="w-full grid grid-cols-4 gap-1.5">
                    {[1, 5, 10, 20].map(step => (
                      <button 
                        key={step} 
                        disabled={Boolean(awardModal?.show)}
                        onClick={() => { setSelectedStep(step); handleRaise(step); }} 
                        className={`py-2.5 text-xs font-black rounded-xl transition-all ${
                          awardModal?.show 
                            ? 'bg-slate-900 text-slate-600 cursor-not-allowed' 
                            : selectedStep === step 
                              ? 'bg-amber-500 text-slate-950 scale-105 shadow-md cursor-pointer' 
                              : 'bg-[#060D1E] text-white hover:bg-slate-800 cursor-pointer'
                        }`}
                      >
                        +{step}
                      </button>
                    ))}
                  </div>
                </div>
              </main>
            )
          )}

          {activeTab === 'ROSTERS' && (
             <main className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch my-1 overflow-y-auto lg:overflow-hidden w-full pb-8 lg:pb-0">
               <aside className="w-full lg:w-[220px] shrink-0 bg-[#0B132B] border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-3 lg:overflow-hidden shadow-xl min-h-[200px] lg:min-h-0">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-800">
                   <span className="flex items-center gap-1.5"><Shirt size={13} className="text-amber-400" /> Rose</span>
                 </h3>
                 <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                   {coaches.map(c => {
                     const isSelected = selectedRosterCoach === c.name;
                     return (
                       <button key={c.name} onClick={() => setSelectedRosterCoach(c.name)} className={`w-full flex justify-between items-center p-2.5 rounded-xl border text-left cursor-pointer transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' : 'bg-[#060D1E] border-slate-800 text-white'}`}>
                         <div>
                           <span className="font-bold text-xs block">{c.name}</span>
                           <span className="text-[10px] text-slate-400 block">{c.teamName}</span>
                         </div>
                         <div className="text-right">
                           <span className="font-black text-amber-400 text-xs block">{c.budget} FM</span>
                           <span className="text-[9px] text-emerald-400 font-bold">{(purchasedPlayers[c.name] || []).length} Gioc.</span>
                         </div>
                       </button>
                     );
                   })}
                 </div>
               </aside>
      
               <section className="w-full lg:flex-1 shrink-0 bg-[#0B132B] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative shadow-xl lg:overflow-y-auto min-h-[450px] lg:min-h-0">
                 {(() => {
                   const currentCoachData = coaches.find(c => c.name === selectedRosterCoach) || coaches[0];
                   const roster = (currentCoachData && purchasedPlayers[currentCoachData.name]) || [];
                   const por = roster.filter(item => item.player.role === 'P');
                   const dif = roster.filter(item => item.player.role === 'D');
                   const cen = roster.filter(item => item.player.role === 'C');
                   const att = roster.filter(item => item.player.role === 'A');
      
                   return (
                   <div className="space-y-4">
                     <div className="flex flex-col md:flex-row justify-between md:items-center bg-[#060D1E] p-3 rounded-xl border border-slate-800 gap-3">
                       <div>
                         <h2 className="text-lg font-black text-white uppercase tracking-wider">{currentCoachData?.name}</h2>
                         <p className="text-xs text-slate-400">{currentCoachData?.teamName}</p>
                       </div>
                       <div className="flex gap-3 text-center">
                         <div className="flex-1 md:flex-none bg-[#0B132B] px-3 py-1.5 rounded-lg border border-slate-800">
                           <span className="text-[9px] text-slate-400 block uppercase font-bold">Residui</span>
                           <span className="text-sm font-black text-amber-400">{currentCoachData?.budget} FM</span>
                         </div>
                         <div className="flex-1 md:flex-none bg-[#0B132B] px-3 py-1.5 rounded-lg border border-slate-800">
                           <span className="text-[9px] text-slate-400 block uppercase font-bold">In Rosa</span>
                           <span className="text-sm font-black text-emerald-400">{roster.length} Giocatori</span>
                         </div>
                       </div>
                     </div>
      
                     {[
                       { label: 'Portieri', role: 'P', items: por, max: 3, color: 'bg-amber-500 text-slate-950' },
                       { label: 'Difensori', role: 'D', items: dif, max: 8, color: 'bg-emerald-500 text-slate-950' },
                       { label: 'Centrocampisti', role: 'C', items: cen, max: 8, color: 'bg-sky-500 text-slate-950' },
                       { label: 'Attaccanti', role: 'A', items: att, max: 6, color: 'bg-rose-600 text-white' },
                     ].map(sec => (
                       <div key={sec.role} className="space-y-1.5">
                         <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                           <span className={`text-[10px] font-black px-2 py-0.2 rounded-full uppercase ${sec.color}`}>{sec.role}</span>
                           <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">{sec.label}</h3>
                           <span className="text-[10px] text-slate-400 font-bold">({sec.items.length}/{sec.max})</span>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
                           {Array.from({ length: sec.max }).map((_, slotIdx) => {
                             const item = sec.items[slotIdx];
                             return item ? (
                               <div key={slotIdx} className="bg-[#060D1E] border border-slate-800 p-2 rounded-lg flex flex-col justify-between min-h-[60px]">
                                 <div>
                                   <span className="font-extrabold text-xs text-white block truncate">{item.player.name}</span>
                                   <span className="flex items-center gap-1 text-[9px] text-slate-400 truncate"><TeamBadge team={item.player.team} size={11} /><span className="truncate">{item.player.team}</span></span>
                                 </div>
                                 <span className="font-black text-amber-400 text-[10px] mt-0.5">{item.price} FM</span>
                               </div>
                             ) : (
                               <div key={slotIdx} className="bg-[#060D1E]/50 border border-dashed border-slate-800 p-2 rounded-lg flex flex-col items-center justify-center min-h-[55px] text-slate-500">
                                 <span className="text-[9px] font-bold uppercase">Slot {slotIdx + 1}</span>
                                 <span className="text-[8px]">Vuoto</span>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                     ))}
                   </div>
                   );
                 })()}
               </section>
             </main>
          )}

          {activeTab === 'HIGHLIGHTS' && (
            <main className="flex-1 flex flex-col gap-3 items-center justify-center p-4 bg-[#0B132B] border border-slate-800 rounded-3xl my-1 relative overflow-y-auto shadow-2xl pb-8">
              <div className="text-center">
                <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Gran Gala • Report Ufficiale
                </span>
                <h2 className="text-2xl font-black text-white uppercase mt-1">🏆 HIGHLIGHTS & RIEPILOGO ASTA 🏆</h2>
                <p className="text-xs text-slate-400">Analisi dettagliata, statistiche di spesa e record della lega</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full max-w-4xl my-1">
                <div className="bg-[#060D1E] border border-slate-800 rounded-xl p-3 text-center flex flex-col items-center gap-1 shadow-md">
                  <Award size={22} className="text-amber-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Mr. Budget Resiliente</span>
                  <strong className="text-xs text-white font-extrabold">{coaches.sort((a,b) => b.budget - a.budget)[0]?.name}</strong>
                  <span className="text-[11px] font-black text-emerald-400">{coaches.sort((a,b) => b.budget - a.budget)[0]?.budget} FM Residui</span>
                </div>

                <div className="bg-[#060D1E] border border-slate-800 rounded-xl p-3 text-center flex flex-col items-center gap-1 shadow-md">
                  <Flame size={22} className="text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Rosa Più Folta</span>
                  <strong className="text-xs text-white font-extrabold">{coaches.sort((a,b) => b.playersCount - a.playersCount)[0]?.name}</strong>
                  <span className="text-[11px] font-black text-amber-400">{coaches.sort((a,b) => b.playersCount - a.playersCount)[0]?.playersCount} Calciatori</span>
                </div>

                <div className="bg-[#060D1E] border border-slate-800 rounded-xl p-3 text-center flex flex-col items-center gap-1 shadow-md">
                  <PieChart size={22} className="text-sky-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Totale Crediti Spesi</span>
                  <strong className="text-xs text-white font-extrabold">{coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0)} FM</strong>
                  <span className="text-[11px] font-black text-sky-400">Su tutta la Lega</span>
                </div>

                <div className="bg-[#060D1E] border border-slate-800 rounded-xl p-3 text-center flex flex-col items-center gap-1 shadow-md">
                  <TrendingUp size={22} className="text-purple-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Media Spesa / Rosa</span>
                  <strong className="text-xs text-white font-extrabold">
                    {Math.round(coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0) / (coaches.reduce((acc, c) => acc + c.playersCount, 0) || 1))} FM
                  </strong>
                  <span className="text-[11px] font-black text-purple-400">A Calciatore</span>
                </div>
              </div>

              <div className="w-full max-w-4xl bg-[#060D1E] border border-slate-800 rounded-xl p-3">
                <h4 className="text-xs font-black uppercase text-amber-400 mb-2 flex items-center gap-1.5">
                  <Trophy size={13} /> Riepilogo Finanziario
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {coaches.map(c => {
                    const spesi = initialBudget - c.budget;
                    const percentuale = Math.round((spesi / initialBudget) * 100);
                    return (
                      <div key={c.name} className="flex items-center justify-between p-2 bg-[#0B132B] rounded-lg text-xs border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{c.name}</span>
                          <span className="text-[9px] text-slate-400">({c.teamName})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-bold text-[11px]">{c.playersCount} In Rosa</span>
                          <span className="text-amber-400 font-black text-[11px] hidden md:inline">{spesi} Spesi ({percentuale}%)</span>
                          <span className="text-sky-400 font-bold text-[11px]">{c.budget} Residui</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 mt-1 w-full md:w-auto">
                <button onClick={handleExportCSV} className="w-full py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                  <Download size={14} /> Scarica CSV Completo
                </button>
              </div>
            </main>
          )}

          {showMobileCoaches && (
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 p-4 flex flex-col lg:hidden">
               <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                 <h3 className="text-white font-black uppercase flex items-center gap-2 text-sm"><Trophy className="text-amber-400" size={16}/> Status Allenatori</h3>
                 <button onClick={() => setShowMobileCoaches(false)} className="text-slate-400 hover:text-white bg-[#0B132B] p-1.5 rounded-lg"><X size={18}/></button>
               </div>
               <div className="space-y-2 overflow-y-auto flex-1 pb-8">
                 {coaches.map(c => (
                   <div key={c.name} className="flex justify-between items-center p-2.5 rounded-xl bg-[#0B132B] border border-slate-800">
                     <div>
                       <span className="font-bold text-xs block text-white">{c.name}</span>
                       <span className="text-[10px] text-slate-400 block">{c.teamName}</span>
                       <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5"><Users size={9} /> {c.playersCount} slot</span>
                     </div>
                     <span className="font-black text-amber-400 text-xs">{c.budget} FM</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {showMobileHistory && (
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 p-4 flex flex-col lg:hidden">
               <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                 <h3 className="text-white font-black uppercase flex items-center gap-2 text-sm"><History className="text-emerald-400" size={16}/> Cronologia Live</h3>
                 <button onClick={() => setShowMobileHistory(false)} className="text-slate-400 hover:text-white bg-[#0B132B] p-1.5 rounded-lg"><X size={18}/></button>
               </div>
               <div className="space-y-2 overflow-y-auto flex-1 pb-8">
                 {bidHistory.length > 0 ? (
                   bidHistory.map((item, idx) => (
                     <div key={idx} className="bg-[#0B132B] border border-slate-800 p-2.5 rounded-xl flex justify-between items-center text-xs">
                       <div><span className="font-bold text-white block">{item.bidder}</span><span className="text-[9px] text-slate-500">{item.time}</span></div>
                       <span className="font-black text-emerald-400">{item.amount} FM</span>
                     </div>
                   ))
                 ) : (<p className="text-xs text-slate-500 text-center py-6">Nessun rilancio.</p>)}
               </div>
            </div>
          )}

          {customAlertMessage && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3 shadow-2xl text-center relative">
                <button onClick={() => setCustomAlertMessage(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 mx-auto">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">Avviso FantasyBuzz</span>
                  <p className="text-xs text-white font-semibold mt-2 leading-relaxed">{customAlertMessage}</p>
                </div>
                <button onClick={() => setCustomAlertMessage(null)} className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-sm">
                  Capito
                </button>
              </div>
            </div>
          )}

          {showCustomLeagueModal && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3 shadow-2xl text-center relative">
                <button onClick={() => setShowCustomLeagueModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 mx-auto"><ShieldCheck size={20} /></div>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">Configurazione Stanza</span>
                  <h3 className="text-base font-black text-white uppercase mt-1">Nome della Lega</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Questo nome diventerà il codice stanza per i tuoi amici.</p>
                </div>
                <input type="text" placeholder="Es. FantaLega Amici 2026" value={customLeagueInput} onChange={(e) => setCustomLeagueInput(e.target.value)} className="w-full bg-[#060D1E] border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400 text-center" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setShowCustomLeagueModal(false)} className="flex-1 py-2 bg-[#060D1E] border border-slate-800 text-slate-400 hover:text-white font-bold rounded-xl text-xs uppercase cursor-pointer">Annulla</button>
                  <button onClick={() => { if (!customLeagueInput || customLeagueInput.trim() === '') { setCustomAlertMessage("❌ Devi inserire un nome valido per la lega!"); return; } const nameClean = customLeagueInput.trim(); setLeagueName(nameClean); setRoomCode(nameClean.toUpperCase().replace(/\s+/g, '')); setShowCustomLeagueModal(false); setShowPaywall(true); }} className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-sm">Conferma 🚀</button>
                </div>
              </div>
            </div>
          )}

          {showPlayerPaymentModal && pendingPlayerAuth && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-3 shadow-2xl text-center relative">
                <button onClick={() => setShowPlayerPaymentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto"><CreditCard size={24} /></div>
                <div>
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Quota Partecipante</span>
                  <h3 className="text-lg font-black text-white uppercase mt-1">{pendingPlayerAuth.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Stanza: <strong className="text-amber-400">{leagueName}</strong></p>
                </div>
                <div className="bg-[#060D1E] border border-slate-800 p-3 rounded-2xl space-y-1">
                  <span className="text-xs text-slate-300 uppercase font-bold block">Quota di partecipazione</span>
                  <div className="text-2xl font-black text-amber-400">€{splitPrice}</div>
                  <p className="text-[9px] text-slate-400">Paga la quota per attivare il tuo buzzer in stanza.</p>
                </div>
                <button onClick={() => { setCustomAlertMessage(`Pagamento di €${splitPrice} completato con successo per ${pendingPlayerAuth.name}! Accesso consentito.`); loginPlayerDirectly(pendingPlayerAuth); }} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase shadow-md cursor-pointer">Paga Quota & Entra ⚡</button>
              </div>
            </div>
          )}

          {showIncompleteWarning && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-red-500/50 rounded-3xl p-5 max-w-md w-full flex flex-col gap-3 shadow-2xl relative">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 mx-auto"><AlertCircle size={28} /></div>
                <div className="text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/30">Lega Incompleta</span>
                  <h3 className="text-lg font-black text-white uppercase mt-1">Mancano Partecipanti!</h3>
                  <p className="text-xs text-slate-400 mt-1">Lega impostata per <strong className="text-white">{coachesCount} partecipanti</strong>, attuali: <strong className="text-amber-400">{coaches.length} allenatori</strong>.</p>
                </div>
                <div className="bg-[#060D1E] p-3 rounded-2xl border border-slate-800 space-y-2">
                  <button onClick={() => setShowIncompleteWarning(false)} className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"><Users size={14} /> Aspetta altri allenatori</button>
                  <button onClick={() => { setCoachesCount(coaches.length); setShowIncompleteWarning(false); setUserRole('PRESIDENT'); setActiveTab('AUCTION'); }} className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"><Check size={15} /> Adatta a {coaches.length} ed avvia</button>
                </div>
              </div>
            </div>
          )}

          {playerGuideStep !== null && userRole === 'PLAYER' && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-xs w-full text-center shadow-2xl flex flex-col items-center gap-3 relative">
                <button onClick={() => setPlayerGuideStep(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={16} /></button>
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400"><Zap size={20} /></div>
                <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">Guida • {playerGuideStep}/3</span>
                {playerGuideStep === 1 && (<><h4 className="text-xs font-black text-white uppercase">1. Guarda lo Schermo TV 📺</h4><p className="text-[11px] text-slate-400">Segui la TV del salotto per vedere la card del calciatore e l'offerta in tempo reale.</p></>)}
                {playerGuideStep === 2 && (<><h4 className="text-xs font-black text-white uppercase">2. Seleziona il Rilancio ➕</h4><p className="text-[11px] text-slate-400">Scegli di quanti crediti vuoi superare l'offerta (+1, +5, +10) con i tastini in basso.</p></>)}
                {playerGuideStep === 3 && (<><h4 className="text-xs font-black text-white uppercase">3. Premi il BUZZER! ⚡</h4><p className="text-[11px] text-slate-400">Premi il pulsantone verde **BUZZ**: il tuo rilancio volerà all'istante sulla TV!</p></>)}
                <div className="w-full pt-2 border-t border-slate-800">
                  {playerGuideStep < 3 ? <button onClick={() => setPlayerGuideStep(playerGuideStep + 1)} className="w-full py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1">Avanti <ArrowRight size={13} /></button> : <button onClick={() => setPlayerGuideStep(null)} className="w-full py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase shadow-md">Pronto! ⚽</button>}
                </div>
              </div>
            </div>
          )}

          {showPaywall && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-lg w-full flex flex-col gap-4 shadow-2xl relative">
                <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
                <div className="text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Licenza Campionato 2026/2027</span>
                  <h2 className="text-xl font-black text-white uppercase mt-1">Sblocca la tua Lega 🚀</h2>
                  <p className="text-xs text-slate-400">Scegli la modalità per la tua serata d'asta</p>
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
                {selectedPackage === 'LIVE' && (
                  <div className="bg-[#060D1E] p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white flex items-center gap-1"><Users size={13} className="text-amber-400" /> Partecipanti:</span>
                      <span className="font-black text-amber-400 text-xs">{coachesCount} Persone</span>
                    </div>
                    <input type="range" min="4" max="20" value={coachesCount} onChange={(e) => setCoachesCount(Number(e.target.value))} className="w-full accent-amber-400 cursor-pointer" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaymentType('SINGLE')} className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${paymentType === 'SINGLE' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-[#060D1E] text-slate-400 border-slate-800'}`}><CreditCard size={13} /> Presidente</button>
                    <button onClick={() => setPaymentType('SPLIT')} className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${paymentType === 'SPLIT' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-[#060D1E] text-slate-400 border-slate-800'}`}><Users2 size={13} /> Cassa Comune</button>
                  </div>
                </div>
                <div className="bg-[#060D1E] p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Totale Stanza</span>
                    {paymentType === 'SPLIT' ? <span className="text-[11px] text-emerald-400 font-bold">~ €{splitPrice} / persona</span> : <span className="text-[11px] text-slate-400">Istantanea</span>}
                  </div>
                  <div className="text-xl font-black text-amber-400">€{totalPrice.toFixed(2)}</div>
                </div>
                <button onClick={handlePayment} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"><CreditCard size={15} /> Paga ORA</button>
              </div>
            </div>
          )}

          {/* GUIDA RAPIDA DEMO: ORA È MINIMIZZATA DI DEFAULT IN BASSO A DESTRA PER NON COPRIRE I COMANDI */}
          {demoStep !== null && userRole === 'PRESIDENT' && (
            isDemoGuideMinimized ? (
              <button 
                onClick={() => setIsDemoGuideMinimized(false)}
                className="fixed bottom-4 right-4 z-50 bg-amber-500 text-slate-950 font-black p-3 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 transition-all border border-amber-300 cursor-pointer"
              >
                <HelpCircle size={20} />
                <span className="text-xs uppercase hidden md:inline">Guida Demo</span>
              </button>
            ) : (
              <div className="fixed bottom-4 right-4 z-50 max-w-xs bg-[#0B132B] border border-amber-400/80 p-4 rounded-2xl shadow-2xl flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">Guida Demo • {demoStep}/3</span>
                  <button onClick={() => setIsDemoGuideMinimized(true)} className="text-slate-400 hover:text-white cursor-pointer"><X size={15} /></button>
                </div>
                {demoStep === 1 && (<><h4 className="text-xs font-black text-white uppercase">1. La Regia del Presidente 📺</h4><p className="text-[11px] text-slate-400">Scegli i calciatori, gestisci i tempi ed aggiudica le offerte in un tap!</p></>)}
                {demoStep === 2 && (<><h4 className="text-xs font-black text-white uppercase">2. Buzzer Live da Smartphone ⚡</h4><p className="text-[11px] text-slate-400">I fantallenatori rilanciano direttamente dal proprio telefono sulla TV.</p></>)}
                {demoStep === 3 && (<><h4 className="text-xs font-black text-white uppercase">3. Rose ed Export 📊</h4><p className="text-[11px] text-slate-400">Tutto calcolato in automatico con esportazione rapida in Excel.</p></>)}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                  {demoStep < 3 ? <button onClick={() => setDemoStep(demoStep + 1)} className="w-full py-1.5 bg-amber-500 text-slate-950 font-black rounded-lg text-xs uppercase flex items-center justify-center gap-1">Prossimo <ArrowRight size={12} /></button> : <button onClick={() => setIsDemoGuideMinimized(true)} className="w-full py-1.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs uppercase">Chiudi Guida ⚽</button>}
                </div>
              </div>
            )
          )}

          {showConfig && userRole === 'PRESIDENT' && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-md w-full flex flex-col gap-3 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowConfig(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
                <h2 className="text-base font-black text-white uppercase flex items-center gap-2"><Settings size={18} className="text-amber-400" /> Configurazione Lega</h2>
                <div className="space-y-2.5 text-xs">
                  <div><label className="text-slate-400 font-bold block mb-1">Nome della Lega</label><input type="text" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} className="w-full bg-[#060D1E] border border-slate-800 rounded-xl p-2 text-white focus:outline-none" /></div>
                  <div><label className="text-slate-400 font-bold block mb-1">Budget Iniziale (FM)</label><input type="number" value={initialBudget} onChange={(e) => setInitialBudget(Number(e.target.value))} className="w-full bg-[#060D1E] border border-slate-800 rounded-xl p-2 text-amber-400 font-black focus:outline-none" /></div>
                  
                  <div className="bg-[#060D1E] border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-amber-400 block tracking-wider flex items-center gap-1">
                      <Share2 size={12} /> Invita Partecipanti (Stanza: <strong className="text-white">{roomCode}</strong>)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button onClick={handleShareWhatsApp} className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 shadow-sm cursor-pointer"><MessageCircle size={12} /> WhatsApp</button>
                      <button onClick={handleShareTelegram} className="py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 shadow-sm cursor-pointer"><Send size={12} /> Telegram</button>
                      <button onClick={handleCopyInviteLink} className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 shadow-sm cursor-pointer">Copia</button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-1"><label className="text-slate-400 font-bold">Allenatori ({coaches.length} iscritti)</label></div>
                    <div className="flex gap-1.5 mb-2">
                      <input type="text" placeholder="Nome" value={newCoachName} onChange={(e) => setNewCoachName(e.target.value)} className="flex-1 bg-[#060D1E] border border-slate-800 rounded-lg p-1.5 text-white font-semibold text-xs" />
                      <input type="text" placeholder="Squadra" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="flex-1 bg-[#060D1E] border border-slate-800 rounded-lg p-1.5 text-white font-semibold text-xs" />
                      <button onClick={handleAddCoach} className="p-1.5 bg-emerald-500 text-slate-950 font-black rounded-lg cursor-pointer"><Plus size={16} /></button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {coaches.map((c) => (
                        <div key={c.name} className="flex justify-between items-center p-1.5 bg-[#060D1E] rounded-lg border border-slate-800">
                          <div><span className="font-bold text-white block text-xs">{c.name}</span><span className="text-[9px] text-slate-400">{c.teamName}</span></div>
                          <div className="flex items-center gap-2"><span className="text-amber-400 font-bold text-xs">{c.budget} FM</span>{c.name !== 'Presidente (Tu)' && (<button onClick={() => handleRemoveCoach(c.name)} className="text-red-400 hover:text-red-300"><Trash2 size={13} /></button>)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleTryStartAuction} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase text-xs cursor-pointer mt-1 shadow-sm">Salva & Avvia</button>
              </div>
            </div>
          )}

          {awardModal?.show && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 max-w-sm w-full text-center shadow-2xl relative flex flex-col items-center gap-3">
                <button onClick={() => { setAwardModal(null); if (userRole === 'PRESIDENT') handleNextPlayer(); }} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 shadow-inner animate-bounce"><Sparkles size={28} /></div>
                <div>
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Colpo Aggiudicato! ⚽</span>
                  <h2 className="text-xl font-black text-white uppercase mt-1">{awardModal.player.name}</h2>
                  <div className="mt-0.5 flex items-center justify-center gap-1.5"><TeamBadge team={awardModal.player.team} size={18} /><p className="text-[11px] text-slate-400">{awardModal.player.team} • Ruolo {awardModal.player.role}</p></div>
                </div>
                <div className="w-full bg-[#060D1E] border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <div className="text-left"><span className="text-[8px] text-slate-400 uppercase font-bold block">Acquistato da</span><span className="text-sm font-black text-amber-400">{awardModal.winner}</span></div>
                  <div className="text-right"><span className="text-[8px] text-slate-400 uppercase font-bold block">Prezzo Finale</span><span className="text-lg font-black text-emerald-400">{awardModal.price} FM</span></div>
                </div>
                <button onClick={handleDownloadSocialCard} className="w-full py-2 bg-[#060D1E] border border-amber-400/60 hover:bg-amber-400 hover:text-slate-950 text-amber-300 font-extrabold rounded-xl text-xs uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"><Share2 size={14} /> ⚡ Condividi Card</button>
                {userRole === 'PRESIDENT' ? (
                  <button onClick={() => { setAwardModal(null); handleNextPlayer(); }} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-md">Prossimo Giocatore ⚽</button>
                ) : (
                  <button onClick={() => setAwardModal(null)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer">Chiudi</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}