import { Link } from "react-router";

export function meta() {
  return [{ title: "Terms & Conditions - Moving Buddy" }];
}

export default function Terms() {
  return (
    <div className="flex-1 py-8">
      <Link
        to="/"
        className="text-sm text-slate-500 hover:text-slate-700 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Terms &amp; Conditions
      </h1>

      <div className="prose prose-slate prose-sm max-w-none space-y-4 text-slate-600 leading-relaxed">
        <p>
          <strong>Last updated:</strong> June 2026
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          1. Acceptance of Terms
        </h2>
        <p>
          By using Moving Buddy, you agree to these terms. If you don't agree,
          please don't use the app.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          2. What Moving Buddy Does
        </h2>
        <p>
          Moving Buddy is a tool that helps you track moving boxes by scanning
          barcode labels and updating their status in your Notion workspace. The
          app connects to Notion via OAuth and reads/writes data only in
          databases you explicitly grant access to.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          3. Your Notion Data
        </h2>
        <p>
          Moving Buddy accesses your Notion workspace only with your explicit
          permission. We do not store, copy, or share your Notion data on our
          servers. All data interactions happen directly between your browser and
          the Notion API. Your OAuth access token is stored in an encrypted
          cookie on your device.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          4. No Warranty
        </h2>
        <p>
          Moving Buddy is provided "as is" without warranties of any kind. We do
          our best to keep things working, but we can't guarantee uninterrupted
          service or that the app will meet every need.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          5. Limitation of Liability
        </h2>
        <p>
          We are not liable for any damages arising from your use of Moving
          Buddy, including but not limited to data loss in your Notion workspace.
          Always keep backups of important data.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          6. Changes to These Terms
        </h2>
        <p>
          We may update these terms from time to time. Continued use of the app
          after changes constitutes acceptance of the new terms.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          7. Contact
        </h2>
        <p>
          Questions? Reach out at{" "}
          <a
            href="https://nikolish.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-800 underline hover:text-slate-600"
          >
            nikolish.in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
