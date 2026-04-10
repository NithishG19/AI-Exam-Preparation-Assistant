import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpen, MessageSquare, PenTool, BarChart3,
  Layers, GraduationCap, LogOut, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/study-plan', icon: BookOpen, label: 'Study Plan' },
  { to: '/quiz', icon: PenTool, label: 'Quiz & Tests' },
  { to: '/revision', icon: Layers, label: 'Revision' },
  { to: '/ai-tutor', icon: MessageSquare, label: 'AI Tutor' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

const MobileNav: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="rounded-lg gradient-primary p-1.5">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-foreground">ExamPrep AI</span>
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="rounded-xl gradient-primary p-2">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="font-display font-bold text-foreground">ExamPrep AI</h2>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'gradient-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-border mt-auto">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={async () => { await signOut(); navigate('/auth'); }}>
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;
