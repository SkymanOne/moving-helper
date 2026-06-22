import { redirect, useNavigate, useNavigation, Form, Link } from "react-router";
import { useState, useCallback, lazy, Suspense } from "react";
import type { Route } from "./+types/scan";
import {
  getAuth,
  clearAuth,
  getSelectedDb,
  clearSelectedDb,
} from "~/lib/cookies.server";

const ScannerView = lazy(() => import("~/components/ScannerView"));

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getAuth(request);
  if (!auth) throw redirect("/");
  const selected = await getSelectedDb(request);
  if (!selected) throw redirect("/");
  return null;
}

export async function action() {
  const headers = new Headers();
  headers.append("Set-Cookie", await clearAuth());
  headers.append("Set-Cookie", await clearSelectedDb());
  return redirect("/", { headers });
}

export default function ScanPage() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(
    (results: Array<{ rawValue: string }>) => {
      const code = results[0]?.rawValue;
      if (code) {
        navigate(`/status/${encodeURIComponent(code)}`);
      }
    },
    [navigate]
  );

  const handleError = useCallback((err: unknown) => {
    const message =
      err instanceof Error ? err.message : "Camera access failed";
    if (message.toLowerCase().includes("permission")) {
      setError(
        "Camera permission denied. Please allow camera access in your browser settings."
      );
    } else {
      setError(message);
    }
  }, []);

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between mb-4">
        <Link to="/" prefetch="intent" className="text-xl font-bold text-slate-800 hover:text-slate-600 transition-colors">
          Moving Buddy
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            prefetch="intent"
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Databases
          </Link>
          <Form method="post">
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Log Out
            </button>
          </Form>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        {isNavigating ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-400">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center px-4">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="text-center text-slate-500">
                <p>Starting camera...</p>
              </div>
            }
          >
            <ScannerView onScan={handleScan} onError={handleError} />
          </Suspense>
        )}
      </div>

      {!isNavigating && (
        <p className="text-center text-sm text-slate-400 mt-4 pb-4">
          Point your camera at a barcode or QR code
        </p>
      )}
    </div>
  );
}
