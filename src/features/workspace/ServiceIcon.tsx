import {
  SiAndroid,
  SiAndroidHex,
  SiApachespark,
  SiApachesparkHex,
  SiDocker,
  SiDockerHex,
  SiGo,
  SiGoHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiPython,
  SiPythonHex,
} from "@icons-pack/react-simple-icons";
import type { VMTemplate } from "../../domain/types";

type ServiceIconDefinition = {
  label: string;
  color: string;
  Icon: React.ComponentType<{ className?: string; color?: string; size?: number }>;
};

const serviceIcons: Record<string, ServiceIconDefinition> = {
  android: { label: "Android", color: SiAndroidHex, Icon: SiAndroid },
  docker: { label: "Docker", color: SiDockerHex, Icon: SiDocker },
  go: { label: "Go", color: SiGoHex, Icon: SiGo },
  node: { label: "Node.js", color: SiNodedotjsHex, Icon: SiNodedotjs },
  python: { label: "Python", color: SiPythonHex, Icon: SiPython },
  spark: { label: "Apache Spark", color: SiApachesparkHex, Icon: SiApachespark },
};

function resolveService(template: VMTemplate) {
  const name = template.name.toLowerCase();
  const tools = new Set(template.preinstalledTools.map((tool) => tool.toLowerCase()));

  if (name.includes("go") || tools.has("go")) return serviceIcons.go;
  if (name.includes("node") || tools.has("node")) return serviceIcons.node;
  if (name.includes("mobile") || tools.has("android-sdk")) return serviceIcons.android;
  if (name.includes("spark") || name.includes("data") || tools.has("spark")) return serviceIcons.spark;
  if (name.includes("python") || name.includes("ml") || tools.has("python") || tools.has("jupyter")) return serviceIcons.python;
  if (tools.has("docker")) return serviceIcons.docker;

  return serviceIcons.docker;
}

export function ServiceIcon({ template }: { template: VMTemplate }) {
  const service = resolveService(template);
  const Icon = service.Icon;

  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-[#0a0a0a]"
      style={{
        borderColor: `${service.color}33`,
        backgroundColor: `${service.color}14`,
        color: service.color,
      }}
      title={service.label}
    >
      <Icon className="size-4.5" color="currentColor" size={18} aria-hidden="true" />
      <span className="sr-only">{service.label}</span>
    </div>
  );
}
