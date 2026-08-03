import ToolShell from "../ToolShell";
import Unpacker from "./Unpacker";
import { toolBySlug } from "../../../lib/tools/registry";

const tool = toolBySlug("email-uitpakken");

export const metadata = {
  title: `${tool.name} — ${tool.tagline}`,
  description: tool.description,
  keywords: tool.keywords.join(", "),
  icons: { icon: "/afspraken-icon.svg" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f2f7" };

export default function EmailUitpakkenPage() {
  return (
    <ToolShell
      title={tool.name}
      tagline="Sleep een opgeslagen e-mail hierheen en zie wat erin zit: de tekst, een eventuele uitnodiging, en elke bijlage om los op te slaan."
    >
      <Unpacker />
    </ToolShell>
  );
}
