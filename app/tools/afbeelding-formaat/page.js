import ToolShell from "../ToolShell";
import Resizer from "./Resizer";
import { toolMetadata, toolViewport } from "../toolPage";

export const metadata = toolMetadata("afbeelding-formaat");
export const viewport = toolViewport;

export default function Page() {
  return (
    <ToolShell
      title="Formaat voor social media"
      tagline="Kies waar het heen gaat en de maat klopt: Instagram, LinkedIn, YouTube, een Open Graph-kaart. Geen maten opzoeken, geen uitgerekte foto's."
    >
      <Resizer />
    </ToolShell>
  );
}
