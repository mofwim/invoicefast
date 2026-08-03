import ToolShell from "../ToolShell";
import Favicons from "./Favicons";
import { toolMetadata, toolViewport } from "../toolPage";

export const metadata = toolMetadata("favicon-maken");
export const viewport = toolViewport;

export default function Page() {
  return (
    <ToolShell
      title="Favicon maken"
      tagline="Eén logo erin, alle maten eruit — inclusief het .ico-bestand en de regels die je in je HTML plakt."
    >
      <Favicons />
    </ToolShell>
  );
}
