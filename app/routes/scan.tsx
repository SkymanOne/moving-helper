import { useNavigate, useNavigation, Form, Link } from "react-router";
import { useState, useCallback, lazy, Suspense } from "react";
import type { Route } from "./+types/scan";
import { lostSessionRedirect } from "~/lib/cookies.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";
import { resolveSession } from "~/lib/share.server";

const ScannerView = lazy(() => import("~/components/ScannerView"));

export async function loader({ request, context }: Route.LoaderArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const session = await resolveSession(request, cookies, env.WORKSPACES, env);
  if (!session) throw await lostSessionRedirect(request, cookies);
  return null;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";
  const [cameraError, setCameraError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const handleScan = useCallback(
    (results: Array<{ rawValue: string }>) => {
      const code = results[0]?.rawValue;
      if (code) {
        navigate(`/status/${encodeURIComponent(code)}`);
      }
    },
    [navigate],
  );

  const handleError = useCallback((err: unknown) => {
    const raw = err instanceof Error ? err.message : "Camera access failed";
    if (raw.toLowerCase().includes("permission")) {
      setCameraError({
        title: "Camera access denied",
        message:
          "The scanner needs camera permission to read barcodes. Please allow camera access in your browser or device settings and try again.",
      });
    } else {
      setCameraError({
        title: "Camera unavailable",
        message:
          "Could not start the camera. Make sure no other app is using it and try again.",
      });
    }
  }, []);

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <p className="text-6xl mb-4">!</p>
        <h1 className="text-3xl font-bold text-heading">{cameraError.title}</h1>
        <p className="mt-3 text-text-muted max-w-xs leading-relaxed">
          {cameraError.message}
        </p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setCameraError(null)}
            className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all"
          >
            Try Again
          </button>
          <Link
            to="/"
            className="px-6 py-3 text-text-muted font-medium rounded-xl border border-base-border hover:bg-base-dim active:scale-[0.98] transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between mb-4">
        <Link
          to="/"
          prefetch="intent"
          className="text-xl font-bold text-heading hover:text-text transition-colors"
        >
          Moving Buddy
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            prefetch="intent"
            className="text-sm text-text-muted hover:text-heading px-3 py-1 rounded-lg hover:bg-base-dim transition-colors"
          >
            Databases
          </Link>
          <Form method="post" action="/auth/logout" reloadDocument>
            <button
              type="submit"
              className="text-sm text-text-muted hover:text-heading px-3 py-1 rounded-lg hover:bg-base-dim transition-colors"
            >
              Log Out
            </button>
          </Form>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        {isNavigating ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-base-border border-t-accent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-text-muted">Loading...</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="text-center text-text-muted">
                <p>Starting camera...</p>
              </div>
            }
          >
            <ScannerView onScan={handleScan} onError={handleError} />
          </Suspense>
        )}
      </div>

      {!isNavigating && !cameraError && (
        <p className="text-center text-sm text-text-muted mt-4 pb-4">
          Point your camera at a barcode or QR code
        </p>
      )}
    </div>
  );
}
