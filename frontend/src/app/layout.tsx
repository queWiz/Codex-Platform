import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-slate-950 text-white">
            <nav className="p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="font-bold text-xl">🧠 Codex</div>
                <div>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="bg-blue-600 px-4 py-2 rounded">Sign In</button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                </div>
            </nav>
            <main className="p-8">
                {children}
            </main>
        </body>
      </html>
    </ClerkProvider>
  )
}