import type { Workshop } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field, TextArea, TextInput } from "@/components/fields";
import { saveWorkshop } from "@/lib/actions/workshops";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function WorkshopForm({ workshop }: { workshop?: Workshop }) {
  const action = saveWorkshop.bind(null, workshop?.id ?? null);
  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <ActionForm
        action={action}
        submitLabel={workshop ? "Save changes" : "Create workshop"}
      >
        <Field label="Title">
          <TextInput name="title" defaultValue={workshop?.title} required />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            name="description"
            defaultValue={workshop?.description ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date & time">
            <TextInput
              name="dateTime"
              type="datetime-local"
              defaultValue={
                workshop ? toLocalInputValue(workshop.dateTime) : undefined
              }
              required
            />
          </Field>
          <Field label="Location or meeting link (optional)">
            <TextInput
              name="location"
              placeholder="Room 4B / https://meet…"
              defaultValue={workshop?.location ?? ""}
            />
          </Field>
        </div>
      </ActionForm>
    </div>
  );
}
