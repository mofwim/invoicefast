import ToolShell from "../ToolShell";
import Watermark from "./Watermark";
import { toolMetadata, toolViewport } from "../toolPage";

export const metadata = toolMetadata("watermerk");
export const viewport = toolViewport;

export default function Page() {
  return (
    <ToolShell
      title="Watermerk toevoegen"
      tagline="Zet je naam over een foto voordat je hem deelt. De grootte schaalt mee met de afbeelding, dus het staat er net zo op een telefoonkiekje als op een camerabestand."
    >
      <Watermark />
    </ToolShell>
  );
}
