import { redirect, useNavigate, Form } from "react-router";
import { useState, useCallback, lazy, Suspense } from "react";
import type { Route } from "./+types/scan";
import { getSelectedDb, clearSelectedDb } from "~/lib/cookies.server";

const ScannerView = lazy(() => import("~/components/ScannerView"));

export async function loader({ request }: Route.LoaderArgs) {
  const selected = await getSelectedDb(request);
  if (!selected) throw redirect("/");
  return { dataSourceId: selected.dataSourceId };
}

export async function action({ request }: Route.ActionArgs) {
  return redirect("/", {
    headers: { "Set-Cookie": await clearSelectedDb() },
  });
}

export default function ScanPage() {
  const navigate = useNavigate();
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
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Moving Buddy</h1>
        <Form method="post">
          <button
            type="submit"
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Disconnect
          </button>
        </Form>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        {error ? (
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

      <p className="text-center text-sm text-slate-400 mt-4 pb-4">
        Point your camera at a barcode or QR code
      </p>
    </div>
  );
}
