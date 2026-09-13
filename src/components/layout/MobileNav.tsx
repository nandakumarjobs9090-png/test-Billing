
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Coffee, UserCircle, ReceiptIndianRupee, Store, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dash', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sale', href: '/billing', icon: Receipt },
  { name: 'Exp', href: '/expenses', icon: ReceiptIndianRupee },
  { name: 'Menu', href: '/catalog', icon: Coffee },
  { name: 'API', href: '/api-settings', icon: Key },
  { name: 'Me', href: '/account', icon: UserCircle },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex md:hidden items-center justify-around p-2 z-20 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
