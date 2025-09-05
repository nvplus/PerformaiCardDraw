import * as yaml from 'js-yaml';

/**
 * Parses a YAML file content and converts it to the song pool string format
 * Expected YAML format is a simple array of strings:
 * - Chronomia|dx|master
 * - Chronomia|dx|basic
 * - ダーリンダンス|dx|remaster
 */
export function parseYamlToSongPoolString(yamlContent: string): string {
  try {
    const parsed = yaml.load(yamlContent);

    if (!Array.isArray(parsed)) {
      throw new Error('YAML must contain an array of song entries');
    }

    // Validate each entry has the correct format
    const songPoolLines = parsed.map((entry, index) => {
      if (typeof entry !== 'string') {
        throw new Error(`Entry at index ${index} must be a string`);
      }

      const parts = entry.split('|');
      if (parts.length !== 3) {
        throw new Error(
          `Entry "${entry}" must be in format "Song Title|type|difficulty"`,
        );
      }

      const [title, type, difficulty] = parts;
      if (!title.trim() || !type.trim() || !difficulty.trim()) {
        throw new Error(`Entry "${entry}" has empty fields`);
      }

      if (type !== 'std' && type !== 'dx') {
        throw new Error(
          `Entry "${entry}" has invalid type "${type}". Must be "std" or "dx"`,
        );
      }

      return entry;
    });

    return songPoolLines.join('\n');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse YAML: ${error.message}`);
    }
    throw new Error('Failed to parse YAML: Unknown error');
  }
}

/**
 * Converts song pool string format back to YAML
 */
export function songPoolStringToYaml(songPoolString: string): string {
  const lines = songPoolString.split('\n').filter((line) => line.trim());
  return yaml.dump(lines, { indent: 2 });
}
