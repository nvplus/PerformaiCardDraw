import {
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Classes,
  Collapse,
  Divider,
  Drawer,
  DrawerSize,
  FormGroup,
  HTMLSelect,
  Icon,
  Intent,
  NavbarDivider,
  NumericInput,
  Position,
  Switch,
  Tab,
  Tabs,
  TextArea,
  Tooltip,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { shallow } from 'zustand/shallow';
import { useConfigState } from '../config-state';
import { useDrawState } from '../draw-state';
import { EligibleChartsListFilter } from '../eligible-charts/filter';
import { useIntl } from '../hooks/useIntl';
import { useIsNarrow } from '../hooks/useMediaQuery';
import { GameData } from '../models/SongData';
import { RemotePeerControls } from '../tournament-mode/remote-peer-menu';
import { useRemotePeers } from '../tournament-mode/remote-peers';
import { WeightsControls } from './controls-weights';
import styles from './controls.css';
import { PlayerNamesControls } from './player-names';
import { loadConfig, saveConfig } from '../config-persistence';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '../utils/error-fallback';
import { formatLevel } from '../game-data-utils';

function getAvailableDifficulties(gameData: GameData) {
  const s = new Set<string>();
  for (const f of gameData.songs) {
    for (const c of f.charts) {
      s.add(c.diffClass);
    }
  }
  return gameData.meta.difficulties.filter((d) => s.has(d.key));
}

function getAvailableCategories(gameData: GameData) {
  const s = new Set<string>();
  for (const f of gameData.songs) {
    s.add(f.category);
  }
  return gameData.meta.categories.filter((category) => s.has(category));
}

function getAvailableLevels(gameData: GameData) {
  const s = new Set<number>();
  for (const f of gameData.songs) {
    for (const c of f.charts) {
      s.add(c.lvl);
    }
  }
  return [...s].sort((a, b) => a - b);
}

function ShowChartsToggle({ inDrawer }: { inDrawer: boolean }) {
  const { t } = useIntl();
  const { showEligible, update } = useConfigState(
    (state) => ({
      showEligible: state.showEligibleCharts,
      update: state.update,
    }),
    shallow,
  );
  return (
    <Switch
      alignIndicator={inDrawer ? 'left' : 'right'}
      large
      className={styles.showAllToggle}
      label={t('showSongPool')}
      checked={showEligible}
      onChange={(e) => {
        update({
          showEligibleCharts: !!e.currentTarget.checked,
        });
      }}
    />
  );
}

export function HeaderControls() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastDrawFailed, setLastDrawFailed] = useState(false);
  const [drawSongs, hasGameData] = useDrawState((s) => [
    s.drawSongs,
    !!s.gameData,
  ]);
  const isNarrow = useIsNarrow();

  function handleDraw() {
    useConfigState.setState({ showEligibleCharts: false });
    drawSongs(useConfigState.getState());
  }

  function openSettings() {
    setSettingsOpen((open) => !open);
    setLastDrawFailed(false);
  }

  return (
    <>
      <Drawer
        isOpen={settingsOpen}
        position={Position.RIGHT}
        size={isNarrow ? DrawerSize.LARGE : '500px'}
        onClose={() => setSettingsOpen(false)}
        title={
          <>
            <FormattedMessage id="controls.drawerTitle" />
            <ButtonGroup style={{ marginLeft: '10px' }}>
              <Button icon="floppy-disk" onClick={saveConfig}>
                Save
              </Button>
              <Button icon="import" onClick={loadConfig}>
                Load
              </Button>
            </ButtonGroup>
          </>
        }
      >
        <ErrorBoundary fallback={<ErrorFallback />}>
          <ControlsDrawer />
        </ErrorBoundary>
      </Drawer>
      {!isNarrow && (
        <>
          <ShowChartsToggle inDrawer={false} />
          <NavbarDivider />
        </>
      )}
      <ButtonGroup>
        <Tooltip disabled={hasGameData} content="Loading game data">
          <Button
            onClick={handleDraw}
            icon={IconNames.NEW_LAYERS}
            intent={Intent.PRIMARY}
            disabled={!hasGameData}
          >
            <FormattedMessage id="draw" />
          </Button>
        </Tooltip>
        <Tooltip
          isOpen={lastDrawFailed}
          content={<FormattedMessage id="controls.invalid" />}
          intent={Intent.DANGER}
          usePortal={false}
          position={Position.BOTTOM_RIGHT}
        >
          <Button icon={IconNames.COG} onClick={openSettings} />
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

function ControlsDrawer() {
  const { t } = useIntl();
  const isConnected = useRemotePeers((r) => !!r.thisPeer);
  const hasPeers = useRemotePeers((r) => !!r.remotePeers.size);
  return (
    <div className={styles.drawer}>
      <Tabs id="settings" large>
        <Tab id="general" icon="settings" panel={<GeneralSettings />}>
          {t('controls.tabs.general')}
        </Tab>
        <Tab
          id="network"
          icon={
            <Icon
              className={Classes.TAB_ICON}
              icon={hasPeers ? IconNames.ThirdParty : IconNames.GlobeNetwork}
              intent={isConnected ? 'success' : 'none'}
            />
          }
          panel={<RemotePeerControls />}
        >
          {t('controls.tabs.networking')}
        </Tab>
        <Tab id="players" icon="people" panel={<PlayerNamesControls />}>
          {t('controls.tabs.players')}
        </Tab>
      </Tabs>
    </div>
  );
}

function FlagSettings() {
  const { t } = useIntl();
  const [dataSetName, gameData] = useDrawState(
    (s) => [s.dataSetName, s.gameData],
    shallow,
  );
  const [updateState, selectedFlags] = useConfigState(
    (s) => [s.update, s.flags],
    shallow,
  );

  return (
    <FormGroup label={t('controls.include')}>
      {gameData?.meta.flags.map((key) => (
        <Checkbox
          key={`${dataSetName}:${key}`}
          label={t('meta.' + key)}
          value={key}
          checked={selectedFlags.has(key)}
          onChange={() =>
            updateState((s) => {
              const newFlags = new Set(s.flags);
              if (newFlags.has(key)) {
                newFlags.delete(key);
              } else {
                newFlags.add(key);
              }
              return { flags: newFlags };
            })
          }
        />
      ))}
    </FormGroup>
  );
}

function GeneralSettings() {
  const { t } = useIntl();
  const gameData = useDrawState((s) => s.gameData);
  const hasFlags = useDrawState((s) => !!s.gameData?.meta.flags.length);
  const configState = useConfigState();
  const {
    useLevelConstants,
    useWeights,
    constrainPocketPicks,
    orderByAction,
    hideVetos,
    lowerBound,
    upperBound,
    update: updateState,
    difficulties: selectedDifficulties,
    chartCount,
  } = configState;
  const [availableDifficulties] = useMemo(() => {
    if (!gameData) {
      return [[], []];
    }
    return [
      getAvailableDifficulties(gameData),
      getAvailableCategories(gameData),
    ];
  }, [gameData]);
  const isNarrow = useIsNarrow();
  const [expandFilters, setExpandFilters] = useState(false);

  if (!gameData) {
    return null;
  }
  const { constantFilteringEnabled } = gameData.meta;

  const handleLowerBoundChange = (newLow: number) => {
    if (newLow !== lowerBound && !isNaN(newLow)) {
      if (newLow > upperBound) {
        newLow = upperBound;
      }
      updateState({
        lowerBound: newLow,
      });
    }
  };
  const handleUpperBoundChange = (newHigh: number) => {
    if (newHigh !== upperBound && !isNaN(newHigh)) {
      if (newHigh < lowerBound) {
        updateState({
          upperBound: newHigh,
          lowerBound: newHigh,
        });
        return;
      }
      updateState({
        upperBound: newHigh,
      });
    }
  };

  return (
    <>
      {isNarrow && (
        <>
          <FormGroup>
            <ShowChartsToggle inDrawer />
          </FormGroup>
          <Collapse
            isOpen={!!configState.flags.size && configState.showEligibleCharts}
          >
            <FormGroup label="Show only">
              <EligibleChartsListFilter />
            </FormGroup>
          </Collapse>
          <Divider />
        </>
      )}
      <div className={isNarrow ? undefined : styles.inlineControls}>
        <FormGroup
          label={t('controls.chartCount')}
          contentClassName={styles.narrowInput}
        >
          <NumericInput
            large
            fill
            type="number"
            inputMode="numeric"
            value={chartCount}
            min={1}
            clampValueOnBlur
            onValueChange={(chartCount) => {
              if (!isNaN(chartCount)) {
                updateState(() => {
                  return { chartCount };
                });
              }
            }}
          />
        </FormGroup>
        <div className={styles.inlineControls}>
          {!useLevelConstants ? (
            <>
              <FormGroup label="Lvl Min" contentClassName={styles.narrowInput}>
                <HTMLSelect
                  id="lvlMin"
                  large
                  fill
                  value={lowerBound}
                  onChange={(e) => {
                    handleLowerBoundChange(Number(e.target.value));
                  }}
                >
                  {getAvailableLevels(gameData).map((level) => (
                    <option key={level} value={level}>
                      {formatLevel(level)}
                    </option>
                  ))}
                </HTMLSelect>
              </FormGroup>
              <FormGroup label="Lvl Max" contentClassName={styles.narrowInput}>
                <HTMLSelect
                  id="lvlMax"
                  large
                  fill
                  value={upperBound}
                  onChange={(e) => {
                    handleUpperBoundChange(Number(e.target.value));
                  }}
                >
                  {getAvailableLevels(gameData).map((level) => (
                    <option key={level} value={level}>
                      {formatLevel(level)}
                    </option>
                  ))}
                </HTMLSelect>
              </FormGroup>
            </>
          ) : (
            <>
              <div className={styles.inlineControls}>
                <FormGroup
                  label="Lvl Constant Min"
                  contentClassName={styles.narrowInput}
                >
                  <NumericInput
                    id="levelConstantMin"
                    allowNumericCharactersOnly={false}
                    stepSize={0.1}
                    large
                    fill
                    value={lowerBound.toFixed(1)}
                    onValueChange={(e) => {
                      handleLowerBoundChange(e);
                    }}
                  />
                </FormGroup>
                <FormGroup
                  label="Lvl Constant Max"
                  contentClassName={styles.narrowInput}
                >
                  <NumericInput
                    id="levelConstantMax"
                    allowNumericCharactersOnly={false}
                    stepSize={0.1}
                    large
                    fill
                    value={upperBound.toFixed(1)}
                    onValueChange={(e) => {
                      handleUpperBoundChange(e);
                    }}
                  />
                </FormGroup>
              </div>
            </>
          )}
        </div>
      </div>
      <Button
        alignText="left"
        rightIcon={expandFilters ? 'caret-down' : 'caret-right'}
        onClick={() => setExpandFilters((p) => !p)}
      >
        {t('controls.hideShowFilters')}
      </Button>
      <Collapse isOpen={expandFilters}>
        <Card style={{ paddingBottom: '1px' }}>
          <FormGroup label={t('controls.difficulties')}>
            {availableDifficulties.map((dif) => (
              <Checkbox
                key={`${dif.key}`}
                name="difficulties"
                value={dif.key}
                checked={selectedDifficulties.has(dif.key)}
                onChange={(e) => {
                  const { checked, value } = e.currentTarget;
                  updateState((s) => {
                    const difficulties = new Set(s.difficulties);
                    if (checked) {
                      difficulties.add(value);
                    } else {
                      difficulties.delete(value);
                    }
                    return { difficulties };
                  });
                }}
                label={t('meta.' + dif.key)}
              />
            ))}
          </FormGroup>
          {hasFlags && <FlagSettings />}
        </Card>
      </Collapse>
      <FormGroup>
        <Checkbox
          id="orderByAction"
          checked={orderByAction}
          onChange={(e) => {
            const reorder = !!e.currentTarget.checked;
            updateState({ orderByAction: reorder });
          }}
          label={t('controls.orderByAction')}
        />
        <Checkbox
          id="constrainPocketPicks"
          checked={constrainPocketPicks}
          onChange={(e) => {
            const constrainPocketPicks = !!e.currentTarget.checked;
            updateState({ constrainPocketPicks });
          }}
          label={t('controls.constrainPocketPicks')}
        />
        <Checkbox
          id="showVeto"
          checked={hideVetos}
          onChange={(e) => {
            const next = !!e.currentTarget.checked;
            updateState({ hideVetos: next });
          }}
          label={t('controls.hideVetos')}
        />
        <Checkbox
          id="weighted"
          checked={useWeights}
          onChange={(e) => {
            const useWeights = !!e.currentTarget.checked;
            updateState({ useWeights });
          }}
          label={t('controls.useWeightedDistributions')}
        />
        {constantFilteringEnabled && (
          <Checkbox
            id="useLevelConstants"
            checked={useLevelConstants}
            onChange={(e) => {
              const useLevelConstants = !!e.currentTarget.checked;
              const newLow = Math.round(lowerBound * 2) / 2;
              const newHigh = Math.round(upperBound * 2) / 2;
              updateState({
                useLevelConstants,
                lowerBound: newLow,
                upperBound: newHigh,
              });
            }}
            label="Use Level Constants"
          />
        )}
        <Checkbox
          id="useSongPool"
          checked={configState.useSongPool}
          onChange={(e) => {
            const useSongPool = !!e.currentTarget.checked;
            updateState({ useSongPool });
          }}
          label="Use Song Pool"
        />
        <Collapse isOpen={useWeights}>
          <WeightsControls
            usesTiers={false}
            high={upperBound}
            low={lowerBound}
          />
        </Collapse>
        <Collapse isOpen={configState.useSongPool}>
          <FormGroup
            label="Song Pool"
            helperText="Enter songs in format: Song Name|std or dx|Difficulty Name (one per line)"
          >
            <TextArea
              id="songPoolString"
              value={configState.songPoolString}
              onChange={(e) => {
                updateState({ songPoolString: e.target.value });
              }}
              placeholder="Example:&#10;Song Title 1|std|Expert&#10;Song Title 2|dx|Master&#10;Song Title 3|std|Advanced"
              rows={8}
              fill
            />
          </FormGroup>
        </Collapse>
      </FormGroup>
    </>
  );
}
