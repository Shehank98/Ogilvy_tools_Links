import type { Upcoming } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field, TextArea, TextInput } from "@/components/fields";
import { saveUpcoming } from "@/lib/actions/upcoming";

export function UpcomingForm({ item }: { item?: Upcoming }) {
  const action = saveUpcoming.bind(null, item?.id ?? null);
  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <ActionForm
        action={action}
        submitLabel={item ? "Save changes" : "Create item"}
      >
        <Field label="Name">
          <TextInput name="name" defaultValue={item?.name} required />
        </Field>
        <Field
          label="Banner image URL (optional)"
          hint="Shown as a full-width banner (wide ~2:1 image works best). Direct URL or Google Drive share link. A branded initial is shown if empty."
        >
          <TextInput
            name="bannerUrl"
            placeholder="https://…"
            defaultValue={item?.bannerUrl ?? ""}
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            name="description"
            rows={3}
            defaultValue={item?.description ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category (optional)">
            <TextInput
              name="category"
              placeholder="e.g. Media Buying"
              defaultValue={item?.category ?? ""}
            />
          </Field>
          <Field label="Display order" hint="Lower numbers show first">
            <TextInput name="order" type="number" defaultValue={item?.order ?? 0} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={item ? item.isActive : true}
            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
          />
          Active (visible in the “Coming soon” section)
        </label>
      </ActionForm>
    </div>
  );
}
