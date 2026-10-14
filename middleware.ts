import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
export async function middleware(request:NextRequest) {
  let response = NextResponse.next({request});
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{
    cookies:{
      getAll(){return request.cookies.getAll();},
      setAll(items: { name: string; value: string; options: CookieOptions }[]){
        items.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      }
    }
  });
  const {data:{user}} = await db.auth.getUser();
  if(request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();url.pathname="/login";url.searchParams.set("next","/dashboard");
    return NextResponse.redirect(url);
  }
  if(request.nextUrl.pathname.startsWith("/onboarding") && !user) {
    return NextResponse.redirect(new URL("/login",request.url));
  }
  return response;
}
export const config={matcher:["/dashboard/:path*","/onboarding/:path*","/auth/:path*"]};