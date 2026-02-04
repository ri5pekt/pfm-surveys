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

Ngrok's free tier shows a browser warning on first access. You must complete this one-time setup:

### Steps:

1. **Open your browser** and visit:

    ```
    https://nonappropriable-masked-tarah.ngrok-free.dev/health
    ```

2. **Click "Visit Site"** on the ngrok warning page

3. **Verify** you see:

    ```json
    {
        "status": "ok",
        "database": "connected",
        "timestamp": "..."
    }
    ```

4. **Refresh your website** - the embed script will now work!

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
