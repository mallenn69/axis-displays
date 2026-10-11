export const pipeline = ["new", "contacted", "qualified", "closed"] as const;
export type Pipeline = (typeof pipeline)[number];
export type ChurchLead = {
  id: string;
  name: string;
  church_name: string;
  phone: string;
  email: string;
  state: string;
  description: string;
  status: Pipeline;
  notes: string;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
  source: string;
  delivery: {
    status: string;
    attempts: number;
    delivered_at: string | null;
    last_error: string | null;
  } | null;
};
export const commandCopy = {
  title: "Lead workspace",
  subtitle: "Every conversation starts here.",
  empty: "Your next project starts with an inquiry.",
  emptyDetail:
    "Leads from your church landing page will appear here with their contact details and sanctuary photo.",
};
export const demoLeads: ChurchLead[] = [
  [
    "Cedar Grove Church",
    "Jordan Ellis",
    "Arizona",
    "new",
    "We’re exploring an LED wall for our main sanctuary. We’d like help choosing a size and understanding installation.",
  ],
  [
    "Northside Community",
    "Taylor Morgan",
    "Texas",
    "contacted",
    "Looking to replace our projector before the next season. Our stage is about 30 feet wide.",
  ],
  [
    "Grace Fellowship",
    "Alex Reed",
    "Georgia",
    "qualified",
    "Interested in a display behind our worship team. We have an existing production system.",
  ],
  [
    "Valley Church",
    "Casey Lee",
    "Colorado",
    "new",
    "Could you help us plan a wall for a smaller sanctuary?",
  ],
].map((row, i) => ({
  id: `demo-${i}`,
  church_name: row[0]!,
  name: row[1]!,
  state: row[2]!,
  status: row[3] as Pipeline,
  description: row[4]!,
  email: `example${i + 1}@example.com`,
  phone: "202-555-0100",
  notes: "",
  photo_path: i === 0 ? "demo" : null,
  source: "facebook",
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  delivery:
    i === 2
      ? {
          status: "delivered",
          attempts: 1,
          delivered_at: new Date().toISOString(),
          last_error: null,
        }
      : null,
}));
