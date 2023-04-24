import path from 'path';
import { writeJsonData } from './utils';

const fetch = require('node-fetch');

const DATA_URL = 'https://web.archive.org/web/20220111064536/https://ongeki.sega.jp/assets/json/music/music.json';
const OUTFILE = "src/songs/ongeki_bright.json";

function preprocessRawSongs(rawSongs: Record<string, any>[]) {
  for (const rawSong of rawSongs) {
    if (rawSong.lunatic) {
      rawSong.category = 'LUNATIC';
    } else if (rawSong.bonus) {
      rawSong.category = 'ボーナストラック';
    }
  }
}

function extractSong(rawSong: Record<string, any>) {
  return {
    id: rawSong.id,
    name: rawSong.title,
    artist: rawSong.artist,
    folder: null,
    category: rawSong.category,
    jacket: rawSong.image_url,
    charts: extractSheets(rawSong)
  };
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'basic', lvl: rawSong.lev_bas },
    { type: 'std', difficulty: 'advanced', lvl: rawSong.lev_adv },
    { type: 'std', difficulty: 'expert', lvl: rawSong.lev_exc },
    { type: 'std', difficulty: 'master', lvl: rawSong.lev_mas },
    { type: 'lun', difficulty: 'lunatic', lvl: rawSong.lev_lnt },
  ].filter((e) => !!e.lvl).map((rawSheet) => ({
    ...rawSheet,
    lvl: convertLevel(rawSheet.lvl)
  }));
}

function convertLevel(lvl: string) {
  if (lvl.endsWith('+')) {
    return Number(`${lvl.substring(0, lvl.length-1)}.5`);
  }
  return Number(lvl);
}

export default async function run() {
  console.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await fetch(DATA_URL);

  const rawSongs: Record<string, any>[] = await response.json();
  rawSongs.sort((a, b) => Number(a.id) - Number(b.id));
  preprocessRawSongs(rawSongs);
  console.info(`OK, ${rawSongs.length} songs fetched.`);

  const songs = rawSongs.map((rawSong) => extractSong(rawSong));
  const filePath = path.join(__dirname, '../', OUTFILE);
  const existingData = require(filePath);

  const data = {
    ...existingData,
    songs
  }

  await writeJsonData(data, filePath);

  console.info('Done!');
}

if (require.main === module) run();