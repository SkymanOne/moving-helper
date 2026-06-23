import { createContext } from "react-router";
import type { AppCookies } from "./cookies.server";

export const cloudflareContext = createContext<{
  env: Env;
  ctx: ExecutionContext;
}>();

export const cookiesContext = createContext<AppCookies>();
