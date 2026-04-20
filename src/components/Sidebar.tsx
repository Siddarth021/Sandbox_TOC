import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function Sidebar() {
  const links = [
    { name: 'Home', href: '/' },
    { name: 'Sandbox', href: '/sandbox' },
    { name: 'Models', href: '/models' },
    { name: 'Complexity', href: '/complexity' },
    { name: 'Decidability', href: '/decidability' },
    { name: 'UTM', href: '/utm' },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-[#e8e8e1] flex flex-col p-8 fixed left-0 top-0 z-50">
      <h1 className="text-3xl font-serif font-semibold text-[#1c1c1c] tracking-tight mb-12">
        UCS<span className="text-[#c5a028]">.</span>
      </h1>
      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <Link 
            key={link.name} 
            href={link.href}
            className="block px-0 py-3 border-b border-transparent hover:border-[#c5a028] transition-all text-[#1c1c1c] uppercase tracking-[0.2em] text-[10px] font-medium"
          >
            {link.name}
          </Link>
        ))}
      </nav>
      <div className="mt-8 pt-8 border-t border-[#e8e8e1] space-y-4">
        <SignedIn>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/"/>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#c5a028]">Profile Settings</span>
          </div>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-[10px] bg-[#c5a028] text-white w-full py-2 font-bold uppercase tracking-widest hover:bg-[#1c1c1c] transition-all">
              Sign In to Lab
            </button>
          </SignInButton>
        </SignedOut>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-8">
        Exploration No. 01
      </div>
    </div>
  );
}

