
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp } from '@/firebase';
import { 
  Receipt, Coffee, History, LayoutDashboard, 
  Store, Printer, Tag, ReceiptIndianRupee, LogOut, UserCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Sale', href: '/billing', icon: Receipt },
  { name: 'Catalog', href: '/catalog', icon: Coffee },
  { name: 'Expenses', href: '/expenses', icon: ReceiptIndianRupee },
  { name: 'History', href: '/history', icon: History },
  { name: 'Discounts', href: '/discounts', icon: Tag },
  { name: 'Shop Profile', href: '/profile', icon: Store },
  { name: 'Printer', href: '/printer', icon: Printer },
  { name: 'Account', href: '/account', icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "Your session has ended." });
      router.push('/login');
    } catch (error) {
      toast({ title: "Logout Failed", variant: "destructive" });
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border hidden md:flex flex-col z-20">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h1 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
          <Receipt className="w-6 h-6" />
          Free bill
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border space-y-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Log Out
        </Button>
        <div className="text-center space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            Cloud Mode • Active
          </p>
          <p className="text-[8px] text-muted-foreground/50 font-mono">
            v1.2.0-stable
          </p>
        </div>
      </div>
    </aside>
  );
}
