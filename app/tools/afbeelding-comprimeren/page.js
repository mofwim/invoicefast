import ToolShell from "../ToolShell";
import Compressor from "./Compressor";
import { toolMetadata, toolViewport } from "../toolPage";

export const metadata = toolMetadata("afbeelding-comprimeren");
export const viewport = toolViewport;

export default function Page() {
  return (
    <ToolShell
      title="Afbeelding comprimeren"
      tagline="Maak een foto lichter zodat hij door een uploadlimiet past of een pagina sneller laadt. Kies een maximum en de kwaliteit zakt precies zo ver als nodig is — niet verder."
    >
      <Compressor />
    </ToolShell>
  );
}
