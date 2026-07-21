import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field, TextInput } from "@/components/fields";
import { login } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Admin access</h1>
        <p className="mt-1 mb-4 text-sm text-gray-600">
          Enter the admin password to manage Tools Hub content.
        </p>
        <ActionForm action={login} submitLabel="Sign in">
          <Field label="Admin password">
            <TextInput
              name="password"
              type="password"
              autoFocus
              required
              autoComplete="current-password"
            />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
