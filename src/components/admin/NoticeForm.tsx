import type { Notice } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field, Select, TextArea } from "@/components/fields";
import { saveNotice } from "@/lib/actions/notices";

export function NoticeForm({ notice }: { notice?: Notice }) {
  const action = saveNotice.bind(null, notice?.id ?? null);
  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <ActionForm
        action={action}
        submitLabel={notice ? "Save changes" : "Create notice"}
      >
        <Field label="Message">
          <TextArea
            name="message"
            rows={3}
            defaultValue={notice?.message}
            placeholder="e.g. Ogilvy Nova will be down for maintenance on Friday 6–7pm."
            required
          />
        </Field>
        <Field
          label="Type"
          hint="Controls the bar colour and label (Notice / Update / Fixed / Heads up)"
        >
          <Select name="type" defaultValue={notice?.type ?? "INFO"}>
            <option value="INFO">Info / Notice</option>
            <option value="UPDATE">Update</option>
            <option value="BUGFIX">Bug fix</option>
            <option value="WARNING">Warning / Heads up</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={notice ? notice.isActive : true}
            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
          />
          Active (show this bar on the site). Only the most recent active
          notice is shown.
        </label>
      </ActionForm>
    </div>
  );
}
