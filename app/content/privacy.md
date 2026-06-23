**Last updated:** June 2026

## What We Collect

Moving Buddy collects only the data required to operate:

- **Your Notion connection:** When you sign in, the access and refresh tokens for your workspace are stored on Cloudflare's edge network (KV) and associated with your workspace. They are used to read and update your databases on your behalf. The cookie set in your browser contains only an identifier that references this record; it does not contain the token.
- **Selected database preference:** For the workspace owner, this preference is stored with the connection record so that it is available across devices. For guests who join using a share code, the preference is stored in a cookie on their own device.
- **Share codes:** When you generate a share code so that others can scan using your databases, the code is stored on Cloudflare KV as a reference to your workspace; it does not contain a copy of your token. This allows others to use the scanner without their own Notion account. Share codes may be revoked at any time from the Manage Share Codes page.

Moving Buddy does not collect analytics, tracking data, personal information, or any other data.

## Camera Access

Moving Buddy requests access to your device camera solely to scan barcodes and QR codes. Camera data is processed entirely on your device and is never transmitted or stored.

## Third-Party Services

Moving Buddy connects to the [Notion API](https://developers.notion.com) to read and update your databases. Your data is governed by [Notion's privacy policy](https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac).

## Data Storage

Your data is held in three locations: your Notion workspace; a record on Cloudflare's edge network (KV) containing your connection, selected database, and share codes; and a cookie on your device that identifies you. Records for inactive workspaces are removed from KV automatically after a period of disuse.

## Data Security

All data stored on Cloudflare's network is encrypted at rest (AES-256) and transmitted over HTTPS. In addition, the application encrypts your Notion tokens with a separate key before they are written to storage, so that the tokens cannot be read from the storage layer alone. Tokens are never stored in your browser and are excluded from application logs.

## Deleting Your Data

Selecting "Log Out" clears the cookie on your current device; your stored workspace is retained so that your other devices and share codes continue to function. To remove all stored data, select **Disconnect Workspace** on the Manage Share Codes page, which deletes your stored connection and all associated share codes at once. Individual codes may also be revoked there. You may revoke Moving Buddy's access to your Notion workspace at any time from **Settings & members > My connections** in Notion.

## Contact

For questions regarding your privacy, contact us at [nikolish.in](https://nikolish.in).
