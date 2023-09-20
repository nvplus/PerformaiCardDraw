import fetch from 'node-fetch';
import { load } from 'cheerio';
import { promises as fsPromises } from 'fs';
import path from 'path';

// Honestly ChatGPT did most of the work

// Mapping of background color to difficulty
const colorToDifficulty = {
  '#d1a3ff': 'inferno',
  '#ffa3d3': 'expert',
};

async function modifyJsonFile(constants: any) {
  const filePath = path.join(
    __dirname,
    '../..',
    'src/songs/wacca_reverse.json',
  );

  try {
    // Read the JSON file asynchronously
    const data = await fsPromises.readFile(filePath, 'utf8');
    const json = JSON.parse(data);

    // Modify the JSON data as needed
    json.songs.forEach((song: { name: string; charts: any[] }) => {
      const songConstants = constants[song.name];
      if (songConstants) {
        song.charts.forEach((chart) => {
          const constant = songConstants[chart.diffClass];
          if (constant) {
            chart.levelConstant = parseFloat(constant);
          }
        });
      }
    });

    // Convert the modified JSON back to a string
    const updatedJson = JSON.stringify(json, null, 2);

    // Write the updated JSON back to the file asynchronously
    await fsPromises.writeFile(filePath, updatedJson, 'utf8');
    console.log('JSON file updated successfully.');
  } catch (error) {
    console.error('Error:', error);
  }
}

async function scrapeWebsite() {
  const url =
    'https://www.wikihouse.com/wacca/index.php?%C9%E8%CC%CC%C4%EA%BF%F4%C9%BD';

  try {
    const response = await fetch(url);
    const decoder = new TextDecoder('euc-jp');
    const html = decoder.decode(await response.buffer());
    const $ = load(html, {
      decodeEntities: false,
      xmlMode: false,
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
    });

    // Find all tables where the header contains "定数"
    const tables = $('table').filter((index, element) => {
      const headerText = $(element).find('thead tr:first-child').text();
      return headerText.includes('定数') && !$(element).parents('table').length;
    });

    const songs: Record<any, any> = {};

    tables.each((tableIndex, table) => {
      let levelConstant = '';
      const rows = $(table).find('tbody tr');

      rows.each((rowIndex, row) => {
        const columns = $(row).find('td');

        let songName,
          difficulty: string | null = null;

        if (columns.length === 4) {
          const secondColumnStyle = columns.eq(1).attr('style');
          if (secondColumnStyle) {
            const backgroundColorMatch = /background-color:\s*([^;]+)/.exec(
              secondColumnStyle,
            );
            if (backgroundColorMatch) {
              const backgroundColor = backgroundColorMatch[1].trim();
              difficulty =
                colorToDifficulty[
                  backgroundColor as keyof typeof colorToDifficulty
                ] || null;
              const firstColumn = columns.eq(0).text();
              const thirdColumn = columns.eq(2).find('a').text().trim();
              if (firstColumn) {
                levelConstant = firstColumn;
              }

              songName = thirdColumn;
            }
          }
        } else if (columns.length === 3) {
          const firstColumnStyle = columns.eq(0).attr('style');
          if (firstColumnStyle) {
            const backgroundColorMatch = /background-color:\s*([^;]+)/.exec(
              firstColumnStyle,
            );
            if (backgroundColorMatch) {
              const backgroundColor = backgroundColorMatch[1].trim();
              difficulty =
                colorToDifficulty[
                  backgroundColor as keyof typeof colorToDifficulty
                ] || null;
              songName = columns.eq(1).find('a').text().trim();
            }
          }
        }

        if (Number.isNaN(levelConstant)) {
          return;
        }

        if (songName && difficulty && levelConstant) {
          const constantMap = songs[songName];
          songs[songName] = { ...constantMap, [difficulty]: levelConstant };
        }
      });
    });

    modifyJsonFile(songs);
  } catch (error) {
    console.error('Error:', error);
  }
}

scrapeWebsite();
