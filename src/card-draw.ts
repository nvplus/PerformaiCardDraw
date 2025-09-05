import { nanoid } from 'nanoid';
import { GameData, Song, Chart } from './models/SongData';
import { times } from './utils';
import { DrawnChart, EligibleChart, Drawing } from './models/Drawing';
import { ConfigState } from './config-state';
import { getDifficultyColor } from './hooks/useDifficultyColor';
import { getDiffAbbr } from './game-data-utils';
import { getAvailableLevels } from './game-data-utils';

interface SongPoolEntry {
  songName: string;
  type: 'std' | 'dx';
  difficulty: string;
}

function parseSongPool(songPoolString: string): SongPoolEntry[] {
  if (!songPoolString.trim()) {
    return [];
  }

  const lines = songPoolString
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);
  const entries: SongPoolEntry[] = [];

  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length === 3) {
      const [songName, type, difficulty] = parts;
      // Only trim type and difficulty, preserve song name exactly as is
      const trimmedType = type.trim();
      const trimmedDifficulty = difficulty.trim();
      if (
        (trimmedType === 'std' || trimmedType === 'dx') &&
        trimmedDifficulty
      ) {
        entries.push({
          songName: songName, // Don't trim the song name to preserve whitespace
          type: trimmedType as 'std' | 'dx',
          difficulty: trimmedDifficulty,
        });
      }
    }
  }

  return entries;
}

function findMatchingSong(
  gameData: GameData,
  entry: SongPoolEntry,
): { song: Song; chart: Chart } | null {
  // Handle empty/whitespace-only song names by looking for exact match including whitespace
  // This handles cases like the song "　" (Japanese space character) in maimai
  if (!entry.songName.trim()) {
    // Look for songs with empty or whitespace-only names
    for (const song of gameData.songs) {
      if (!song.name.trim() || song.name === entry.songName) {
        for (const chart of song.charts) {
          const difficulty = gameData.meta.difficulties.find(
            (d) => d.key.toLowerCase() === entry.difficulty.toLowerCase(),
          );
          if (difficulty && chart.diffClass === difficulty.key) {
            return { song, chart };
          }
        }
      }
    }
  }

  // Try to find exact match first
  for (const song of gameData.songs) {
    if (song.name.toLowerCase() === entry.songName.toLowerCase()) {
      for (const chart of song.charts) {
        // Try to match difficulty by key
        const difficulty = gameData.meta.difficulties.find(
          (d) => d.key.toLowerCase() === entry.difficulty.toLowerCase(),
        );
        if (difficulty && chart.diffClass === difficulty.key) {
          return { song, chart };
        }
      }
    }
  }

  // Try fuzzy matching on song name if exact match fails
  for (const song of gameData.songs) {
    if (
      song.name.toLowerCase().includes(entry.songName.toLowerCase()) ||
      entry.songName.toLowerCase().includes(song.name.toLowerCase())
    ) {
      for (const chart of song.charts) {
        const difficulty = gameData.meta.difficulties.find(
          (d) => d.key.toLowerCase() === entry.difficulty.toLowerCase(),
        );
        if (difficulty && chart.diffClass === difficulty.key) {
          return { song, chart };
        }
      }
    }
  }

  return null;
}

export function* eligibleChartsFromSongPool(
  config: ConfigState,
  gameData: GameData,
): Generator<EligibleChart> {
  const songPoolEntries = parseSongPool(config.songPoolString);
  const songPoolSet = new Set<string>();

  // Create a set of valid song pool entries for quick lookup
  for (const entry of songPoolEntries) {
    const match = findMatchingSong(gameData, entry);
    if (match) {
      const { song, chart } = match;
      songPoolSet.add(`${song.name}:${chart.diffClass}`);
    }
  }

  // Use the regular eligibleCharts generator but filter by song pool
  for (const chart of eligibleCharts(config, gameData)) {
    const chartKey = `${chart.name}:${chart.song.charts.find(
      (c) =>
        c.diffClass === chart.diffAbbr ||
        getDiffAbbr(gameData, c.diffClass) === chart.diffAbbr,
    )?.diffClass}`;

    if (songPoolSet.has(chartKey)) {
      yield chart;
    }
  }
}

export function getDrawnChart(
  gameData: GameData,
  currentSong: Song,
  chart: Chart,
): EligibleChart {
  return {
    name: currentSong.name,
    jacket: currentSong.jacket,
    nameTranslation: currentSong.name_translation,
    artist: currentSong.artist,
    artistTranslation: currentSong.artist_translation,
    bpm: currentSong.bpm ?? '0',
    level: chart.lvl,
    levelConstant: chart.levelConstant ?? 0,
    flags: (chart.flags || []).concat(currentSong.flags || []),
    song: currentSong,
    // Fill in variant data per game
    diffAbbr: getDiffAbbr(gameData, chart.diffClass),
    diffColor: getDifficultyColor(gameData, chart.diffClass),
  };
}

/** returns true if song matches configured flags */
export function songIsValid(
  config: ConfigState,
  song: Song,
  forPocketPick = false,
): boolean {
  if (forPocketPick && !config.constrainPocketPicks) {
    return true;
  }
  return (
    (!song.flags || song.flags.every((f) => config.flags.has(f))) &&
    config.categories.has(song.category)
  );
}

/** returns true if chart matches configured difficulty/style/lvl/flags */
export function chartIsValid(
  config: ConfigState,
  chart: Chart,
  forPocketPick = false,
): boolean {
  if (forPocketPick && !config.constrainPocketPicks) {
    return true;
  }
  const levelMetric = config.useLevelConstants
    ? chart.levelConstant ?? 0
    : chart.lvl;
  return (
    config.difficulties.has(chart.diffClass) &&
    levelMetric >= config.lowerBound &&
    levelMetric <= config.upperBound &&
    (!chart.flags || chart.flags.every((f) => config.flags.has(f)))
  );
}

export function* eligibleCharts(config: ConfigState, gameData: GameData) {
  for (const currentSong of gameData.songs) {
    if (!songIsValid(config, currentSong)) {
      continue;
    }
    const charts = currentSong.charts;

    for (const chart of charts) {
      if (!chartIsValid(config, chart)) {
        continue;
      }

      // add chart to deck
      yield getDrawnChart(gameData, currentSong, chart);
    }
  }
}

/**
 * Produces a drawn set of charts given the song data and the user
 * input of the html form elements.
 * @param songs The song data (see `src/songs/`)
 * @param configData the data gathered by all form elements on the page, indexed by `name` attribute
 */
export function draw(gameData: GameData, configData: ConfigState): Drawing {
  const {
    chartCount: numChartsToRandom,
    useWeights,
    forceDistribution,
    weights,
    groupSongsAt,
    defaultPlayersPerDraw,
    useSongPool,
  } = configData;

  // If using song pool, create a simple array-based draw
  if (useSongPool) {
    const poolCharts = Array.from(
      eligibleChartsFromSongPool(configData, gameData),
    );
    const drawnCharts: DrawnChart[] = [];

    // Simple random selection from the pool
    const availableCharts = [...poolCharts];
    while (
      drawnCharts.length < numChartsToRandom &&
      availableCharts.length > 0
    ) {
      const randomIndex = Math.floor(Math.random() * availableCharts.length);
      const randomChart = availableCharts[randomIndex];

      drawnCharts.push({
        ...randomChart,
        id: `drawn_chart-${nanoid(5)}`,
      });

      // Remove drawn chart to prevent duplicates
      availableCharts.splice(randomIndex, 1);
    }

    return {
      id: `draw-${nanoid(10)}`,
      charts: shuffle(drawnCharts),
      players: times(defaultPlayersPerDraw, () => ''),
      bans: [],
      protects: [],
      pocketPicks: [],
      winners: [],
    };
  }

  // Original logic for non-song-pool draws
  const validCharts = new Map<number, Array<EligibleChart>>();
  const availableLevels = getAvailableLevels(gameData);
  /** all charts we will consider to be valid for this draw */
  availableLevels.forEach((level) => {
    validCharts.set(level, []);
  });

  for (const chart of eligibleCharts(configData, gameData)) {
    let levelMetric = chart.level;
    // merge in higher difficulty charts into a single group, if configured to do so
    if (useWeights && groupSongsAt && groupSongsAt < levelMetric) {
      levelMetric = groupSongsAt;
    }
    validCharts.get(levelMetric)?.push(chart);
  }

  /**
   * the "deck" of difficulty levels to pick from
   */
  let distribution: Array<number> = [];
  /**
   * Total amount of weight used, so we can determine expected outcome below
   */
  let totalWeights = 0;
  /**
   * Maximum number of charts we can expect to draw of each level. Only used with `forceDistribution`
   */
  const maxDrawPerLevel: Record<string, number> = {};
  /**
   * List of difficulty levels that must be picked first, to meet minimums. Only used with `forceDistribution`
   */
  const requiredDrawDifficulties: number[] = [];

  // build an array of possible levels to pick from
  for (const level of availableLevels) {
    let weightAmount = 0;
    if (useWeights) {
      weightAmount = weights[level];
      totalWeights += weightAmount;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      weightAmount = validCharts.get(level)!.length;
    }
    times(weightAmount, () => distribution.push(level));
  }

  // If custom weights are used, expectedDrawsPerLevel[level] will be the maximum number
  // of cards of that level allowed in the card draw.
  // e.g. For a 5-card draw, we increase the cap by 1 at every 100%/5 = 20% threshold,
  // so a level with a weight of 15% can only show up on at most 1 card, a level with
  // a weight of 30% can only show up on at most 2 cards, etc.
  if (useWeights && forceDistribution) {
    for (const level of availableLevels) {
      const levelAsStr = level.toString();
      const normalizedWeight = weights[level] / totalWeights;
      maxDrawPerLevel[levelAsStr] = Math.ceil(
        normalizedWeight * numChartsToRandom,
      );
      // setup minimum draws
      for (let i = 1; i < maxDrawPerLevel[levelAsStr]; i++) {
        requiredDrawDifficulties.push(level);
      }
    }
  }

  const drawnCharts: DrawnChart[] = [];
  /**
   * Record of how many songs of each difficulty have been drawn so far
   */
  const difficultyCounts: Record<string, number> = {};

  while (drawnCharts.length < numChartsToRandom) {
    if (distribution.length === 0) {
      // no more songs available to pick in the requested range
      // will be returning fewer than requested number of charts
      break;
    }

    // first pick a difficulty (with priority to minimum draws)
    let chosenDifficulty = requiredDrawDifficulties.shift();
    if (!chosenDifficulty) {
      chosenDifficulty =
        distribution[Math.floor(Math.random() * distribution.length)];
    }
    if (useWeights && groupSongsAt && groupSongsAt < chosenDifficulty) {
      chosenDifficulty = groupSongsAt;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const selectableCharts = validCharts.get(chosenDifficulty)!;
    const randomIndex = Math.floor(Math.random() * selectableCharts.length);
    const randomChart = selectableCharts[randomIndex];

    if (randomChart) {
      // Save it in our list of drawn charts
      drawnCharts.push({
        ...randomChart,
        // Give this random chart a unique id within this drawing
        id: `drawn_chart-${nanoid(5)}`,
      });
      // remove drawn chart from deck so it cannot be re-drawn
      selectableCharts.splice(randomIndex, 1);
      if (!difficultyCounts[chosenDifficulty]) {
        difficultyCounts[chosenDifficulty] = 1;
      } else {
        difficultyCounts[chosenDifficulty]++;
      }
    }

    // check if maximum number of expected occurrences of this level of chart has been reached
    const reachedExpected =
      forceDistribution &&
      difficultyCounts[chosenDifficulty.toString()] ===
        maxDrawPerLevel[chosenDifficulty.toString()];

    if (selectableCharts.length === 0 || reachedExpected) {
      // can't pick any more songs of this difficulty
      distribution = distribution.filter((n) => n !== chosenDifficulty);
    }
  }

  return {
    id: `draw-${nanoid(10)}`,
    charts: shuffle(drawnCharts),
    players: times(defaultPlayersPerDraw, () => ''),
    bans: [],
    protects: [],
    pocketPicks: [],
    winners: [],
  };
}

/**
 * is this an accurate F-Y shuffle? who knows!?!
 */
export function shuffle<Item>(arr: Array<Item>): Array<Item> {
  const ret = arr.slice();
  for (let i = 0; i < ret.length; i++) {
    const randomUpcomingIndex =
      i + Math.floor(Math.random() * (ret.length - i));
    const currentItem = ret[i];
    ret[i] = ret[randomUpcomingIndex];
    ret[randomUpcomingIndex] = currentItem;
  }
  return ret;
}
