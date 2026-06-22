import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("scan", "routes/scan.tsx"),
  route("status/:code", "routes/status.$code.tsx"),
] satisfies RouteConfig;
