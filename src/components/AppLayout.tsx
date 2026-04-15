import { NavLink } from 'react-router-dom';
import { Users, CalendarOff, CalendarDays, PartyPopper, Menu, Globe } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { lang, setLang, t } = useI18n();

  const navItems = [
    { to: '/', label: t('nav.doctors'), icon: Users },
    { to: '/availability', label: t('nav.availability'), icon: CalendarOff },
    { to: '/holidays', label: t('nav.holidays'), icon: PartyPopper },
    { to: '/schedule', label: t('nav.schedule'), icon: CalendarDays },
  ];

  const toggleLang = () => setLang(lang === 'en' ? 'th' : 'en');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">DocScheduler</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 items-center">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <Button variant="ghost" size="sm" onClick={toggleLang} className="ml-2 gap-1.5 text-muted-foreground">
              <Globe className="h-4 w-4" />
              {lang === 'en' ? 'TH' : 'EN'}
            </Button>
          </nav>

          {/* Mobile */}
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleLang}>
              <Globe className="h-4 w-4" />
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                      <CalendarDays className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    DocScheduler
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-2 gap-1">
                  {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </NavLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="container px-4 sm:px-8 py-4 sm:py-8">{children}</main>
    </div>
  );
}
