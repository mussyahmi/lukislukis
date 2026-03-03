# 🎨 LukisLukis

Online multiplayer Pictionary game in Bahasa Melayu.

## Setup

1. Create Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Copy your Firebase config to `.env.local`
4. Run `npm run dev`

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript
- **UI**: Tailwind CSS + Shadcn UI
- **Backend**: Firebase Realtime Database
- **State**: Zustand

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
```

## Firebase Setup

1. Go to Firebase Console
2. Create new project: "lukislukis-prod"
3. Enable Realtime Database
4. Copy config to .env.local
5. Deploy rules: `firebase deploy --only database`

## Environment Variables

See `.env.local` for required variables.

## Features

- ✅ Real-time multiplayer drawing
- ✅ Progressive letter clues
- ✅ Mobile-optimized
- ✅ Cost-optimized Firebase usage
- ✅ Bahasa Melayu interface
- ✅ Vote-to-kick system
- ✅ Smart scoring system

## Cost Optimization

- Throttled drawing updates (50-100ms)
- Batched Firebase writes
- Rate-limited chat (1 msg/sec)
- Auto-cleanup of empty rooms
- Local timer calculations

## License

MIT
