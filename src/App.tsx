import { useState, useEffect } from 'react';
import { useAuctionStore } from './store/useAuctionStore';
import { Trophy, Check, Zap, Sparkles, X, SkipForward, History, Users, ShieldCheck, LogOut, Settings, Plus, Trash2, Share2, Search, Download, Shirt, Play, ArrowRight, CreditCard, Tv, Smartphone, Users2, Monitor, Timer, Flame, Award, PieChart, Image, AlertCircle, TrendingUp, MessageCircle, Send } from 'lucide-react';
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

const teamColors: Record<string, { bg: string; border: string; accent: string }> = {
  Inter: { bg: 'from-blue-900 via-slate-900 to-black', border: 'border-blue-500', accent: 'bg-blue-600' },
  Milan: { bg: 'from-red-900 via-slate-900 to-black', border: 'border-red-600', accent: 'bg-red-600' },
  Juventus: { bg: 'from-slate-800 via-zinc-900 to-black', border: 'border-white', accent: 'bg-white text-black' },
  Napoli: { bg: 'from-sky-700 via-sky-900 to-slate-950', border: 'border-sky-400', accent: 'bg-sky-400 text-black' },
  Roma: { bg: 'from-amber-700 via-red-950 to-slate-950', border: 'border-amber-500', accent: 'bg-amber-500 text-black' },
  Lazio: { bg: 'from-sky-500 via-slate-900 to-slate-950', border: 'border-sky-300', accent: 'bg-sky-300 text-black' },
  Atalanta: { bg: 'from-blue-800 via-slate-900 to-black', border: 'border-blue-400', accent: 'bg-blue-500' },
  Fiorentina: { bg: 'from-purple-900 via-indigo-950 to-slate-950', border: 'border-purple-500', accent: 'bg-purple-500' },
  Bologna: { bg: 'from-red-900 via-blue-950 to-slate-950', border: 'border-red-500', accent: 'bg-red-600' },
  Torino: { bg: 'from-amber-950 via-red-950 to-black', border: 'border-amber-700', accent: 'bg-amber-800' },
  Monza: { bg: 'from-red-700 via-rose-950 to-black', border: 'border-red-400', accent: 'bg-red-500' },
  Cagliari: { bg: 'from-blue-900 via-red-950 to-black', border: 'border-red-500', accent: 'bg-red-600' },
  Udinese: { bg: 'from-zinc-700 via-stone-900 to-black', border: 'border-zinc-300', accent: 'bg-white text-black' },
  Verona: { bg: 'from-yellow-700 via-blue-950 to-black', border: 'border-yellow-400', accent: 'bg-yellow-400 text-black' },
  Genoa: { bg: 'from-blue-900 via-red-900 to-black', border: 'border-red-500', accent: 'bg-blue-600' },
  Lecce: { bg: 'from-yellow-600 via-red-900 to-black', border: 'border-yellow-400', accent: 'bg-yellow-400 text-black' },
  Como: { bg: 'from-blue-600 via-blue-900 to-slate-950', border: 'border-blue-300', accent: 'bg-blue-400 text-black' },
  Parma: { bg: 'from-yellow-600 via-blue-900 to-black', border: 'border-yellow-400', accent: 'bg-yellow-400 text-black' },
  Sassuolo: { bg: 'from-emerald-800 via-slate-900 to-black', border: 'border-emerald-400', accent: 'bg-emerald-500' },
  Venezia: { bg: 'from-orange-800 via-emerald-950 to-black', border: 'border-orange-500', accent: 'bg-orange-500' },
};

const ROLE_LIMITS: Record<string, number> = { P: 3, D: 8, C: 8, A: 6 };

const getTeamStyle = (teamName: string) => teamColors[teamName] || { bg: 'from-slate-800 via-slate-900 to-black', border: 'border-amber-400', accent: 'bg-amber-400 text-black' };

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'P': return 'bg-yellow-400 text-slate-950';
    case 'D': return 'bg-emerald-500 text-white';
    case 'C': return 'bg-blue-500 text-white';
    case 'A': return 'bg-red-500 text-white';
    default: return 'bg-slate-500 text-white';
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
    const channel = supabase.channel(`room_${roomCode}`);
    
    channel
      .on('broadcast', { event: 'new_bid' }, (payload: any) => {
        const { bidder_name, bid_amount } = payload.payload;
        if (bidder_name) {
          playBuzzSound();
          setIsBlinking(true);
          setCountdown(null);
          setTimeout(() => setIsBlinking(false), 250);

          placeBid(bidder_name, bid_amount);

          setLatestBidAlert({ bidder: bidder_name, amount: bid_amount });
          setTimeout(() => setLatestBidAlert(null), 2500);

          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          setBidHistory(prev => [{ bidder: bidder_name, amount: bid_amount, time: timeStr }, ...prev]);
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
  const teamStyle = getTeamStyle(activePlayer.team);
  const isTopPlayer = activePlayer.basePrice >= 15;

  const handleStartDemo = () => {
    setIsDemoMode(true);
    setActivePackage('LIVE');
    setRoomCode('BUZZ2026');
    setLeagueName('Lega Demo (3 Partecipanti)');
    setInitialBudget(500);
    setCoaches([
      { name: 'Presidente (Tu)', teamName: 'Real Presidente', budget: 500, playersCount: 0 },
      { name: 'Luca (Demo)', teamName: 'Atletico Luca', budget: 500, playersCount: 0 },
      { name: 'Marco (Demo)', teamName: 'Marco City', budget: 500, playersCount: 0 },
    ]);
    setCoachesCount(3);
    setSelectedRosterCoach('Presidente (Tu)');
    setUserRole('PRESIDENT');
    setDemoStep(1);
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
    const activeName = userRole === 'PRESIDENT' ? 'Presidente (Tu)' : playerName;
    const nuovaOfferta = highestBidder ? currentBid + stepVal : stepVal;

    playBuzzSound();
    setIsBlinking(true);
    setCountdown(null);
    setTimeout(() => setIsBlinking(false), 250);
    placeBid(activeName, nuovaOfferta);

    setLatestBidAlert({ bidder: activeName, amount: nuovaOfferta });
    setTimeout(() => setLatestBidAlert(null), 2500);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setBidHistory(prev => [{ bidder: activeName, amount: nuovaOfferta, time: timeStr }, ...prev]);

    if (activeChannel) {
      try {
        await activeChannel.send({
          type: 'broadcast',
          event: 'new_bid',
          payload: { bidder_name: activeName, bid_amount: nuovaOfferta },
        });
      } catch (e) { console.error("Errore broadcast Supabase:", e); }
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

  const handleAward = () => {
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
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff']
      });
    } catch (e) { console.error(e); }

    setCoaches(prev => prev.map(c => c.name === winnerName ? { ...c, budget: c.budget - finalPrice, playersCount: c.playersCount + 1 } : c));
    setPurchasedPlayers(prev => ({ ...prev, [winnerName]: [...(prev[winnerName] || []), { player: activePlayer, price: finalPrice }] }));
    setAwardModal({ show: true, player: activePlayer, winner: winnerName, price: finalPrice });
  };

  const handleDownloadSocialCard = () => {
    if (!awardModal) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgGradient = ctx.createRadialGradient(540, 960, 100, 540, 960, 900);
    bgGradient.addColorStop(0, '#0a3828');
    bgGradient.addColorStop(1, '#020906');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    const confettiColors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff'];
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 1080;
      const y = Math.random() * 1920;
      const radius = Math.random() * 8 + 2;
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 16;
    ctx.strokeRect(40, 40, 1000, 1840);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ FANTASYBUZZ AUCTION LIVE ⚡', 540, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.fillText('COLPO DA 90 AGGIUDICATO!', 540, 260);

    const cardGradient = ctx.createLinearGradient(190, 340, 890, 1150);
    cardGradient.addColorStop(0, '#124235');
    cardGradient.addColorStop(0.5, '#072019');
    cardGradient.addColorStop(1, '#030d0a');
    
    ctx.fillStyle = cardGradient;
    ctx.beginPath();
    ctx.roundRect(190, 340, 700, 800, [40]);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(230, 380, 120, 60, [15]);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '900 36px sans-serif';
    ctx.fillText(awardModal.player.role, 290, 423);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 36px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(awardModal.player.team.toUpperCase(), 850, 423);

    ctx.textAlign = 'center';
    ctx.beginPath();
    ctx.arc(540, 630, 130, 0, 2 * Math.PI);
    ctx.fillStyle = '#030d0a';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 130px sans-serif';
    ctx.fillText(awardModal.player.name.charAt(0), 540, 675);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 75px sans-serif';
    ctx.fillText(awardModal.player.name.toUpperCase(), 540, 860);

    ctx.fillStyle = '#80bca8';
    ctx.font = '700 36px sans-serif';
    ctx.fillText(`Quotazione Iniziale: ${awardModal.player.basePrice} FM`, 540, 930);

    ctx.fillStyle = '#030d0a';
    ctx.beginPath();
    ctx.roundRect(190, 1200, 700, 360, [30]);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px sans-serif';
    ctx.fillText('NUOVO FANTALLENATORE', 540, 1270);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 70px sans-serif';
    ctx.fillText(awardModal.winner.toUpperCase(), 540, 1350);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 100px sans-serif';
    ctx.fillText(`${awardModal.price} FM`, 540, 1480);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 38px sans-serif';
    ctx.fillText('Vuoi un\'asta così per la tua Lega?', 540, 1680);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 45px sans-serif';
    ctx.fillText('👉 Prova FantasyBuzz.app', 540, 1750);

    const link = document.createElement('a');
    link.download = `FantasyBuzz_${awardModal.player.name.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
        <div className="min-h-screen w-full bg-[#04060c] text-white flex flex-col items-center justify-center p-4 select-none relative z-10 box-border">
          <div className="max-w-md w-full bg-[#0d1322] border border-[#1e2d4a] rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap size={32} />
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">FantasyBuzz</h1>
              <p className="text-xs text-[#7c8cae] mt-1">Accesso Stanza & Asta Live</p>
            </div>

            <div className="w-full bg-[#060913] border border-[#1e2d4a] p-3.5 rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">Accesso Partecipanti / Ospiti</span>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-[#7c8cae] font-bold uppercase block mb-1">Nome della Lega</label>
                  <input
                    type="text"
                    placeholder="Es. FantaLega Serie A"
                    value={inputLeagueName}
                    onChange={(e) => setInputLeagueName(e.target.value)}
                    className="w-full bg-[#0d1322] border border-[#1e2d4a] rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#7c8cae] font-bold uppercase block mb-1">Codice Stanza (Nome Lega o BUZZ2026 per Demo)</label>
                  <input
                    type="text"
                    placeholder="Es. FANTALEGASERIEA"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#0d1322] border border-[#1e2d4a] rounded-xl p-2.5 text-xs text-amber-400 font-black tracking-widest text-center focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={handleStartDemo}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                <Play size={16} className="fill-slate-950" /> Prova la Demo Gratuita (Codice: BUZZ2026)
              </button>

              <button
                onClick={() => {
                  if (!leagueName || leagueName.trim() === '' || leagueName === 'FantaLega Serie A') {
                    setShowCustomLeagueModal(true);
                  } else {
                    setShowPaywall(true);
                  }
                }}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                <ShieldCheck size={18} /> Crea Nuova Lega / Sblocca Stanza 🚀
              </button>

              <div className="flex items-center my-1 gap-2">
                <div className="flex-1 h-px bg-[#1e2d4a]"></div>
                <span className="text-[10px] text-[#7c8cae] font-bold uppercase">oppure seleziona il tuo profilo</span>
                <div className="flex-1 h-px bg-[#1e2d4a]"></div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#7c8cae] block text-center uppercase tracking-wider">
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
                      className="p-3 bg-[#060913] hover:bg-emerald-500/20 hover:border-emerald-400 border border-[#1e2d4a] rounded-xl font-bold text-xs text-white flex flex-col items-start gap-1 transition-all active:scale-95 cursor-pointer text-left"
                    >
                      <span className="font-extrabold text-amber-300 truncate w-full">{c.name}</span>
                      <span className="text-[10px] text-[#7c8cae] truncate w-full">{c.teamName}</span>
                      <span className="text-[10px] text-emerald-400 font-black">{c.budget} FM</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`h-screen w-screen font-sans flex flex-col justify-between p-3 md:p-5 select-none overflow-hidden relative z-10 transition-colors duration-500 ${
          userRole === 'PRESIDENT' 
            ? 'bg-[#030d0a] text-[#e2e8f0]' 
            : 'bg-[#03140e] text-[#e2e8f0]'
        }`}>
          
          {isDemoMode && (
            <div className="bg-emerald-500 text-slate-950 font-black text-center py-1 text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              <span>🎮 Modalità DEMO Attiva</span>
              <button onClick={() => setShowPaywall(true)} className="bg-slate-950 text-white px-2 py-0.5 rounded-lg text-[10px] lowercase font-semibold hover:bg-slate-800 cursor-pointer">
                Sblocca Lega Completa 🚀
              </button>
            </div>
          )}

          <header className={`flex flex-col lg:flex-row justify-between items-center p-3 px-4 md:px-6 rounded-2xl border flex-shrink-0 my-1 gap-3 lg:gap-0 lg:h-14 ${
            userRole === 'PRESIDENT' 
              ? 'bg-[#081e18] border-[#124235]' 
              : 'bg-[#062017] border-[#103d2c]'
          }`}>
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Zap size={16} />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
                    FantasyBuzz 
                    {userRole === 'PRESIDENT' ? (
                      <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1 shadow-md">
                        <Tv size={10} /> TABELLONE TV
                      </span>
                    ) : (
                      <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black tracking-widest flex items-center gap-1 shadow-md">
                        <Smartphone size={10} /> SMARTPHONE BUZZER
                      </span>
                    )}
                  </h1>
                  <p className="text-[10px] text-[#80bca8]">
                    {userRole === 'PRESIDENT' ? `👑 REGIA (${leagueName})` : `⚽ FANTALLENATORE: ${playerName.toUpperCase()}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto bg-[#030d0a] p-1 rounded-xl border border-[#124235] w-full lg:w-auto justify-start lg:justify-center lg:ml-4">
                <button
                  onClick={() => setActiveTab('AUCTION')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'AUCTION' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-[#80bca8] hover:text-white'}`}
                >
                  <Zap size={13} /> Asta Live
                </button>
                <button
                  onClick={() => {
                    if (!selectedRosterCoach && coaches.length > 0) setSelectedRosterCoach(coaches[0].name);
                    setActiveTab('ROSTERS');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'ROSTERS' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-[#80bca8] hover:text-white'}`}
                >
                  <Shirt size={13} /> Rose Lega
                </button>
                {userRole === 'PRESIDENT' && (
                  <button
                    onClick={() => setActiveTab('HIGHLIGHTS')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'HIGHLIGHTS' ? 'bg-emerald-400 text-slate-950 shadow-md' : 'text-[#80bca8] hover:text-white'}`}
                  >
                    <Award size={13} /> Highlights & Riepilogo
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
              {userRole === 'PRESIDENT' && (
                <button
                  onClick={() => setIsPureTvDisplay(!isPureTvDisplay)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isPureTvDisplay ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-[#124235] text-white border border-[#1d6350]'
                  }`}
                >
                  <Monitor size={14} /> {isPureTvDisplay ? 'TV: Attiva' : 'Vista TV'}
                </button>
              )}

              {activePackage === 'LIVE' && userRole === 'PRESIDENT' && (
                <div className="inline-flex items-center gap-1.5 bg-[#030d0a] border border-[#124235] px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-400">
                  <Share2 size={12} /> Stanza: <strong className="text-white tracking-widest">{roomCode}</strong>
                </div>
              )}

              {userRole === 'PRESIDENT' && activeTab === 'ROSTERS' && (
                <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer shadow-md">
                  <Download size={14} /> Scarica CSV
                </button>
              )}

              {userRole === 'PRESIDENT' && (
                <button onClick={() => setShowConfig(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#124235] hover:bg-amber-400 hover:text-slate-950 text-white border border-[#1d6350] transition-all cursor-pointer">
                  <Settings size={14} /> Configura
                </button>
              )}

              <button
                onClick={() => { setUserRole(null); setPlayerName(''); setIsDemoMode(false); setDemoStep(null); setPlayerGuideStep(null); }}
                className="flex items-center gap-1 text-xs bg-[#124235] hover:bg-red-500/20 hover:border-red-400 text-[#80bca8] hover:text-white font-bold px-3 py-1.5 rounded-xl border border-[#1d6350] transition-all cursor-pointer"
              >
                <LogOut size={13} /> ESCI
              </button>
            </div>
          </header>

          {activeTab === 'AUCTION' && (
            userRole === 'PRESIDENT' ? (
              <main className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch my-1 overflow-y-auto lg:overflow-hidden w-full relative pb-10 lg:pb-0">
                
                {latestBidAlert && (
                  <div className="absolute top-4 lg:top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 text-slate-950 font-black px-6 py-2 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.9)] border-2 border-white animate-bounce flex items-center gap-2">
                    <Zap size={20} className="fill-slate-950" />
                    <span className="text-sm uppercase tracking-wider">⚡ RILANCIO DA {latestBidAlert.bidder.toUpperCase()}: {latestBidAlert.amount} FM!</span>
                  </div>
                )}

                <aside className="hidden lg:flex w-[280px] shrink-0 bg-[#072019] border border-[#124235] rounded-2xl p-4 flex-col gap-3 overflow-hidden shadow-2xl">
                  <h3 className="text-xs font-bold text-[#80bca8] uppercase tracking-wider flex items-center justify-between pb-2 border-b border-[#124235]">
                    <span className="flex items-center gap-2"><Trophy size={14} className="text-amber-400" /> Allenatori</span>
                    <span className="text-[10px] text-[#80bca8]">Rosa / Budget</span>
                  </h3>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                    {coaches.map(c => (
                      <div key={c.name} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                        highestBidder === c.name 
                          ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400' 
                          : 'bg-[#030d0a] border-[#124235]'
                      }`}>
                        <div>
                          <span className="font-bold text-xs block text-white">{c.name}</span>
                          <span className="text-[10px] text-[#80bca8] block">{c.teamName}</span>
                          <span className="text-[9px] text-[#80bca8] flex items-center gap-1 mt-0.5"><Users size={9} /> {c.playersCount} slot</span>
                        </div>
                        <span className="font-black text-amber-400 text-sm">{c.budget} FM</span>
                      </div>
                    ))}
                  </div>
                </aside>

                <section className={`w-full lg:flex-1 shrink-0 min-h-[600px] lg:min-h-0 bg-gradient-to-b ${
                  countdown !== null && countdown <= 2 
                    ? 'from-red-900/80 via-amber-950 to-slate-950 border-red-500 animate-pulse' 
                    : 'from-[#0f4d34] via-[#093322] to-[#051c13] border-amber-400/80'
                } border-2 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-between relative shadow-[0_0_60px_rgba(16,185,129,0.35)] overflow-hidden transition-all duration-300`}>
                  
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-2">
                      <span className={`font-black text-sm uppercase tracking-widest ${countdown <= 2 ? 'text-red-400 animate-bounce' : 'text-amber-400 animate-pulse'}`}>
                        {countdown <= 2 ? '🚨 GONG ZONE - ULTIMISSIMI SECONDI! 🚨' : 'Ultima Chiamata!'}
                      </span>
                      <div className={`text-8xl font-black ${countdown <= 2 ? 'text-red-500' : 'text-white'} drop-shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-ping`}>
                        {countdown}
                      </div>
                      <p className="text-xs text-[#80bca8]">Premi BUZZ per interrompere!</p>
                    </div>
                  )}

                  <div className="w-full bg-[#030d0a]/90 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-2.5 flex flex-col gap-2 z-10 shadow-lg">
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-2.5 text-[#80bca8]" />
                        <input type="text" placeholder="Cerca calciatore in asta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#072019] border border-[#124235] rounded-xl py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none" />
                      </div>
                      <div className="flex gap-1 overflow-x-auto">
                        {['ALL', 'P', 'D', 'C', 'A'].map(r => (
                          <button key={r} onClick={() => setSelectedRole(r as any)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${selectedRole === r ? 'bg-amber-400 text-slate-950' : 'bg-[#072019] text-[#80bca8]'}`}>{r}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto py-1.5 max-h-24 md:max-h-20 border-t border-[#124235]">
                      {filteredList.map(p => (
                        <button key={p.id} onClick={() => handleSelectPlayer(p)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex-shrink-0 transition-all cursor-pointer ${activePlayer.id === p.id ? 'bg-amber-400/20 border-amber-400 text-amber-300' : 'bg-[#072019] border-[#124235] text-[#80bca8] hover:text-white'}`}>
                          <span className="mr-1 text-[10px] opacity-70">[{p.role}]</span> {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`hidden lg:flex w-[220px] h-[280px] relative flex-col justify-between p-4 rounded-3xl border-4 bg-gradient-to-b ${teamStyle.bg} ${teamStyle.border} shadow-[0_0_60px_rgba(0,0,0,0.85)] transition-all transform z-10 my-4 ${isBlinking ? 'scale-105 brightness-125' : 'hover:scale-102'}`}>
                    {isTopPlayer && (
                      <div className="absolute -top-3 -right-3 z-30 bg-gradient-to-r from-amber-400 to-red-500 text-slate-950 font-black px-2.5 py-1 rounded-full border border-white text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-lg animate-pulse">
                        <Flame size={12} className="fill-slate-950" /> TOP
                      </div>
                    )}
                    <div className="flex justify-between items-center z-10">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase shadow-md ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                      <span className="text-[11px] font-black bg-black/80 text-white px-2.5 py-1 rounded-xl uppercase border border-white/20">{activePlayer.team}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center my-1 relative">
                      <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-white/20 flex items-center justify-center backdrop-blur-md shadow-2xl">
                        <span className="text-4xl font-black text-white">{activePlayer.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div className="bg-black/80 text-white rounded-2xl p-2 text-center border border-white/20 z-10 shadow-xl">
                      <h3 className="text-sm font-black uppercase truncate">{activePlayer.name}</h3>
                      <div className="mt-1 pt-1 border-t border-white/10 text-[11px] font-bold text-amber-300">Base: <strong>{activePlayer.basePrice} FM</strong></div>
                    </div>
                  </div>

                  <div className="flex lg:hidden w-full bg-[#030d0a]/90 backdrop-blur-md border border-amber-400 rounded-2xl p-3 items-center justify-between shadow-lg my-2 z-10 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${teamStyle.bg}`}></div>
                    <div className="pl-3">
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-md ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                          {isTopPlayer && <span className="text-[9px] font-black text-amber-400 uppercase flex items-center gap-1"><Flame size={10}/> TOP</span>}
                       </div>
                       <h3 className="text-xl font-black text-white uppercase leading-tight">{activePlayer.name}</h3>
                       <p className="text-[11px] text-[#80bca8] uppercase font-bold">{activePlayer.team} • Base: {activePlayer.basePrice} FM</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#124235] border border-white/20 flex items-center justify-center shadow-inner">
                       <span className="text-xl font-black text-white">{activePlayer.name.charAt(0)}</span>
                    </div>
                  </div>

                  <div className="w-full max-w-lg bg-[#030d0a]/90 backdrop-blur-md border-2 border-amber-400 p-3 rounded-2xl flex flex-col gap-2 z-10 shadow-2xl">
                    {activePackage === 'TV' && !isDemoMode ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-[#80bca8] font-bold uppercase block mb-1">Seleziona Vincitore Asta</label>
                            <select
                              value={selectedWinnerManual || coaches[0].name}
                              onChange={(e) => setSelectedWinnerManual(e.target.value)}
                              className="w-full bg-[#072019] border border-[#124235] rounded-xl p-2 text-xs font-bold text-amber-300 focus:outline-none"
                            >
                              {coaches.map(c => (
                                <option key={c.name} value={c.name}>{c.name} ({c.teamName})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-full md:w-32">
                            <label className="text-[10px] text-[#80bca8] font-bold uppercase block mb-1">Prezzo (FM)</label>
                            <input
                              type="number"
                              placeholder="Es. 55"
                              value={manualPriceInput}
                              onChange={(e) => setManualPriceInput(e.target.value)}
                              className="w-full bg-[#072019] border border-[#124235] rounded-xl p-2 text-xs font-black text-emerald-400 text-center focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-[#124235]">
                          <button onClick={handleNextPlayer} className="flex-1 py-2 bg-[#072019] text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1 border cursor-pointer">
                            <SkipForward size={14} /> Salta Giocatore
                          </button>
                          <button onClick={handleAward} className="flex-1 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1 cursor-pointer shadow-lg">
                            <Check size={16} /> Aggiudica Subito
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-2">
                          <div>
                            <span className="text-[10px] font-bold text-[#80bca8] uppercase block">Offerta</span>
                            {highestBidder ? <p className="text-xs text-emerald-400 font-bold truncate max-w-[90px]">{highestBidder}</p> : <p className="text-xs text-[#80bca8]">Base {activePlayer.basePrice}</p>}
                          </div>

                          <div className={`text-4xl font-black text-amber-400 transition-all transform ${isSlotSpinning ? 'scale-125 -translate-y-1 blur-[1px]' : 'scale-100'}`}>
                            {displayBid} <span className="text-lg text-amber-500">FM</span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              onClick={() => setCountdown(3)}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-[11px] uppercase flex items-center gap-1 cursor-pointer shadow-md"
                            >
                              <Timer size={13} /> Count 3s
                            </button>
                            <div className="flex gap-1.5">
                              <button onClick={handleNextPlayer} className="px-3 py-2 bg-[#072019] text-[#e2e8f0] font-bold rounded-xl text-[11px] uppercase flex items-center gap-1 border cursor-pointer"><SkipForward size={12} /> Salta</button>
                              <button onClick={handleAward} className="px-3 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-[11px] uppercase flex items-center gap-1 cursor-pointer shadow-lg"><Check size={14} /> Aggiudica</button>
                            </div>
                          </div>
                        </div>

                        {!isPureTvDisplay && (
                          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#124235]">
                            {[1, 5, 10, 20].map(step => (
                              <button key={step} onClick={() => handleRaise(step)} className="py-2 bg-[#072019] hover:bg-amber-400 hover:text-slate-950 text-white border text-xs font-black rounded-xl cursor-pointer">+{step}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex lg:hidden gap-2 w-full mt-2 z-10">
                    <button onClick={() => setShowMobileCoaches(true)} className="flex-1 py-3 bg-[#072019] border border-[#124235] rounded-xl flex items-center justify-center gap-1.5 text-white font-bold text-xs shadow-md">
                       <Users size={14} className="text-amber-400"/> Status Rosa
                    </button>
                    <button onClick={() => setShowMobileHistory(true)} className="flex-1 py-3 bg-[#072019] border border-[#124235] rounded-xl flex items-center justify-center gap-1.5 text-white font-bold text-xs shadow-md">
                       <History size={14} className="text-emerald-400"/> Rilanci Live
                    </button>
                  </div>
                </section>

                <aside className="hidden lg:flex w-[280px] shrink-0 bg-[#072019] border border-[#124235] rounded-2xl p-4 flex-col gap-3 overflow-hidden shadow-2xl">
                  {activePackage === 'TV' && !isDemoMode ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <div className="w-16 h-16 rounded-full bg-[#124235] flex items-center justify-center mb-4"><Tv size={32} className="text-[#80bca8]" /></div>
                      <h3 className="text-sm font-black text-white uppercase">Modalità TV</h3>
                      <p className="text-xs text-[#80bca8] mt-4 p-3 bg-[#030d0a] border border-[#124235] rounded-xl font-semibold">Usa l'interfaccia centrale per aggiudicare a voce.</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xs font-bold text-[#80bca8] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#124235]">
                        <History size={14} className="text-emerald-400" /> Cronologia Live
                      </h3>
                      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                        {bidHistory.length > 0 ? (
                          bidHistory.map((item, idx) => (
                            <div key={idx} className="bg-[#030d0a] border border-[#124235] p-2.5 rounded-xl flex justify-between items-center text-xs">
                              <div><span className="font-bold text-white block">{item.bidder}</span><span className="text-[9px] text-[#80bca8]">{item.time}</span></div>
                              <span className="font-black text-emerald-400">{item.amount} FM</span>
                            </div>
                          ))
                        ) : (<p className="text-xs text-[#80bca8] text-center py-6">Nessun rilancio.</p>)}
                      </div>
                    </>
                  )}
                </aside>
              </main>
            ) : (
              <main className="flex-1 flex flex-col gap-3 max-w-sm mx-auto w-full my-1 overflow-hidden items-center justify-between relative">
                <div className={`w-[190px] h-[230px] relative flex flex-col justify-between p-3 rounded-3xl border-2 bg-gradient-to-b ${teamStyle.bg} ${teamStyle.border} shadow-[0_0_30px_rgba(0,0,0,0.8)]`}>
                  <div className="flex justify-between items-center z-10">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-md ${getRoleBadge(activePlayer.role)}`}>{activePlayer.role}</span>
                    <span className="text-[10px] font-black bg-black/80 text-white px-2 py-0.5 rounded-xl uppercase border">{activePlayer.team}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center my-1">
                    <div className="w-16 h-16 rounded-full bg-black/40 border border-white/20 flex items-center justify-center shadow-xl">
                      <span className="text-2xl font-black text-white">{activePlayer.name.charAt(0)}</span>
                    </div>
                  </div>
                  <div className="bg-black/80 text-white rounded-xl p-1.5 text-center border z-10">
                    <h3 className="text-xs font-black uppercase truncate">{activePlayer.name}</h3>
                    <p className="text-[9px] text-amber-300 font-bold mt-0.5">Base: {activePlayer.basePrice} FM</p>
                  </div>
                </div>

                <div className="w-full bg-[#08281d] border-2 border-emerald-500/40 rounded-3xl p-4 flex flex-col items-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                  <div className="text-center">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Offerta Corrente</span>
                    <div className="text-4xl font-black text-amber-400">{currentBid} <span className="text-lg">FM</span></div>
                    {highestBidder ? <p className="text-xs text-emerald-300 font-bold mt-0.5">Rilancio da: {highestBidder}</p> : <p className="text-xs text-[#80bca8]">Base: {activePlayer.basePrice} FM</p>}
                  </div>

                  <button onClick={() => handleRaise(selectedStep)} className="w-36 h-36 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 active:scale-90 border-4 border-emerald-300 text-slate-950 font-black flex flex-col items-center justify-center gap-0.5 shadow-[0_0_50px_rgba(16,185,129,0.7)] cursor-pointer my-1 transition-all">
                    <Zap size={40} className="fill-slate-950" />
                    <span className="text-2xl tracking-widest uppercase font-black">BUZZ</span>
                  </button>

                  <div className="w-full grid grid-cols-4 gap-2">
                    {[1, 5, 10, 20].map(step => (
                      <button key={step} onClick={() => { setSelectedStep(step); handleRaise(step); }} className={`py-3 border text-sm font-black rounded-2xl cursor-pointer transition-all ${selectedStep === step ? 'bg-emerald-400 text-slate-950 border-emerald-200 scale-105 shadow-md' : 'bg-[#041710] text-white border-emerald-900'}`}>+{step}</button>
                    ))}
                  </div>
                </div>
              </main>
            )
          )}

          {activeTab === 'ROSTERS' && (
             <main className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch my-2 overflow-y-auto lg:overflow-hidden w-full pb-10 lg:pb-0">
               <aside className="w-full lg:w-[280px] shrink-0 bg-[#072019] border border-[#124235] rounded-2xl p-4 flex flex-col gap-3 lg:overflow-hidden shadow-2xl min-h-[300px] lg:min-h-0">
                 <h3 className="text-xs font-bold text-[#80bca8] uppercase tracking-wider flex items-center justify-between pb-2 border-b border-[#124235]">
                   <span className="flex items-center gap-2"><Shirt size={14} className="text-amber-400" /> Sguardo Rose</span>
                 </h3>
                 <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                   {coaches.map(c => {
                     const isSelected = selectedRosterCoach === c.name;
                     return (
                       <button key={c.name} onClick={() => setSelectedRosterCoach(c.name)} className={`w-full flex justify-between items-center p-3 rounded-xl border text-left cursor-pointer transition-all ${isSelected ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-md' : 'bg-[#030d0a] border-[#124235] text-white'}`}>
                         <div>
                           <span className="font-bold text-xs block">{c.name}</span>
                           <span className="text-[10px] text-[#80bca8] block">{c.teamName}</span>
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
      
               <section className="w-full lg:flex-1 shrink-0 bg-[#072019] border border-[#124235] rounded-2xl p-5 flex flex-col justify-between relative shadow-2xl lg:overflow-y-auto min-h-[500px] lg:min-h-0">
                 {(() => {
                   const currentCoachData = coaches.find(c => c.name === selectedRosterCoach) || coaches[0];
                   const roster = (currentCoachData && purchasedPlayers[currentCoachData.name]) || [];
                   const por = roster.filter(item => item.player.role === 'P');
                   const dif = roster.filter(item => item.player.role === 'D');
                   const cen = roster.filter(item => item.player.role === 'C');
                   const att = roster.filter(item => item.player.role === 'A');
      
                   return (
                   <div className="space-y-6">
                     <div className="flex flex-col md:flex-row justify-between md:items-center bg-[#030d0a] p-4 rounded-2xl border border-[#124235] gap-4">
                       <div>
                         <h2 className="text-lg font-black text-white uppercase tracking-wider">{currentCoachData?.name}</h2>
                         <p className="text-xs text-[#80bca8]">{currentCoachData?.teamName}</p>
                       </div>
                       <div className="flex gap-4 text-center">
                         <div className="flex-1 md:flex-none bg-[#072019] px-3 py-1.5 rounded-xl border border-[#124235]">
                           <span className="text-[10px] text-[#80bca8] block uppercase font-bold">Crediti Residui</span>
                           <span className="text-base font-black text-amber-400">{currentCoachData?.budget} FM</span>
                         </div>
                         <div className="flex-1 md:flex-none bg-[#072019] px-3 py-1.5 rounded-xl border border-[#124235]">
                           <span className="text-[10px] text-[#80bca8] block uppercase font-bold">Totale In Rosa</span>
                           <span className="text-base font-black text-emerald-400">{roster.length} Giocatori</span>
                         </div>
                       </div>
                     </div>
      
                     {[
                       { label: 'Portieri', role: 'P', items: por, max: 3, color: 'bg-yellow-400 text-slate-950' },
                       { label: 'Difensori', role: 'D', items: dif, max: 8, color: 'bg-emerald-500 text-white' },
                       { label: 'Centrocampisti', role: 'C', items: cen, max: 8, color: 'bg-blue-500 text-white' },
                       { label: 'Attaccanti', role: 'A', items: att, max: 6, color: 'bg-red-500 text-white' },
                     ].map(sec => (
                       <div key={sec.role} className="space-y-2">
                         <div className="flex items-center gap-2 pb-1 border-b border-[#124235]">
                           <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase ${sec.color}`}>{sec.role}</span>
                           <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">{sec.label}</h3>
                           <span className="text-[10px] text-[#80bca8] font-bold">({sec.items.length}/{sec.max})</span>
                         </div>
                         {sec.items.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                             {sec.items.map((item, idx) => (
                               <div key={idx} className="bg-[#030d0a] border border-[#124235] p-2.5 rounded-xl flex justify-between items-center">
                                 <div>
                                   <span className="font-bold text-xs text-white block">{item.player.name}</span>
                                   <span className="text-[10px] text-[#80bca8]">{item.player.team}</span>
                                 </div>
                                 <span className="font-black text-amber-400 text-xs bg-amber-400/10 px-2 py-1 rounded-lg border">{item.price} FM</span>
                               </div>
                             ))}
                           </div>
                         ) : <p className="text-xs text-[#80bca8] italic py-1">Nessun calciatore acquistato in questo ruolo.</p>}
                       </div>
                     ))}
                   </div>
                   );
                 })()}
               </section>
             </main>
          )}

          {activeTab === 'HIGHLIGHTS' && (
            <main className="flex-1 flex flex-col gap-4 items-center justify-center p-6 bg-[#072019] border border-[#124235] rounded-3xl my-2 relative overflow-y-auto shadow-2xl pb-10">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">
                  Gran Gala di Chiusura • Report Ufficiale
                </span>
                <h2 className="text-3xl font-black text-white uppercase mt-2">🏆 HIGHLIGHTS & RIEPILOGO ASTA 🏆</h2>
                <p className="text-xs text-[#80bca8]">Analisi dettagliata, statistiche di spesa e record della lega</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl my-2">
                <div className="bg-[#030d0a] border-2 border-amber-400/80 rounded-2xl p-4 text-center flex flex-col items-center gap-1.5 shadow-lg">
                  <Award size={26} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-[#80bca8] uppercase">Mr. Budget Resiliente</span>
                  <strong className="text-sm text-white font-extrabold">{coaches.sort((a,b) => b.budget - a.budget)[0]?.name}</strong>
                  <span className="text-xs font-black text-emerald-400">{coaches.sort((a,b) => b.budget - a.budget)[0]?.budget} FM Residui</span>
                </div>

                <div className="bg-[#030d0a] border-2 border-emerald-400/80 rounded-2xl p-4 text-center flex flex-col items-center gap-1.5 shadow-lg">
                  <Flame size={26} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-[#80bca8] uppercase">Rosa Più Folta</span>
                  <strong className="text-sm text-white font-extrabold">{coaches.sort((a,b) => b.playersCount - a.playersCount)[0]?.name}</strong>
                  <span className="text-xs font-black text-amber-400">{coaches.sort((a,b) => b.playersCount - a.playersCount)[0]?.playersCount} Calciatori</span>
                </div>

                <div className="bg-[#030d0a] border-2 border-sky-400/80 rounded-2xl p-4 text-center flex flex-col items-center gap-1.5 shadow-lg">
                  <PieChart size={26} className="text-sky-400" />
                  <span className="text-[10px] font-bold text-[#80bca8] uppercase">Totale Crediti Spesi</span>
                  <strong className="text-sm text-white font-extrabold">{coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0)} FM</strong>
                  <span className="text-xs font-black text-sky-400">Su tutta la Lega</span>
                </div>

                <div className="bg-[#030d0a] border-2 border-purple-400/80 rounded-2xl p-4 text-center flex flex-col items-center gap-1.5 shadow-lg">
                  <TrendingUp size={26} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-[#80bca8] uppercase">Media Spesa / Rosa</span>
                  <strong className="text-sm text-white font-extrabold">
                    {Math.round(coaches.reduce((acc, c) => acc + (initialBudget - c.budget), 0) / (coaches.reduce((acc, c) => acc + c.playersCount, 0) || 1))} FM
                  </strong>
                  <span className="text-xs font-black text-purple-400">A Calciatore</span>
                </div>
              </div>

              <div className="w-full max-w-4xl bg-[#030d0a] border border-[#124235] rounded-2xl p-4">
                <h4 className="text-xs font-black uppercase text-amber-400 mb-3 flex items-center gap-2">
                  <Trophy size={14} /> Riepilogo Finanziario per Allenatore
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {coaches.map(c => {
                    const spesi = initialBudget - c.budget;
                    const percentuale = Math.round((spesi / initialBudget) * 100);
                    return (
                      <div key={c.name} className="flex items-center justify-between p-2.5 bg-[#072019] rounded-xl border border-[#124235] text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-white">{c.name}</span>
                          <span className="text-[10px] text-[#80bca8]">({c.teamName})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-400 font-bold">{c.playersCount} In Rosa</span>
                          <span className="text-amber-400 font-black hidden md:inline">{spesi} Spesi ({percentuale}%)</span>
                          <span className="text-sky-400 font-bold">{c.budget} Residui</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-2 w-full md:w-auto">
                <button onClick={handleExportCSV} className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs uppercase shadow-xl flex items-center justify-center gap-2 cursor-pointer">
                  <Download size={16} /> Scarica Report CSV Completo
                </button>
              </div>
            </main>
          )}

          {showMobileCoaches && (
            <div className="fixed inset-0 bg-[#030d0a]/95 backdrop-blur-sm z-50 p-4 flex flex-col lg:hidden">
               <div className="flex justify-between items-center pb-4 border-b border-[#124235] mb-4">
                 <h3 className="text-white font-black uppercase flex items-center gap-2"><Trophy className="text-amber-400" size={18}/> Status Allenatori</h3>
                 <button onClick={() => setShowMobileCoaches(false)} className="text-[#80bca8] hover:text-white bg-[#072019] p-2 rounded-xl"><X size={20}/></button>
               </div>
               <div className="space-y-2 overflow-y-auto flex-1 pb-10">
                 {coaches.map(c => (
                   <div key={c.name} className="flex justify-between items-center p-3 rounded-xl border bg-[#072019] border-[#124235]">
                     <div>
                       <span className="font-bold text-xs block text-white">{c.name}</span>
                       <span className="text-[10px] text-[#80bca8] block">{c.teamName}</span>
                       <span className="text-[9px] text-[#80bca8] flex items-center gap-1 mt-0.5"><Users size={9} /> {c.playersCount} slot</span>
                     </div>
                     <span className="font-black text-amber-400 text-sm">{c.budget} FM</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {showMobileHistory && (
            <div className="fixed inset-0 bg-[#030d0a]/95 backdrop-blur-sm z-50 p-4 flex flex-col lg:hidden">
               <div className="flex justify-between items-center pb-4 border-b border-[#124235] mb-4">
                 <h3 className="text-white font-black uppercase flex items-center gap-2"><History className="text-emerald-400" size={18}/> Cronologia Live</h3>
                 <button onClick={() => setShowMobileHistory(false)} className="text-[#80bca8] hover:text-white bg-[#072019] p-2 rounded-xl"><X size={20}/></button>
               </div>
               <div className="space-y-2 overflow-y-auto flex-1 pb-10">
                 {bidHistory.length > 0 ? (
                   bidHistory.map((item, idx) => (
                     <div key={idx} className="bg-[#072019] border border-[#124235] p-3 rounded-xl flex justify-between items-center text-xs">
                       <div><span className="font-bold text-white block">{item.bidder}</span><span className="text-[9px] text-[#80bca8]">{item.time}</span></div>
                       <span className="font-black text-emerald-400">{item.amount} FM</span>
                     </div>
                   ))
                 ) : (<p className="text-xs text-[#80bca8] text-center py-6">Nessun rilancio.</p>)}
               </div>
            </div>
          )}

          {/* MODALE DI AVVISO GRAFICO PERSONALIZZATO */}
          {customAlertMessage && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0d1322] border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center relative">
                <button onClick={() => setCustomAlertMessage(null)} className="absolute top-4 right-4 text-[#7c8cae] hover:text-white cursor-pointer"><X size={18} /></button>
                <div className="w-12 h-12 bg-amber-400/20 border border-amber-400/40 rounded-full flex items-center justify-center text-amber-400 mx-auto">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">Avviso FantasyBuzz</span>
                  <p className="text-xs text-white font-semibold mt-3 leading-relaxed">{customAlertMessage}</p>
                </div>
                <button onClick={() => setCustomAlertMessage(null)} className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-md">
                  Capito
                </button>
              </div>
            </div>
          )}

          {showCustomLeagueModal && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#0d1322] border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center relative">
                <button onClick={() => setShowCustomLeagueModal(false)} className="absolute top-4 right-4 text-[#7c8cae] hover:text-white cursor-pointer"><X size={18} /></button>
                <div className="w-12 h-12 bg-amber-400/20 border border-amber-400/40 rounded-full flex items-center justify-center text-amber-400 mx-auto"><ShieldCheck size={24} /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">Configurazione Stanza</span>
                  <h3 className="text-lg font-black text-white uppercase mt-2">Nome della Lega</h3>
                  <p className="text-xs text-[#7c8cae] mt-1">Questo nome diventerà il codice stanza per i tuoi amici.</p>
                </div>
                <input type="text" placeholder="Es. FantaLega Amici 2026" value={customLeagueInput} onChange={(e) => setCustomLeagueInput(e.target.value)} className="w-full bg-[#060913] border border-[#1e2d4a] rounded-xl p-3 text-xs text-white font-semibold focus:outline-none focus:border-amber-400 text-center" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setShowCustomLeagueModal(false)} className="flex-1 py-2.5 bg-[#060913] border border-[#1e2d4a] text-[#7c8cae] hover:text-white font-bold rounded-xl text-xs uppercase cursor-pointer">Annulla</button>
                  <button onClick={() => { if (!customLeagueInput || customLeagueInput.trim() === '') { setCustomAlertMessage("❌ Devi inserire un nome valido per la lega!"); return; } const nameClean = customLeagueInput.trim(); setLeagueName(nameClean); setRoomCode(nameClean.toUpperCase().replace(/\s+/g, '')); setShowCustomLeagueModal(false); setShowPaywall(true); }} className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-md">Conferma 🚀</button>
                </div>
              </div>
            </div>
          )}

          {showPlayerPaymentModal && pendingPlayerAuth && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#072019] border-2 border-emerald-400 rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl text-center relative">
                <button onClick={() => setShowPlayerPaymentModal(false)} className="absolute top-4 right-4 text-[#80bca8] hover:text-white cursor-pointer"><X size={18} /></button>
                <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center text-emerald-400 mx-auto"><CreditCard size={28} /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">Quota Fantallenatore (Cassa Comune)</span>
                  <h3 className="text-xl font-black text-white uppercase mt-2">{pendingPlayerAuth.name}</h3>
                  <p className="text-xs text-[#80bca8] mt-1">Stanza: <strong className="text-amber-400">{leagueName}</strong></p>
                </div>
                <div className="bg-[#030d0a] border border-[#124235] p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-[#80bca8] uppercase font-bold block">La tua quota di partecipazione</span>
                  <div className="text-3xl font-black text-amber-400">€{splitPrice}</div>
                  <p className="text-[10px] text-[#80bca8]">Paga la quota per attivare il tuo buzzer in stanza.</p>
                </div>
                <button onClick={() => { setCustomAlertMessage(`Pagamento di €${splitPrice} completato con successo per ${pendingPlayerAuth.name}! Accesso consentito.`); loginPlayerDirectly(pendingPlayerAuth); }} className="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase shadow-lg hover:brightness-110 cursor-pointer">Paga Quota & Entra in Asta ⚡</button>
              </div>
            </div>
          )}

          {showIncompleteWarning && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#072019] border-2 border-red-500 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-[0_0_60px_rgba(239,68,68,0.4)] relative">
                <div className="w-14 h-14 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center text-red-400 mx-auto"><AlertCircle size={32} /></div>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">Attenzione • Lega Incompleta</span>
                  <h3 className="text-xl font-black text-white uppercase mt-2">Mancano Partecipanti!</h3>
                  <p className="text-xs text-[#80bca8] mt-2">Avevi impostato la lega per <strong className="text-white">{coachesCount} partecipanti</strong>, ma attualmente risultano registrati <strong className="text-amber-400">{coaches.length} allenatori</strong>.</p>
                </div>
                <div className="bg-[#030d0a] p-3 rounded-2xl border border-[#124235] space-y-2">
                  <span className="text-[10px] font-bold text-[#80bca8] uppercase block">Cosa desideri fare?</span>
                  <button onClick={() => setShowIncompleteWarning(false)} className="w-full py-2.5 bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"><Users size={15} /> Aspetta che entrino tutti (Chiudi)</button>
                  <button onClick={() => { setCoachesCount(coaches.length); setShowIncompleteWarning(false); setUserRole('PRESIDENT'); setActiveTab('AUCTION'); }} className="w-full py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"><Check size={16} /> Adatta Lega a {coaches.length} partecipanti e Avvia</button>
                </div>
                <button onClick={() => setShowIncompleteWarning(false)} className="text-center text-xs text-[#80bca8] hover:text-white underline cursor-pointer mt-1">Torna alla Configurazione</button>
              </div>
            </div>
          )}

          {playerGuideStep !== null && userRole === 'PLAYER' && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#062017] border-2 border-emerald-400 rounded-3xl p-6 max-w-xs w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.4)] flex flex-col items-center gap-4 relative">
                <button onClick={() => setPlayerGuideStep(null)} className="absolute top-4 right-4 text-[#80bca8] hover:text-white"><X size={16} /></button>
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center text-emerald-400"><Zap size={24} /></div>
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Guida Rapida • Passaggio {playerGuideStep}/3</span>
                {playerGuideStep === 1 && (<><h4 className="text-sm font-black text-white uppercase">1. Guarda lo Schermo TV 📺</h4><p className="text-xs text-[#80bca8]">Segui la TV del salotto per vedere la card del calciatore in asta e l'offerta più alta in tempo reale.</p></>)}
                {playerGuideStep === 2 && (<><h4 className="text-sm font-black text-white uppercase">2. Seleziona il Rilancio ➕</h4><p className="text-xs text-[#80bca8]">Scegli di quanti crediti vuoi superare l'offerta (+1, +5, +10) usando i tastini in basso.</p></>)}
                {playerGuideStep === 3 && (<><h4 className="text-sm font-black text-white uppercase">3. Premi il BUZZER! ⚡</h4><p className="text-xs text-[#80bca8]">Premi il pulsantone verde **BUZZ**: il tuo rilancio volerà all'istante sulla TV superando tutti!</p></>)}
                <div className="w-full pt-2 border-t border-[#103d2c]">
                  {playerGuideStep < 3 ? <button onClick={() => setPlayerGuideStep(playerGuideStep + 1)} className="w-full py-2.5 bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1">Capito, Avanti <ArrowRight size={14} /></button> : <button onClick={() => setPlayerGuideStep(null)} className="w-full py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase shadow-lg">Pronto per l'Asta! ⚽</button>}
                </div>
              </div>
            </div>
          )}

          {showPaywall && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#072019] border-2 border-amber-400 rounded-3xl p-6 max-w-lg w-full flex flex-col gap-5 shadow-[0_0_60px_rgba(245,158,11,0.3)] relative">
                <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-[#80bca8] hover:text-white cursor-pointer"><X size={18} /></button>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">Licenza Campionato 2026/2027</span>
                  <h2 className="text-2xl font-black text-white uppercase mt-2">Sblocca la tua Lega 🚀</h2>
                  <p className="text-xs text-[#80bca8] mt-1">Scegli la modalità migliore per la tua serata d'asta</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setSelectedPackage('TV')} className={`p-4 rounded-2xl border flex flex-col gap-2 transition-all cursor-pointer text-left ${selectedPackage === 'TV' ? 'bg-amber-400/20 border-amber-400 text-white' : 'bg-[#030d0a] border-[#124235] text-[#80bca8]'}`}>
                    <Tv size={24} className={selectedPackage === 'TV' ? 'text-amber-400' : 'text-[#80bca8]'} />
                    <div><h4 className="text-xs font-black uppercase text-white">FantasyBuzz TV</h4><p className="text-[10px] text-[#80bca8]">Solo Schermo TV / Tabellone e Rose</p></div>
                    <span className="text-sm font-black text-amber-400 mt-1">€4,99 <span className="text-[10px] font-normal text-[#80bca8]">una tantum</span></span>
                  </button>
                  <button onClick={() => setSelectedPackage('LIVE')} className={`p-4 rounded-2xl border flex flex-col gap-2 transition-all cursor-pointer text-left relative overflow-hidden ${selectedPackage === 'LIVE' ? 'bg-emerald-500/20 border-amber-400 text-white' : 'bg-[#030d0a] border-[#124235] text-[#80bca8]'}`}>
                    <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-black text-[8px] uppercase px-2 py-0.5 rounded-bl-lg">Consigliato</div>
                    <Smartphone size={24} className={selectedPackage === 'LIVE' ? 'text-emerald-400' : 'text-[#80bca8]'} />
                    <div><h4 className="text-xs font-black uppercase text-white">FantasyBuzz LIVE</h4><p className="text-[10px] text-[#80bca8]">Schermo TV + Buzzer da Smartphone</p></div>
                    <span className="text-sm font-black text-emerald-400 mt-1">da €9,99 <span className="text-[10px] font-normal text-[#80bca8]">una tantum</span></span>
                  </button>
                </div>
                {selectedPackage === 'LIVE' && (
                  <div className="bg-[#030d0a] p-3 rounded-2xl border border-[#124235] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5"><Users size={14} className="text-amber-400" /> Numero Fantallenatori:</span>
                      <span className="font-black text-amber-400 text-sm">{coachesCount} Partecipanti</span>
                    </div>
                    <input type="range" min="4" max="20" value={coachesCount} onChange={(e) => setCoachesCount(Number(e.target.value))} className="w-full accent-amber-400 cursor-pointer" />
                    <p className="text-[10px] text-[#80bca8] text-center">Fino a 8 partecipanti: €9,99. Dazzeri extra: +1,00€ ad allenatore.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#80bca8] block uppercase">Modalità di Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaymentType('SINGLE')} className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${paymentType === 'SINGLE' ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-[#030d0a] text-[#80bca8] border-[#124235]'}`}><CreditCard size={14} /> Paga il Presidente</button>
                    <button onClick={() => setPaymentType('SPLIT')} className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${paymentType === 'SPLIT' ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-[#030d0a] text-[#80bca8] border-[#124235]'}`}><Users2 size={14} /> Cassa Comune (Dividi)</button>
                  </div>
                </div>
                <div className="bg-[#030d0a] p-4 rounded-2xl border border-[#124235] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-[#80bca8] uppercase block">Totale Licenza Stanza</span>
                    {paymentType === 'SPLIT' ? <span className="text-xs text-emerald-400 font-bold">~ €{splitPrice} / persona</span> : <span className="text-xs text-[#80bca8]">Attivazione Istantanea</span>}
                  </div>
                  <div className="text-2xl font-black text-amber-400">€{totalPrice.toFixed(2)}</div>
                </div>
                <button onClick={handlePayment} className="w-full py-4 bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"><CreditCard size={16} /> Procedi al Pagamento Sicuro</button>
              </div>
            </div>
          )}

          {demoStep !== null && userRole === 'PRESIDENT' && (
            <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-gradient-to-b from-[#0b3327] to-[#072019] border-2 border-amber-400 p-5 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">Guida Rapida • Passaggio {demoStep}/3</span>
                <button onClick={() => setDemoStep(null)} className="text-[#80bca8] hover:text-white"><X size={16} /></button>
              </div>
              {demoStep === 1 && (<><h4 className="text-sm font-black text-white uppercase">1. La Regia del Presidente 📺</h4><p className="text-xs text-[#80bca8]">Da questa console cerchi e metti all'asta i calciatori. Gestisci i tempi e aggiudica le offerte con un tap!</p></>)}
              {demoStep === 2 && (<><h4 className="text-sm font-black text-white uppercase">2. Buzzer Live da Smartphone ⚡</h4><p className="text-xs text-[#80bca8]">I fantallenatori premono BUZZ dal loro telefono per far comparire il rilancio istantaneamente sulla TV di tutti.</p></>)}
              {demoStep === 3 && (<><h4 className="text-sm font-black text-white uppercase">3. Aggiudicazione e Rose 📊</h4><p className="text-xs text-[#80bca8]">Aggiudica il giocatore per scalare in automatico i crediti al vincitore e scaricare il resoconto rose in Excel.</p></>)}
              <div className="flex justify-between items-center pt-2 border-t border-[#124235]">
                {demoStep < 3 ? <button onClick={() => setDemoStep(demoStep + 1)} className="w-full py-2 bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1">Prossimo <ArrowRight size={14} /></button> : <button onClick={() => setDemoStep(null)} className="w-full py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase">Inizia a Provare! ⚽</button>}
              </div>
            </div>
          )}

          {showConfig && userRole === 'PRESIDENT' && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-[#072019] border-2 border-amber-400/80 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowConfig(false)} className="absolute top-4 right-4 text-[#80bca8] hover:text-white cursor-pointer"><X size={18} /></button>
                <h2 className="text-lg font-black text-white uppercase flex items-center gap-2"><Settings size={20} className="text-amber-400" /> Configurazione Lega</h2>
                <div className="space-y-3 text-xs">
                  <div><label className="text-[#80bca8] font-bold block mb-1">Nome della Lega</label><input type="text" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} className="w-full bg-[#030d0a] border border-[#124235] rounded-xl p-2.5 text-white focus:outline-none" /></div>
                  <div><label className="text-[#80bca8] font-bold block mb-1">Budget Iniziale (FM) per ogni Allenatore</label><input type="number" value={initialBudget} onChange={(e) => setInitialBudget(Number(e.target.value))} className="w-full bg-[#030d0a] border border-[#124235] rounded-xl p-2.5 text-amber-400 font-black focus:outline-none" /></div>
                  
                  <div className="bg-[#030d0a] border border-[#124235] rounded-2xl p-3 space-y-2">
                    <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider flex items-center gap-1.5">
                      <Share2 size={13} /> Invita Fantallenatori (Stanza: <strong className="text-white">{roomCode}</strong>)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={handleShareWhatsApp} className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-md cursor-pointer"><MessageCircle size={14} /> WhatsApp</button>
                      <button onClick={handleShareTelegram} className="py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-md cursor-pointer"><Send size={14} /> Telegram</button>
                      <button onClick={handleCopyInviteLink} className="py-2 px-3 bg-[#124235] hover:bg-[#1d6350] text-amber-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-md cursor-pointer">Copia Link</button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#124235]">
                    <div className="flex justify-between items-center mb-1"><label className="text-[#80bca8] font-bold">Gestione Allenatori ({coaches.length} iscritti)</label></div>
                    <div className="flex gap-2 mb-2">
                      <input type="text" placeholder="Nome" value={newCoachName} onChange={(e) => setNewCoachName(e.target.value)} className="flex-1 bg-[#030d0a] border border-[#124235] rounded-xl p-2 text-white font-semibold" />
                      <input type="text" placeholder="Squadra" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="flex-1 bg-[#030d0a] border border-[#124235] rounded-xl p-2 text-white font-semibold" />
                      <button onClick={handleAddCoach} className="p-2 bg-emerald-500 text-slate-950 font-black rounded-xl cursor-pointer"><Plus size={18} /></button>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {coaches.map((c) => (
                        <div key={c.name} className="flex justify-between items-center p-2 bg-[#030d0a] rounded-xl border border-[#124235]">
                          <div><span className="font-bold text-white block">{c.name}</span><span className="text-[10px] text-[#80bca8]">{c.teamName}</span></div>
                          <div className="flex items-center gap-2"><span className="text-amber-400 font-bold">{c.budget} FM</span>{c.name !== 'Presidente (Tu)' && (<button onClick={() => handleRemoveCoach(c.name)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleTryStartAuction} className="w-full py-3 bg-amber-400 text-slate-950 font-black rounded-xl uppercase text-xs tracking-wider cursor-pointer mt-2 shadow-lg">Salva & Avvia Asta</button>
              </div>
            </div>
          )}

          {awardModal?.show && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-gradient-to-b from-[#0b3327] to-[#051c13] border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_80px_rgba(245,158,11,0.5)] relative flex flex-col items-center gap-4">
                <button onClick={() => { setAwardModal(null); if (userRole === 'PRESIDENT') handleNextPlayer(); }} className="absolute top-4 right-4 text-[#80bca8] hover:text-white cursor-pointer"><X size={18} /></button>
                <div className="w-14 h-14 bg-amber-400/20 border-2 border-amber-400 rounded-full flex items-center justify-center text-amber-400 shadow-inner animate-bounce"><Sparkles size={32} /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">Colpo Aggiudicato! ⚽</span>
                  <h2 className="text-2xl font-black text-white uppercase mt-2">{awardModal.player.name}</h2>
                  <p className="text-xs text-[#80bca8]">{awardModal.player.team} • Ruolo {awardModal.player.role}</p>
                </div>
                <div className="w-full bg-[#030d0a] border border-[#124235] rounded-2xl p-3.5 flex justify-between items-center shadow-inner">
                  <div className="text-left"><span className="text-[9px] text-[#80bca8] uppercase font-bold block">Acquistato da</span><span className="text-base font-black text-amber-400">{awardModal.winner}</span></div>
                  <div className="text-right"><span className="text-[9px] text-[#80bca8] uppercase font-bold block">Prezzo Finale</span><span className="text-xl font-black text-emerald-400">{awardModal.price} FM</span></div>
                </div>
                <button onClick={handleDownloadSocialCard} className="w-full py-2.5 bg-[#030d0a] border border-amber-400 hover:bg-amber-400 hover:text-slate-950 text-amber-300 font-extrabold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"><Image size={15} /> 📸 Genera & Scarica Card Social</button>
                {userRole === 'PRESIDENT' ? (
                  <button onClick={() => { setAwardModal(null); handleNextPlayer(); }} className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer shadow-lg hover:brightness-110">Prossimo Giocatore ⚽</button>
                ) : (
                  <button onClick={() => setAwardModal(null)} className="w-full py-3 bg-[#124235] text-white font-black rounded-xl text-xs uppercase cursor-pointer">Chiudi</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}