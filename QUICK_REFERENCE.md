# Quick Reference

## 🎯 Today's Critical Tasks

### 1️⃣ Deploy Security Rules (2 min)
```bash
firebase deploy --only firestore:rules
```
✅ Admin code "1234" will work

### 2️⃣ Test Admin Code (5 min)
1. App Settings (bottom tab)
2. Account section
3. Enter code: `1234`
4. Click button
5. ✅ Should see success alert

### 3️⃣ Create Privacy Policy (1 hour)
- Write document
- Host on GitHub Pages / Vercel
- Get public URL
- Save for app store submission

### 4️⃣ Test on Real Devices (1-2 hours)
- iPhone (iOS 14+)
- Android (Android 11+)
- Login → Select Service → Track
- Check for crashes

---

## 📚 Essential Docs

| File | Purpose |
|------|---------|
| README.md | Project overview |
| CRITICAL_NEXT_STEPS.md | What to do immediately |
| docs/SETUP.md | Dev setup |
| docs/FEATURES.md | Feature list |
| docs/SECURITY.md | Security audit |
| docs/DEPLOYMENT.md | App store guide |
| docs/API.md | API reference |

---

## 🏗️ Code Structure

```
src/
├── screens/           Screen components
├── components/        UI components
├── services/          Firebase, API, tracking
├── state/             Redux, Context
├── utils/             Helpers, constants, types
├── hooks/             Custom hooks
├── config/            App config
├── navigation/        Routing
└── assets/            Images, fonts
```

---

## 🔥 Most Common Commands

```bash
# Start development
npm run web          # Web browser
npm run ios          # iOS simulator
npm run android      # Android emulator

# Deploy
firebase deploy --only firestore:rules
eas build --platform ios
eas build --platform android

# Quality checks
npx tsc --noEmit    # Type check
npm run lint        # Linting
npm test            # Tests
```

---

## 🔐 Security Checklist

✅ Security rules audit - PASSED  
✅ Admin code fix - DONE  
✅ No critical vulnerabilities found  

⚠️ To do:
- [ ] Replace hardcoded "1234" with Cloud Function
- [ ] Add audit logging
- [ ] Enable Crashlytics

---

## ⏱️ Timeline

| Item | Effort | Urgency |
|------|--------|---------|
| Deploy rules + Privacy Policy | 1-2 hrs | 🔴 TODAY |
| Test on real devices | 2-3 hrs | 🔴 TODAY |
| Create app builds | 1 hr | 🟡 Tomorrow |
| Screenshots | 1 hr | 🟡 Tomorrow |
| Submit to stores | 20 min | 🟡 This week |

---

## 📞 Support

- Getting started? → Read [docs/SETUP.md](docs/SETUP.md)
- Building app? → Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- API questions? → Read [docs/API.md](docs/API.md)
- Security questions? → Read [docs/SECURITY.md](docs/SECURITY.md)

---

## ✅ Ready to Launch?

Before you submit to app stores, verify:

- [ ] Admin code "1234" works in Settings
- [ ] Privacy Policy written & hosted
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Tested on iOS and Android devices
- [ ] No hardcoded secrets
- [ ] Security rules deployed
- [ ] App store listings ready

---

**Start with:** `firebase deploy --only firestore:rules` then test admin code ✅
