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
        <meta name="theme-color" content="#4d3316" />
        <Meta />
        <Links />
      </head>
      <body className="bg-base text-text pb-12">
        <div className="max-w-md mx-auto px-4 py-6">
          {children}
        </div>
        <footer className="fixed bottom-0 left-0 right-0 bg-base/90 backdrop-blur-sm border-t border-base-border py-2 text-center text-xs text-text-muted space-y-0.5">
          <p>
            Developed by{" "}
            <a
              href="https://nikolish.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text"
            >
              nikolish.in
            </a>
            {" · "}
            <a href="/terms" className="underline hover:text-text">
              Terms
            </a>
            {" · "}
            <a href="/privacy" className="underline hover:text-text">
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
  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";
  let status: number | null = null;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "Page not found";
      message = "The page you're looking for doesn't exist or has been moved.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      {status === 404 ? (
        <p className="text-6xl mb-4">?</p>
      ) : (
        <p className="text-6xl mb-4">!</p>
      )}
      <h1 className="text-3xl font-bold text-heading">{title}</h1>
      <p className="mt-3 text-text-muted max-w-xs leading-relaxed">
        {message}
      </p>
      {import.meta.env.DEV && error instanceof Error && error.stack && (
        <pre className="mt-6 w-full p-4 overflow-x-auto text-xs text-left bg-base-dim rounded-lg border border-base-border">
          <code>{error.stack}</code>
        </pre>
      )}
      <a
        href="/"
        className="mt-8 inline-block px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all"
      >
        Back to Home
      </a>
    </div>
  );
}
