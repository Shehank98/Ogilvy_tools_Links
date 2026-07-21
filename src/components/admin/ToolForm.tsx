import type { Tool } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field, TextArea, TextInput } from "@/components/fields";
import { saveTool } from "@/lib/actions/tools";

export function ToolForm({
  tool,
  categories,
}: {
  tool?: Tool;
  categories: string[];
}) {
  const action = saveTool.bind(null, tool?.id ?? null);
  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <ActionForm action={action} submitLabel={tool ? "Save changes" : "Create tool"}>
        <Field label="Name">
          <TextInput name="name" defaultValue={tool?.name} required />
        </Field>
        <Field label="Link" hint="Opens in a new tab when the card is clicked">
          <TextInput
            name="link"
            type="url"
            placeholder="https://…"
            defaultValue={tool?.link}
            required
          />
        </Field>
        <Field
          label="Logo / banner image URL (optional)"
          hint="Shown as a full-width banner across the top of the card, so a wide landscape image (roughly 2:1, e.g. 800×400) works best. Accepts a direct image URL or a Google Drive share link set to “Anyone with the link”. A branded initial is shown if empty or broken."
        >
          <TextInput
            name="logoUrl"
            placeholder="https://…/logo.png"
            defaultValue={tool?.logoUrl ?? ""}
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            name="description"
            rows={3}
            defaultValue={tool?.description ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Category"
            hint={
              categories.length
                ? `Existing: ${categories.join(", ")}`
                : "e.g. Design, AI, Productivity"
            }
          >
            <TextInput
              name="category"
              list="tool-categories"
              defaultValue={tool?.category}
              required
            />
            <datalist id="tool-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Display order" hint="Lower numbers show first">
            <TextInput
              name="order"
              type="number"
              defaultValue={tool?.order ?? 0}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={tool ? tool.isActive : true}
            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
          />
          Active (visible on the public site)
        </label>
      </ActionForm>
    </div>
  );
}
