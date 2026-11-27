import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Compass,
  FolderKanban,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  UserCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { OrganizerAvatar } from '../components/OrganizerAvatar';
import { BackButton } from '../components/BackButton';
import { WePayLogo } from '../components/WePayLogo';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName, formatFullHeaderDate } from '../utils/formatters';
import { Footer } from '../components/Footer';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', Icon: Compass, end: true },
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/collections', label: 'My Collections', Icon: FolderKanban, end: false },
  { to: '/dashboard/create', label: 'Create Collection', Icon: Plus, end: true },
  { to: '/dashboard/transactions', label: 'Transactions', Icon: ListOrdered, end: true },
  { to: '/dashboard/profile', label: 'Account / Profile', Icon: UserCircle, end: true },
];

interface OrganizerLayoutProps {
  requireAuth?: boolean;
}

export const OrganizerLayout: React.FC<OrganizerLayoutProps> = ({ requireAuth = true }) => {
  const { organizer, isAuthenticated, isNewUser, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isFounder = Boolean(organizer?.isFounder || organizer?.role === 'SUPER_ADMIN');

  if (requireAuth && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600 font-medium">Loading organizer workspace...</div>
      </div>
    );
  }

  if (requireAuth && (!isAuthenticated || !organizer)) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,color,transform] duration-150 whitespace-nowrap ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 shadow-[inset_0_0_0_1px_rgba(199,210,254,0.55)]'
        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white/95 border-r border-slate-200/80 z-30 backdrop-blur-xl transition-[width] duration-200 ${
          desktopSidebarOpen ? 'lg:w-64' : 'lg:w-0 overflow-hidden'
        }`}
      >
        <div className="h-[72px] px-5 flex items-center justify-between border-b border-slate-200/80 whitespace-nowrap">
          <Link to="/" aria-label="WePay Overview Home">
            <WePayLogo />
          </Link>
          <button
            type="button"
            onClick={() => setDesktopSidebarOpen(false)}
            aria-label="Close sidebar"
            title="Close sidebar"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Organizer navigation">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          {isFounder && (
            <NavLink to="/admin" className={navLinkClass}>
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Founder Console</span>
              <span className="ml-auto rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                Admin
              </span>
            </NavLink>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200/80 space-y-2">
          {isAuthenticated && organizer ? (
            <>
              <Link
                to="/dashboard/profile"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <OrganizerAvatar
                  name={formatDisplayName(organizer.fullName)}
                  avatarUrl={organizer.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {formatDisplayName(organizer.fullName)}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono-num truncate">
                    @{organizer.handle}
                  </p>
                </div>
              </Link>
              <Link
                to={`/u/${organizer.handle}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <span className="truncate">@{organizer.handle} Hub</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div className="space-y-2 p-1">
              <Link to="/login" className="block">
                <Button variant="outline" size="sm" fullWidth>
                  Sign In
                </Button>
              </Link>
              <Link to="/register" className="block">
                <Button size="sm" fullWidth>
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-900/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-72 max-w-[85vw] h-full bg-white border-r border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <WePayLogo />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={navLinkClass}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
              {isFounder && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={navLinkClass}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Founder Console</span>
                  <span className="ml-auto rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                    Admin
                  </span>
                </NavLink>
              )}
            </nav>
            <div className="p-3 border-t border-slate-200 space-y-2">
              {isAuthenticated && organizer ? (
                <>
                  <Link
                    to="/dashboard/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <OrganizerAvatar
                      name={formatDisplayName(organizer.fullName)}
                      avatarUrl={organizer.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {formatDisplayName(organizer.fullName)}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono-num truncate">
                        @{organizer.handle}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2 p-1">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button variant="outline" size="sm" fullWidth>
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button size="sm" fullWidth>
                      Create Account
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${
          desktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/90 border-b border-slate-200/80 backdrop-blur-xl">
          <div className="px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {location.pathname !== '/' && <BackButton compact className="shrink-0" />}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden h-10 w-10 -ml-2 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen(true)}
                aria-label="Open sidebar"
                title="Open sidebar"
                className={`hidden lg:flex h-10 w-10 rounded-lg items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0 ${
                  desktopSidebarOpen ? 'lg:hidden' : ''
                }`}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {(() => {
                    if (!isAuthenticated || !organizer) {
                      return 'Welcome to WePay';
                    }
                    const firstName = formatDisplayName(organizer.fullName).split(' ')[0] || '';
                    if (!firstName) {
                      return isNewUser ? 'Welcome' : 'Welcome back';
                    }
                    return isNewUser
                      ? `Welcome ${firstName}`
                      : `Welcome back, ${firstName}`;
                  })()}
                </p>
                <p className="text-xs text-slate-500 hidden sm:block truncate">
                  {formatFullHeaderDate()}
                </p>
              </div>
            </div>

            {isAuthenticated && organizer ? (
              <div className="flex items-center gap-2.5 shrink-0">
                <Link to="/dashboard/create" className="hidden sm:inline-flex">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    <span>Create Collection</span>
                  </Button>
                </Link>

                {/* Notification Bell */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen((v) => !v);
                      setProfileMenuOpen(false);
                    }}
                    aria-label="Workspace notifications"
                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-40">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-900">Activity Feed</span>
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                      <div className="py-2 space-y-2 text-xs text-slate-600">
                        <p>
                          Share any active collection link to test live contributor payments and
                          automatic ledger updates.
                        </p>
                        <Link
                          to="/dashboard/transactions"
                          onClick={() => setNotifOpen(false)}
                          className="inline-block font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Inspect all transactions →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((v) => !v);
                      setNotifOpen(false);
                    }}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <OrganizerAvatar
                      name={formatDisplayName(organizer.fullName)}
                      avatarUrl={organizer.avatarUrl}
                      size="xs"
                    />
                    <span className="hidden md:inline text-xs font-medium text-slate-700 max-w-[110px] truncate">
                      {formatDisplayName(organizer.fullName)}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40">
                    <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
                      <OrganizerAvatar
                        name={formatDisplayName(organizer.fullName)}
                        avatarUrl={organizer.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {formatDisplayName(organizer.fullName)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{organizer.email}</p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Account & Settlement Bank
                    </Link>
                    <Link
                      to={`/u/${organizer.handle}`}
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Public Organizer Hub
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Create Account</Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
        {location.pathname === '/' && <Footer />}
      </div>
    </div>
  );
};
