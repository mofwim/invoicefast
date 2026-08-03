import ToolShell from "../ToolShell";
import Converter from "./Converter";
import { toolMetadata, toolViewport } from "../toolPage";

export const metadata = toolMetadata("afbeelding-omzetten");
export const viewport = toolViewport;

export default function Page() {
  return (
    <ToolShell
      title="Afbeelding omzetten"
      tagline="WebP voor het web, JPG voor waar alles het doet, PNG als je de transparantie nodig hebt. Meerdere bestanden tegelijk mag."
    >
      <Converter />
    </ToolShell>
  );
}
