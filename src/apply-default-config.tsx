import { GameData } from './models/SongData';
import { useEffect } from 'react';
import { useConfigState } from './config-state';

interface Props {
  defaults?: GameData['defaults'];
}

export function ApplyDefaultConfig({ defaults }: Props) {
  useEffect(() => {
    if (!defaults) {
      return;
    }

    useConfigState.setState(() => {
      const { lowerLvlBound, upperLvlBound, flags, difficulties, categories } =
        defaults;
      return {
        lowerBound: lowerLvlBound,
        upperBound: upperLvlBound,
        flags: new Set(flags),
        difficulties: new Set(difficulties),
        categories: new Set(categories),
      };
    });
  }, [defaults]);
  return null;
}
