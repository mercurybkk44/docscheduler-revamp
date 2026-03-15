import { NavLink } from 'react-router-dom';
import { Users, CalendarOff, CalendarDays } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Doctors', icon: Users },
  { to: '/unavailable', label: 'Unavailable Dates', icon: CalendarOff },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">DocScheduler</span>
          </div>
          <nav className="flex gap-1">
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
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
