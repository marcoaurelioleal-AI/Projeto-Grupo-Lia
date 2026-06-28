import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  CheckSquare,
  FileSearch,
  Home,
  LogOut,
  Menu,
  Package,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import type { Role } from '../types';

const baseNavItems: Array<{ to: string; label: string; icon: typeof Home; roles?: Role[] }> = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/checklists', label: 'Tarefas', icon: CheckSquare, roles: ['admin', 'gerente', 'operacao'] },
  { to: '/inventory', label: 'Estoque', icon: Package, roles: ['admin', 'gerente', 'operacao'] },
  { to: '/incidents', label: 'Ocorrências', icon: AlertTriangle, roles: ['admin', 'gerente', 'operacao'] },
  { to: '/reports', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'lideranca', 'gerente', 'auditor'] },
  { to: '/audit', label: 'Auditoria', icon: FileSearch, roles: ['admin', 'lideranca', 'auditor'] },
  { to: '/manuals', label: 'Manuais', icon: BookOpen },
  { to: '/assistant', label: 'Lia', icon: Bot, roles: ['admin', 'gerente', 'operacao', 'auditor'] }
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuth();
  const navItems = [
    ...baseNavItems.filter((item) => !item.roles || (user?.role ? item.roles.includes(user.role) : false)),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Shield }] : [])
  ];

  return (
    <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] text-lia-ink md:pb-0">
      <header className="sticky top-0 z-40 border-b border-lia-red/10 bg-lia-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img src="/logos/logo_burger.png" alt="Logo Lia Burger" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lia-red">Grupo Lia</p>
              <h1 className="text-lg font-bold text-lia-burgundy">Operação diária</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-lia-muted">{user?.name}</span>
            <button onClick={logout} className="focus-ring rounded-lg p-2 text-lia-burgundy hover:bg-lia-red/10">
              <LogOut size={18} />
            </button>
          </div>

          <button className="focus-ring rounded-lg p-2 text-lia-burgundy md:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu />
          </button>
        </div>
        {open ? (
          <div className="border-t border-lia-red/10 bg-lia-cream px-4 py-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
              ))}
              <button
                onClick={logout}
                className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-lia-red/20 px-3 py-2 text-sm font-semibold text-lia-burgundy"
              >
                <LogOut size={17} /> Sair
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-lia-red/10 bg-lia-cream/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        {navItems.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  onClick
}: {
  to: string;
  label: string;
  icon: typeof Home;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'focus-ring flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
          isActive ? 'bg-lia-red text-white' : 'text-lia-burgundy hover:bg-lia-red/10'
        ].join(' ')
      }
    >
      <Icon size={17} /> {label}
    </NavLink>
  );
}

function MobileNavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'flex min-h-12 min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold',
          isActive ? 'bg-lia-red text-white' : 'text-lia-burgundy'
        ].join(' ')
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}
