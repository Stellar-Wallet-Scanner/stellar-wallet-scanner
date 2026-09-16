import { Composition } from "remotion";
import { PitchVideo, TOTAL_SECONDS } from "./PitchVideo";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const RemotionRoot = () => {
  return (
    <Composition
      id="PitchVideo"
      component={PitchVideo}
      durationInFrames={Math.round(TOTAL_SECONDS * FPS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{}}
    />
  );
};
