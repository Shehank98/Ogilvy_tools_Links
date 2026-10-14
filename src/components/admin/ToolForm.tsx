import type { Tool } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field, TextArea, TextInput } from "@/components/fields";
import { saveTool } from "@/lib/actions/tools";
import { VisibilityPicker, type PersonOption } from "@/components/admin/VisibilityPicker";

export function ToolForm({
  tool,
  categories,
  people,
  selectedUserIds = [],
}: {
  tool?: Tool;
  categories: string[];
  people: PersonOption[];
  selectedUserIds?: string[];
}) {
  const action = saveTool.bind(null, tool?.id ?? null);
  return (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
          label="Logo image URL (optional)"
          hint="Shown in a square tile on the card, so a square logo (e.g. 400×400) works best. Accepts a direct image URL or a Google Drive share link set to “Anyone with the link”. A branded initial is shown if empty or broken."
        >
          <TextInput
            name="logoUrl"
            placeholder="https://…/logo.png"
            defaultValue={tool?.logoUrl ?? ""}
          />
        </Field>
        <Field label="Short description (optional)" hint="Used as the “About” text if you leave the details below empty">
          <TextArea
            name="description"
            rows={2}
            defaultValue={tool?.description ?? ""}
          />
        </Field>

        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
          <p className="text-sm font-semibold text-gray-900">Pop-up details (optional)</p>
          <Field label="Subtitle" hint="One line under the tool name">
            <TextInput name="subtitle" defaultValue={tool?.subtitle ?? ""} />
          </Field>
          <Field label="About this tool">
            <TextArea name="about" rows={3} defaultValue={tool?.about ?? ""} />
          </Field>
          <Field label="What it's for" hint="One point per line, shown as bullets">
            <TextArea name="purpose" rows={4} defaultValue={tool?.purpose ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Initiated by">
              <TextInput name="initiatedBy" defaultValue={tool?.initiatedBy ?? ""} />
            </Field>
            <Field label="Developed by">
              <TextInput name="developedBy" defaultValue={tool?.developedBy ?? ""} />
            </Field>
          </div>
          <Field label="Team">
            <TextArea name="team" rows={2} defaultValue={tool?.team ?? ""} />
          </Field>
          <Field label="Advisory team (optional)">
            <TextArea name="advisory" rows={2} defaultValue={tool?.advisory ?? ""} />
          </Field>
        </div>

        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Who can see this tool</p>
          <VisibilityPicker
            people={people}
            defaultVisibility={tool?.visibility ?? "EVERYONE"}
            defaultSelected={selectedUserIds}
          />
        </div>
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
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            name="isBeta"
            defaultChecked={tool ? tool.isBeta : false}
            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
          />
          Beta (shows a “Beta” badge warning users it may have issues)
        </label>
      </ActionForm>
    </div>
  );
}
