import { memo, useState } from 'react';
import { SongCard } from './song-card';
import styles from './drawn-set.css';
import { Drawing } from './models/Drawing';
import { SetLabels } from './tournament-mode/drawing-labels';
import { DrawingProvider, useDrawing } from './drawing-context';
import { DrawingActions } from './tournament-mode/drawing-actions';
import { SyncWithPeers } from './tournament-mode/sync-with-peers';
import { useConfigState } from './config-state';
import { AnimatePresence, motion } from 'framer-motion';

const HUE_STEP = (255 / 8) * 3;
let hue = Math.floor(Math.random() * 255);

function getRandomGradiant() {
  hue += HUE_STEP;
  return `linear-gradient(hsl(${hue}, var(--drawing-grad-saturation), var(--drawing-grad-lightness)), transparent, transparent)`;
}

interface Props {
  drawing: Drawing;
}

function ChartList() {
  const charts = useDrawing((d) => d.charts);
  return (
    <AnimatePresence>
      <motion.div
        className={styles.chartList}
        variants={{
          hidden: {
            opacity: 0,
            scale: 0.8,
            transition: {
              type: 'spring',
              bounce: 0.4,
              staggerChildren: 0.02,
              staggerDirection: -1,
            },
          },
          show: {
            opacity: 1,
            scale: 1,
            transition: {
              type: 'spring',
              bounce: 0.4,
              staggerChildren: 0.3,
            },
          },
        }}
        initial="hidden"
        animate="show"
      >
        {charts.map((c) => (
          <ChartFromContext key={c.id} chartId={c.id} />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

function ChartFromContext({ chartId }: { chartId: string }) {
  const chart = useDrawing((d) => d.charts.find((c) => c.id === chartId));
  const veto = useDrawing((d) => d.bans.find((b) => b.chartId === chartId));
  const protect = useDrawing((d) =>
    d.protects.find((b) => b.chartId === chartId),
  );
  const pocketPick = useDrawing((d) =>
    d.pocketPicks.find((b) => b.chartId === chartId),
  );
  const winner = useDrawing((d) =>
    d.winners.find((b) => b.chartId === chartId),
  );
  if (!chart) {
    return null;
  }
  return (
    <motion.div
      layout
      style={{ display: 'flex', flex: '1 0 0' }}
      variants={{
        hidden: {
          opacity: 0,
          scale: 0.8,
          transition: {
            type: 'spring',
            bounce: 0.4,
          },
        },
        show: {
          opacity: 1,
          scale: 1,
          transition: {
            type: 'spring',
            bounce: 0.4,
          },
        },
      }}
    >
      <SongCard
        vetoedBy={veto?.player}
        protectedBy={protect?.player}
        replacedBy={pocketPick?.player}
        replacedWith={pocketPick?.pick}
        winner={winner?.player}
        chart={chart}
        actionsEnabled
      />
    </motion.div>
  );
}

function TournamentModeSpacer() {
  const showLabels = useConfigState((s) => s.showPlayerAndRoundLabels);
  if (showLabels) {
    return null;
  }
  return <div style={{ height: '15px' }} />;
}

const DrawnSet = memo<Props>(function DrawnSet({ drawing }) {
  const [backgroundImage] = useState(getRandomGradiant());

  return (
    <DrawingProvider initialDrawing={drawing}>
      <SyncWithPeers />
      <div
        key={drawing.id}
        style={{ backgroundImage }}
        className={styles.drawing}
      >
        <TournamentModeSpacer />
        <div id={`drawing-${drawing.id}`}>
          <SetLabels />
          <ChartList />
        </div>
        <DrawingActions />
      </div>
    </DrawingProvider>
  );
});

export default DrawnSet;
