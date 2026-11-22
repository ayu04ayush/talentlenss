import { create } from 'zustand';
import { User, Job, Candidate, PipelineStage } from './types';

export interface FilterState {
  search: string;
  stage: string;
  minScore?: number;
  cgpaMin?: number;
  cgpaMax?: number;
  tenthMin?: number;
  tenthMax?: number;
  twelfthMin?: number;
  twelfthMax?: number;
  expMin?: number;
  expMax?: number;
  skills: string[];
  skillMode: 'AND' | 'OR';
  location: string;
  gradYearMin?: number;
  gradYearMax?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number;
}

const defaultFilters: FilterState = {
  search: '',
  stage: 'all',
  skills: [],
  skillMode: 'OR',
  location: '',
  sortBy: 'match_score',
  sortOrder: 'desc',
  page: 1,
  perPage: 25,
};

interface AppStore {
  user: User | null;
  setUser: (user: User | null) => void;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  selectedJobId: number | null;
  setSelectedJobId: (id: number | null) => void;

  filters: FilterState;
  setFilter: (key: keyof FilterState, value: any) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;

  selectedCandidateId: number | null;
  setSelectedCandidateId: (id: number | null) => void;

  compareCandidateIds: number[];
  toggleCompareCandidate: (id: number) => void;
  clearCompareCandidates: () => void;

  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  isUploadModalOpen: boolean;
  setUploadModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  theme: 'dark',
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
      if (next === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
    return { theme: next };
  }),

  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  selectedJobId: null,
  setSelectedJobId: (selectedJobId) => set({ selectedJobId }),

  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value, page: key === 'page' ? value : 1 },
    })),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: 1 },
    })),
  clearFilters: () => set({ filters: defaultFilters }),

  selectedCandidateId: null,
  setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),

  compareCandidateIds: [],
  toggleCompareCandidate: (id) =>
    set((state) => {
      const exists = state.compareCandidateIds.includes(id);
      if (exists) {
        return { compareCandidateIds: state.compareCandidateIds.filter((cid) => cid !== id) };
      }
      if (state.compareCandidateIds.length >= 4) {
        return state;
      }
      return { compareCandidateIds: [...state.compareCandidateIds, id] };
    }),
  clearCompareCandidates: () => set({ compareCandidateIds: [] }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  isUploadModalOpen: false,
  setUploadModalOpen: (open) => set({ isUploadModalOpen: open }),
}));
