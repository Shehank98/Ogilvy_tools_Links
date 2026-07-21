"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import type { ActionState } from "./state";

export async function login(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const password = formData.get("password");
  if (!process.env.ADMIN_PASSWORD) {
    return { error: "ADMIN_PASSWORD is not configured on the server." };
  }
  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Incorrect password." };
  }
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
