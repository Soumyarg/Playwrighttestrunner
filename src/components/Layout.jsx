import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard, FlaskConical, Play, BookMarked,
  Moon, Sun, Menu, X, Terminal, Zap
} from 'lucide-react';
import { toggleDarkMode } from '../store/uiSlice';
import Notification from './Notification';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/test-orchestrator', label: 'Orchestrator', icon: FlaskConical },
  { to: '/test-execution', label: 'Execution', icon: Play },
  { to: '/saved-tests', label: 'Saved Tests', icon: BookMarked },
];

export default function Layout() {
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isRunning = useSelector(state => state.execution.isRunning);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-navigation bg-card border-b border-border shadow-elevation-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Terminal size={16} className="text-white" />
              </div>
              <div>
                <span className="font-heading font-bold text-sm text-foreground">Playwright</span>
                <span className="font-heading font-bold text-sm text-primary"> Runner</span>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {isRunning && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" />
                Running
              </div>
            )}
            <button
              onClick={() => dispatch(toggleDarkMode())}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">PT</span>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="lg:hidden border-t border-border bg-card px-3 py-2 flex flex-col gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <Notification />
    </div>
  );
}
