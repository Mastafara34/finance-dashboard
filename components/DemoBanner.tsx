// components/DemoBanner.tsx
'use client';

// Demo account is now a silent shadow account - no visible banner needed
// The demo user exists in DB but is filtered from all owner-visible lists
interface Props { email: string | null }

export default function DemoBanner({ email }: Props) {
  // Silent shadow - no UI shown for demo or any user
  return null;
}
