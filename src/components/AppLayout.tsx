import { NavLink } from 'react-router-dom';
import { Users, CalendarOff, CalendarDays, PartyPopper, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">DocScheduler</span>
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

          {/* Mobile lang toggle */}
          <Button variant="ghost" size="icon" onClick={toggleLang} className="md:hidden">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Toggle language</span>
          </Button>
        </div>
      </header>

      {/* Main content — pb-24 for bottom nav clearance on mobile */}
      <main className="container px-4 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t pb-safe">
        <div className="flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 px-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
