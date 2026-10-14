import { serverDb } from "@/lib/supabase/server";
export async function authenticatedUser() {
  const db = await serverDb();
  const {data:{user},error} = await db.auth.getUser();
  if(error || !user) return null;
  return {db,user};
}
export function isUsernameValid(name:string) {
  return /^[a-z][a-z0-9_]{2,19}$/.test(name);
}