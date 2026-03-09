# 🎨 LukisLukis

Online multiplayer Pictionary game in Bahasa Melayu.

Live at [lukislukis.web.app](https://lukislukis.web.app)

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript
- **UI**: Tailwind CSS v4 + Shadcn UI
- **Backend**: Firebase Realtime Database
- **State**: Zustand

## Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Copy your Firebase config to `.env.local`
4. Run `npm run dev`

## Development

```bash
npm run dev      # Start dev server (port 3005)
npm run build    # Build for production
npm run start    # Start production server
```

## Firebase Setup

1. Create new Firebase project
2. Enable Realtime Database
3. Copy config to `.env.local`
4. Deploy database rules: `firebase deploy --only database`
5. Deploy hosting: `firebase deploy --only hosting`

## Environment Variables

See `.env.local` for required variables.

## Features

- Real-time multiplayer drawing
- 329 Bahasa Melayu words
- Progressive letter clues
- Mobile-optimized
- Dark/light mode
- Vote-to-kick system
- Smart scoring system
- PWA support (Add to Home Screen)

## License

MIT
