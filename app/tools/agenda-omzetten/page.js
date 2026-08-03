import ToolShell from "../ToolShell";
import Converter from "./Converter";
import { toolBySlug } from "../../../lib/tools/registry";

const tool = toolBySlug("agenda-omzetten");

export const metadata = {
  title: `${tool.name} — ${tool.tagline}`,
  description: tool.description,
  keywords: tool.keywords.join(", "),
  icons: { icon: "/afspraken-icon.svg" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f2f7" };

export default function AgendaOmzettenPage() {
  return (
    <ToolShell
      title={tool.name}
      tagline="Een agendabestand naar een tabel om in Excel te bekijken, of een tabel naar een agendabestand om te importeren in Google, Outlook of Apple Agenda."
    >
      <Converter />
    </ToolShell>
  );
}
