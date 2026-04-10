import { create } from 'zustand'

interface ConsumerSearchState {
  isSearching: boolean
  setIsSearching: (searching: boolean) => void
}

export const useConsumerSearchStore = create<ConsumerSearchState>()((set) => ({
  isSearching: false,
  setIsSearching: (searching) => set({ isSearching: searching })
}))
