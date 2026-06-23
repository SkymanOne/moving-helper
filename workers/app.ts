import { createRequestHandler, RouterContextProvider } from "react-router";
import { createCookies } from "~/lib/cookies.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	fetch(request, env, ctx) {
		const context = new RouterContextProvider();
		context.set(cloudflareContext, { env, ctx });
		context.set(cookiesContext, createCookies(env.SESSION_SECRET));
		return requestHandler(request, context);
	},
} satisfies ExportedHandler<Env>;
