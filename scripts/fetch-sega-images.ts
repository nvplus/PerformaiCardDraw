/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import download from 'download';
import sleep from 'sleep-promise';

export default async function run(
  gameCode: string,
  baseUrl: string,
  songs: Record<string, any>[],
  headers?: Record<string, string>,
) {
  const coverImgDir = `src/assets/jackets/${gameCode}`;

  console.info('* Downloading cover image for songs ...');
  for (const [index, song] of songs.entries()) {
    if (song.jacket && !fs.existsSync(`${coverImgDir}/${song.jacket}`)) {
      console.info(`(${1 + index} / ${songs.length}) ${song.name}`);
      const imageUrl = `${baseUrl}/${song.jacket}`;

      try {
        await download(imageUrl, coverImgDir, { filename: song.jacket, headers, rejectUnauthorized: false });
      }
      catch (err) {
        console.log(`Could not download jacket for: ${song.name}`)
      }
      await sleep(100);
    }
  }

  console.info('Done!');
}