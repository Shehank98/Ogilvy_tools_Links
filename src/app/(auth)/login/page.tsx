import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { FEATURES } from "@/lib/features";
import { allowedDomains, getCurrentUser } from "@/lib/user-auth";

export const metadata = { title: "Sign in · Ogilvy Tools Hub" };

export default async function LoginPage() {
  if (!FEATURES.userLogin || (await getCurrentUser())) redirect("/");
  return (
    <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
      <div>
        <div style={{ "--i": 0 } as React.CSSProperties} className="anim-fade-up stagger mb-6 flex items-baseline gap-2">
          <span className="font-serif text-4xl font-bold tracking-tight text-brand">
            Ogilvy
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-black">
            Tools Hub
          </span>
        </div>
        <h1 style={{ "--i": 1 } as React.CSSProperties} className="anim-fade-up stagger text-3xl font-bold tracking-tight text-black sm:text-4xl">
          One sign-in for every tool we build<span className="text-brand">.</span>
        </h1>
        <p style={{ "--i": 2 } as React.CSSProperties} className="anim-fade-up stagger mt-3 max-w-md text-neutral-600">
          Launch our automation tools, report a bug or suggest an idea, and
          follow it from first report to fix.
        </p>
        <ul className="mt-5 space-y-1.5 text-sm text-neutral-600">
          <li style={{ "--i": 3 } as React.CSSProperties} className="anim-slide-in stagger">• Sign up with your Ogilvy email address</li>
          <li style={{ "--i": 4 } as React.CSSProperties} className="anim-slide-in stagger">• Confirm it with a 6-digit code we email you</li>
          <li style={{ "--i": 5 } as React.CSSProperties} className="anim-slide-in stagger">• Get live progress and email updates on every ticket</li>
        </ul>
      </div>
      <div>
        <AuthPanel domain={allowedDomains()[0]} />
        <p className="mt-4 text-center text-xs text-neutral-500">
          Automation team?{" "}
          <Link href="/admin/login" className="font-medium text-brand hover:text-brand-dark">
            Admin sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
