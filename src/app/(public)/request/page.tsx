import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { ActionForm } from "@/components/ActionForm";
import { Field, Select, TextArea, TextInput } from "@/components/fields";
import { submitToolRequest } from "@/lib/actions/requests";

export default function RequestPage() {
  if (!FEATURES.requests) redirect("/");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request a Tool</h1>
        <p className="mt-1 text-sm text-gray-600">
          Doing something repetitive that a tool could automate? Tell us about
          it. Already submitted?{" "}
          <Link
            href="/request/status"
            className="font-medium text-brand hover:text-brand-dark"
          >
            Check your request status
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ActionForm action={submitToolRequest} submitLabel="Submit request">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <TextInput name="requesterName" placeholder="Jane Doe" required />
            </Field>
            <Field label="Your email">
              <TextInput
                name="requesterEmail"
                type="email"
                placeholder="jane@company.com"
                required
              />
            </Field>
          </div>
          <Field label="Tool name / idea">
            <TextInput
              name="toolName"
              placeholder="e.g. Auto report formatter"
              required
            />
          </Field>
          <Field label="What repetitive task should it solve?">
            <TextArea
              name="taskDescription"
              placeholder="Describe the task, the steps involved, and who does it…"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How often do you do this task?">
              <Select name="frequency" defaultValue="WEEKLY">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </Select>
            </Field>
            <Field
              label="Time it takes manually (optional)"
              hint='e.g. "30 min per day" or "2 hours per week"'
            >
              <TextInput name="estimatedTimeSaved" placeholder="30 min per day" />
            </Field>
          </div>
          <Field
            label="Attachment / screenshot URL (optional)"
            hint="Paste a link to a screenshot or example file (e.g. from your drive)"
          >
            <TextInput name="attachmentUrl" placeholder="https://…" />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
