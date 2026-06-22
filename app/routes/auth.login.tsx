import { useLoaderData } from "react-router";
import { getNotionAuthUrl } from "~/lib/notion.server";

export async function loader() {
  return { authUrl: getNotionAuthUrl() };
}

export default function AuthLogin() {
  const { authUrl } = useLoaderData<typeof loader>();

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Connecting to Notion...</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(authUrl)});`,
          }}
        />
      </head>
      <body>
        <p style={{ textAlign: "center", marginTop: "40vh", fontFamily: "system-ui" }}>
          Redirecting to Notion...
        </p>
      </body>
    </html>
  );
}
