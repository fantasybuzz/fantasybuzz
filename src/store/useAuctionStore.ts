import { create } from 'zustand';

interface Player {
  id: string;
  name: string;
  role: 'P' | 'D' | 'C' | 'A';
  team: string;
  basePrice: number;
  mv?: string;
  fm?: string;
  overall?: number;
}

interface AuctionState {
  currentPlayer: Player | null;
  currentBid: number;
  highestBidder: string | null;
  setCurrentPlayer: (player: Player) => void;
  placeBid: (bidder: string, amount: number) => void;
  resetAuction: () => void;
}

export const useAuctionStore = create<AuctionState>((set) => ({
  currentPlayer: null,
  currentBid: 1,
  highestBidder: null,

  setCurrentPlayer: (player) =>
    set({
      currentPlayer: player,
      currentBid: 1,
      highestBidder: null,
    }),

  placeBid: (bidder, amount) =>
    set({
      currentBid: amount,
      highestBidder: bidder,
    }),

  resetAuction: () =>
    set({
      currentBid: 1,
      highestBidder: null,
    }),
}));