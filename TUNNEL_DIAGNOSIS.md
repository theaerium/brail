# Expo Tunnel Connection Issues - Complete Diagnosis

## 🔍 Root Cause Analysis

### The Problem
You're getting `ERR_NGROK_3200: The endpoint is offline` when scanning the QR code from the Emergent preview page.

### Why This Happens

1. **Dynamic Tunnel URLs**: Expo uses ngrok tunnels in `--tunnel` mode. Each time Expo restarts, it generates a **new random tunnel URL**.

2. **Cached QR Code**: The Emergent preview page shows a QR code that was generated when Expo first started. This QR code contains the **old tunnel URL** (like `repo-navigator-26.ngrok.io` from your error).

3. **Mismatch**: When you scan the QR code, Expo Go tries to connect to the old tunnel URL, which is now offline because the tunnel URL has changed.

### Current Status

✅ **Backend**: Running properly on port 8001  
✅ **Expo Metro**: Running and bundling correctly  
✅ **Ngrok Tunnel**: Active and accessible  
❌ **QR Code**: Shows outdated tunnel URL  

**Current Active Tunnel**: `https://zlhnvdy-anonymous-3000.exp.direct`  
**Old Tunnel (in QR)**: `repo-navigator-26.ngrok.io` ❌ (offline)

---

## ✅ Solutions

### Solution 1: Manual URL Entry (RECOMMENDED)

This bypasses the QR code entirely:

1. Open **Expo Go** app on your phone
2. Tap **"Enter URL manually"** (or similar option)
3. Paste this exact URL:
   ```
   exp://zlhnvdy-anonymous-3000.exp.direct
   ```
4. Tap **"Connect"**

✅ **Pros**: Direct connection, no QR code needed  
⚠️ **Note**: This URL will change if Expo restarts

---

### Solution 2: Web Preview (MOST STABLE)

Use the web preview URL directly in your mobile browser:

```
https://08920879-792e-470d-8b63-857cb964855d.preview.emergentagent.com
```

**How to use:**
1. Open this URL in your phone's browser (Safari, Chrome, etc.)
2. The app works fully in the browser
3. For a more "native" feel, add to home screen:
   - **iOS**: Tap Share → Add to Home Screen
   - **Android**: Tap Menu → Add to Home Screen

✅ **Pros**: 
- Stable URL (doesn't change)
- No Expo Go app needed
- Works like a native app
- Full functionality

🎯 **This is the recommended approach for cloud/containerized Expo apps**

---

### Solution 3: Generate Fresh QR Code

Generate a new QR code with the current tunnel URL:

**Option A**: Visit this URL in your browser:
```
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=exp://zlhnvdy-anonymous-3000.exp.direct
```

**Option B**: Use any QR code generator with this data:
```
exp://zlhnvdy-anonymous-3000.exp.direct
```

Then scan the newly generated QR code with Expo Go.

⚠️ **Note**: This QR code will also become outdated if Expo restarts

---

## 🔧 Technical Details

### Ngrok Tunnel Information

```json
{
  "name": "Expo Metro",
  "public_url": "https://zlhnvdy-anonymous-3000.exp.direct",
  "proto": "https",
  "local_addr": "http://localhost:3000",
  "status": "online"
}
```

### Why Tunnels Are Unstable in Cloud Environments

1. **Container Restarts**: Kubernetes/Docker containers can restart, causing new tunnel URLs
2. **No Persistence**: Ngrok free tier doesn't support fixed subdomains
3. **Session Limits**: Ngrok tunnels can expire
4. **Network Issues**: Cloud networking can cause tunnel drops

### Better Alternatives for Production

For production Expo apps in cloud environments:

1. **Expo EAS Build**: Create standalone builds
2. **Web Preview**: Use the stable preview URL
3. **TestFlight/Google Play**: Distribute via app stores
4. **Expo Development Builds**: Custom development clients

---

## 📝 Test Account

Once connected, use these credentials:

- **Username**: `bob`
- **PIN**: `5678`

---

## 🎯 Recommended Approach

For the best experience with this cloud-hosted Expo app:

1. **For quick testing**: Use **Solution 2** (Web Preview)
2. **For Expo Go testing**: Use **Solution 1** (Manual URL)
3. **Avoid**: Relying on the Emergent QR code (it gets stale quickly)

---

## 🔄 If Tunnel Changes

If the tunnel URL changes (after Expo restart), check the new URL:

```bash
curl -s http://127.0.0.1:4040/api/tunnels | python3 -m json.tool
```

Look for the `public_url` field in the response.

---

## 📞 Support

If none of these solutions work:

1. Check that Expo is running: `supervisorctl status expo`
2. Check tunnel status: `curl http://127.0.0.1:4040/api/tunnels`
3. Verify web preview works: Visit the preview URL
4. Check Expo logs: `tail -50 /var/log/supervisor/expo.err.log`

---

**Last Updated**: 2025-11-09  
**Session ID**: 08920879-792e-470d-8b63-857cb964855d  
**Current Tunnel**: zlhnvdy-anonymous-3000.exp.direct
