import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#1e293b" />
        <Meta />
        <Links />
      </head>
      <body className="bg-slate-50 text-slate-900 pb-20">
        <div className="max-w-md mx-auto px-4 py-6">
          {children}
        </div>
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-50/90 backdrop-blur-sm border-t border-slate-100 py-2 text-center text-xs text-slate-400 space-y-0.5">
          <p>
            Developed by{" "}
            <a
              href="https://nikolish.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600"
            >
              nikolish.in
            </a>
            {" · "}
            <a href="/terms" className="underline hover:text-slate-600">
              Terms
            </a>
            {" · "}
            <a href="/privacy" className="underline hover:text-slate-600">
              Privacy
            </a>
          </p>
          <p>&copy; {new Date().getFullYear()} Moving Buddy</p>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-slate-800">{message}</h1>
      <p className="mt-2 text-slate-600">{details}</p>
      {stack && (
        <pre className="mt-4 w-full p-4 overflow-x-auto text-xs bg-slate-100 rounded-lg">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
