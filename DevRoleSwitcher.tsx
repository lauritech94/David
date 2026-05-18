import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DemoUser {
  email: string;
  full_name: string;
  role: string;
  scope: string;
  description: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'owner@demo.com',
    full_name: 'Demo Owner',
    role: 'OWNER',
    scope: 'WORKSPACE',
    description: 'Full workspace access'
  },
  {
    email: 'team_manager@demo.com',
    full_name: 'Team Manager Demo',
    role: 'TEAM_MANAGER', 
    scope: 'WORKSPACE',
    description: 'Workspace management'
  },
  {
    email: 'artist_manager@demo.com',
    full_name: 'Artist Manager Demo',
    role: 'ARTIST_MANAGER',
    scope: 'ARTIST',
    description: 'Manages Rita Payés'
  },
  {
    email: 'artist_observer@demo.com',
    full_name: 'Artist Observer Demo',
    role: 'ARTIST_OBSERVER',
    scope: 'ARTIST', 
    description: 'Read-only Rita access'
  },
  {
    email: 'booking_editor@demo.com',
    full_name: 'Booking Editor Demo',
    role: 'EDITOR',
    scope: 'PROJECT',
    description: 'Can edit Gira 2025'
  },
  {
    email: 'marketing_viewer@demo.com',
    full_name: 'Marketing Viewer Demo',
    role: 'VIEWER',
    scope: 'PROJECT',
    description: 'Read-only PR campaign'
  }
];

export function DevRoleSwitcher() {
  const { user } = useAuth();
  const [pathname, setPathname] = useState(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );
  const [isResetting, setIsResetting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', update);

    // Patch pushState/replaceState so SPA navigation also updates pathname
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = function (...args) {
      const ret = origPush.apply(this, args as any);
      update();
      return ret;
    };
    window.history.replaceState = function (...args) {
      const ret = origReplace.apply(this, args as any);
      update();
      return ret;
    };

    return () => {
      window.removeEventListener('popstate', update);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  const PUBLIC_PATH_PREFIXES = [
    '/shared/', '/epk/', '/contract-draft/', '/sign/', '/sync-request/',
    '/artist-form/', '/release-form/', '/contact-form/', '/reset-password',
    '/auth',
  ];
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isAllowedHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.lovableproject.com');
  const isBlockedHost = hostname.endsWith('.lovable.app');
  const isPublicPath = PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  const isVisible = isAllowedHost && !isBlockedHost && !isPublicPath;

  if (!isVisible) return null;

  const currentDemoUser = DEMO_USERS.find(demoUser => 
    user?.email === demoUser.email
  );

  const handleSwitchUser = async (demoUser: DemoUser) => {
    setIsSwitching(true);
    try {
      // Sign out current user
      await supabase.auth.signOut();
      
      // Sign in as demo user
      const { error } = await supabase.auth.signInWithPassword({
        email: demoUser.email,
        password: 'demo123456'
      });

      if (error) {
        toast.error(`Error switching to ${demoUser.full_name}: ${error.message}`);
        return;
      }

      toast.success(`Switched to ${demoUser.full_name}`);
      
      // Reload page to update auth state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error switching user:', error);
      toast.error('Error switching user');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      // Call the seed script via edge function or direct API
      const response = await fetch('/api/seed-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset demo data');
      }

      toast.success('Demo data reset successfully');
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error resetting demo data:', error);
      toast.error('Error resetting demo data. Check console for details.');
    } finally {
      setIsResetting(false);
    }
  };

  const getRoleBadgeColor = (scope: string) => {
    switch (scope) {
      case 'WORKSPACE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'ARTIST': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'PROJECT': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300"
          >
            <Settings className="h-4 w-4 mr-2" />
            Dev Tools
            {currentDemoUser && (
              <Badge 
                variant="secondary" 
                className={`ml-2 ${getRoleBadgeColor(currentDemoUser.scope)}`}
              >
                {currentDemoUser.role}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Probar como usuario
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {DEMO_USERS.map((demoUser) => (
            <DropdownMenuItem
              key={demoUser.email}
              onClick={() => handleSwitchUser(demoUser)}
              disabled={isSwitching || user?.email === demoUser.email}
              className="flex flex-col items-start p-3 space-y-1"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{demoUser.full_name}</span>
                <div className="flex space-x-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getRoleBadgeColor(demoUser.scope)}`}
                  >
                    {demoUser.scope}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {demoUser.role}
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {demoUser.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {demoUser.description}
              </span>
              {user?.email === demoUser.email && (
                <Badge variant="default" className="text-xs mt-1">
                  Actual
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleResetData}
            disabled={isResetting}
            className="text-orange-600 dark:text-orange-400"
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reset Demo Data
          </DropdownMenuItem>
          
          <div className="p-2 text-xs text-muted-foreground border-t">
            <strong>Modo Desarrollo:</strong> Herramientas solo para testing
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}