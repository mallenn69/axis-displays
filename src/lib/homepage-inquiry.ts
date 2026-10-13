import type { z } from "zod";
import type { quoteSchema } from "@/config/quote";
export function homepageInquiry(values: z.output<typeof quoteSchema>, id: string) {
  const description = [
    "HOMEPAGE INQUIRY",
    `Role: ${values.role}`,
    `City: ${values.city}`,
    values.stage_width && `Display width: ${values.stage_width} ft`,
    values.install_timeline && `Timeline: ${values.install_timeline}`,
    values.message,
  ]
    .filter(Boolean)
    .join("\n");
  if (description.length > 3000) throw new Error("Please shorten your project description.");
  const data = new FormData();
  for (const [key, value] of Object.entries({
    submission_id: id,
    name: values.name,
    phone: values.phone,
    email: values.email,
    church_name: values.church_name,
    state: values.state,
    description,
    website: values.website,
  }))
    data.set(key, value);
  return data;
}
