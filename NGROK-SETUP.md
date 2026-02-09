# Ngrok Setup for Testing

## Start ngrok after PC restart

Ngrok does not run automatically. To make your dev API visible to the embed script:

1. **Start your API** (e.g. `pnpm dev` so the API is listening on port 3000).
2. **Start ngrok** in a separate terminal:
    ```bash
    pnpm run ngrok
    ```
    Or run `ngrok http 3000` if ngrok is in your PATH (e.g. from Start menu or your usual terminal).
3. Copy the **HTTPS forwarding URL** ngrok shows (e.g. `https://xxxx-xx-xx-xx-xx.ngrok-free.app`) and use it as the embed script base URL and in **Websites** in the admin if needed.

If `pnpm run ngrok` fails with "ngrok not found", start ngrok from the **ngrok app** (Start menu → ngrok) or from a terminal where you’ve installed ngrok and added it to PATH.

---

## ⚠️ One-Time Browser Setup Required

Ngrok's free tier shows a **browser warning (interstitial)** on first access. For `<script src="https://your-ngrok.dev/embed/script.js">` the browser cannot send custom headers, so ngrok may return that HTML instead of the real script — the embed then fails (e.g. "Unexpected token '<'").

You must complete this one-time setup **in the same browser** you use to test the embed:

### Steps:

1. **Open your browser** and visit the **exact embed script URL** (so the cookie is set for script requests):

    ```
    https://nonappropriable-masked-tarah.ngrok-free.dev/embed/script.js?site_id=YOUR_SITE_ID
    ```

    Replace `YOUR_SITE_ID` with your real site id (e.g. `site_5627330ec0d41e8233f55ca974bf89fd`), or at least use any valid site_id.

2. **Click "Visit Site"** on the ngrok warning page.

3. You should then see either:
   - **JavaScript code** (embed script) → ngrok and API are working.
   - **503 / "Embed script not available"** → API is reachable but the embed wasn’t built; run `pnpm build:embed` and restart the API.

4. **Reload the page** where the embed is used — the script should now load (browser sends the ngrok cookie on subsequent requests).

---

## 🔄 After Setup

Once you've visited the ngrok URL and accepted the warning:

-   ✅ The browser remembers your choice (cookie-based)
-   ✅ All API requests will work
-   ✅ No more "Unexpected token '<'" errors

---

## 📱 Testing on Different Devices/Browsers

You'll need to visit the ngrok URL once in each:

-   Different browser (Chrome, Firefox, Safari, etc.)
-   Private/Incognito window
-   Different device (phone, tablet)

---

## 🚀 Production Solution

For production, deploy to a real domain without ngrok:

-   Use a VPS (DigitalOcean, AWS, etc.)
-   Use a platform (Railway, Render, Fly.io)
-   Use Cloudflare Tunnel (alternative to ngrok)

Then update the `API_URL` in `.env` to your production domain.

---

## 🔧 Troubleshooting: "Embed / ngrok endpoint not working"

| Symptom | What to do |
|--------|------------|
| Blank widget or console error like `Unexpected token '<'` | Ngrok is returning the "Visit Site" HTML instead of the script. **Open the exact script URL** in the same browser (e.g. `https://your-ngrok.ngrok-free.dev/embed/script.js?site_id=...`), click **Visit Site**, then reload the page that embeds the script. |
| 503 "Embed script not available" | API is running but the embed file is missing. From repo root run `pnpm build:embed` (or `pnpm --filter embed build`), then restart the API. |
| Connection refused / no response | Ensure the API is running (e.g. `pnpm dev` on port 3000) and ngrok is tunneling to that port (`ngrok http 3000`). |
| New ngrok URL | After restarting ngrok you get a new URL. Update the embed script URL in your test page and in Admin → Websites (Embed API URL), and do the "Visit Site" step again for the new URL. |
