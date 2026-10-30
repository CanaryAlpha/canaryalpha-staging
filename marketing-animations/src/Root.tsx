import React from "react";
import { Composition, Folder } from "remotion";
import { theme } from "./theme";
import { forensics, revisit, scoring, screening } from "./content";
import { Scoring } from "./clips/Scoring";
import { Forensics } from "./clips/Forensics";
import { Screening } from "./clips/Screening";
import { Revisit } from "./clips/Revisit";

const CLIPS = [
  { id: scoring.id, component: Scoring },
  { id: forensics.id, component: Forensics },
  { id: screening.id, component: Screening },
  { id: revisit.id, component: Revisit },
];

// Each clip in two shapes: Square (1080x1080, also the source of the GIF)
// and Vertical (1080x1920).
export const Root: React.FC = () => (
  <>
    {CLIPS.map((c) => (
      <Folder key={c.id} name={c.id}>
        <Composition id={`${c.id}-Square`} component={c.component} width={1080} height={1080}
          fps={theme.timing.fps} durationInFrames={theme.timing.duration} />
        <Composition id={`${c.id}-Vertical`} component={c.component} width={1080} height={1920}
          fps={theme.timing.fps} durationInFrames={theme.timing.duration} />
      </Folder>
    ))}
  </>
);
