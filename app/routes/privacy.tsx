import { Link } from "react-router";

export function meta() {
  return [{ title: "Privacy Policy - Moving Buddy" }];
}

export default function Privacy() {
  return (
    <div className="flex-1 py-8">
      <Link
        to="/"
        className="text-sm text-slate-500 hover:text-slate-700 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Privacy Policy
      </h1>

      <div className="prose prose-slate prose-sm max-w-none space-y-4 text-slate-600 leading-relaxed">
        <p>
          <strong>Last updated:</strong> June 2026
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          What We Collect
        </h2>
        <p>
          Moving Buddy collects the minimum data needed to function:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Notion OAuth token</strong> — stored in an encrypted,
            HTTP-only cookie on your device. Used to access your Notion
            workspace on your behalf. Never stored on our servers.
          </li>
          <li>
            <strong>Selected database preference</strong> — stored in a cookie
            on your device so you don't have to re-select it each time.
          </li>
        </ul>
        <p>
          That's it. We don't collect analytics, tracking data, personal
          information, or anything else.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          Camera Access
        </h2>
        <p>
          Moving Buddy requests access to your device camera solely for scanning
          barcodes and QR codes. Camera data is processed entirely on your
          device and is never transmitted or stored.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          Third-Party Services
        </h2>
        <p>
          Moving Buddy connects to the{" "}
          <a
            href="https://developers.notion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-800 underline hover:text-slate-600"
          >
            Notion API
          </a>{" "}
          to read and update your databases. Your data is governed by{" "}
          <a
            href="https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-800 underline hover:text-slate-600"
          >
            Notion's own privacy policy
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          Data Storage
        </h2>
        <p>
          All data stays on your device (in browser cookies) and in your Notion
          workspace. Moving Buddy does not operate a database or server-side
          storage for user data.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          Deleting Your Data
        </h2>
        <p>
          Click "Log Out" in the app to clear all cookies. You can also revoke
          Moving Buddy's access to your Notion workspace at any time from{" "}
          <strong>Settings &amp; members &rarr; My connections</strong> in
          Notion.
        </p>

        <h2 className="text-lg font-semibold text-slate-700 mt-6">
          Contact
        </h2>
        <p>
          Questions about your privacy? Reach out at{" "}
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
