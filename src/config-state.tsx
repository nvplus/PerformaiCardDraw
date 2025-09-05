import type { StoreApi } from 'zustand';
import { createWithEqualityFn } from 'zustand/traditional';

export interface ConfigState {
  chartCount: number;
  upperBound: number;
  lowerBound: number;
  useLevelConstants: boolean;
  useWeights: boolean;
  orderByAction: boolean;
  hideVetos: boolean;
  weights: number[];
  /** charts of this level or higher will be grouped into the same "bucket" */
  groupSongsAt: number | null;
  forceDistribution: boolean;
  constrainPocketPicks: boolean;
  difficulties: ReadonlySet<string>;
  categories: ReadonlySet<string>;
  flags: ReadonlySet<string>;
  showEligibleCharts: boolean;
  playerNames: string[];
  tournamentRounds: string[];
  showPlayerAndRoundLabels: boolean;
  defaultPlayersPerDraw: number;
  useSongPool: boolean;
  songPoolString: string;
  update: StoreApi<ConfigState>['setState'];
}

export const useConfigState = createWithEqualityFn<ConfigState>(
  (set) => ({
    chartCount: 4,
    upperBound: 0,
    lowerBound: 0,
    useLevelConstants: false,
    useWeights: false,
    hideVetos: false,
    orderByAction: true,
    weights: [],
    groupSongsAt: null,
    forceDistribution: true,
    constrainPocketPicks: true,
    difficulties: new Set(),
    categories: new Set(),
    flags: new Set(),
    showEligibleCharts: false,
    playerNames: [],
    tournamentRounds: [
      'Pools',
      "Winner's Bracket",
      "Winner's Finals",
      "Loser's Bracket",
      "Loser's Finals",
      'Grand Finals',
      'Tiebreaker',
    ],
    showPlayerAndRoundLabels: false,
    defaultPlayersPerDraw: 2,
    useSongPool: false,
    songPoolString: '',
    update: set,
  }),
  Object.is,
);
