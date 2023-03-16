import { Song } from "./models/SongData";
import { Music } from "react-feather";
import { useDrawState } from "./draw-state";

interface Props {
  song: Song;
  className?: string;
  height: number;
}

export function SongJacket(props: Props) {
  const dataSetName = useDrawState((s) => s.dataSetName);
  if (props.song.jacket) {
    return (
      <img
        src={`jackets/${dataSetName}/${props.song.jacket}`}
        className={props.className}
        style={{ height: `${props.height}px` }}
      />
    );
  }
  return (
    <div className={props.className}>
      <Music size={props.height} />
    </div>
  );
}
