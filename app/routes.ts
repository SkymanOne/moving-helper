import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("scan", "routes/scan.tsx"),
  route("status/:code", "routes/status.$code.tsx"),
  route("terms", "routes/terms.tsx"),
  route("privacy", "routes/privacy.tsx"),
] satisfies RouteConfig;
