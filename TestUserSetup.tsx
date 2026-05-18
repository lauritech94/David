import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestUserSetupProps {
  onComplete: () => void;
}

const TestUserSetup: React.FC<TestUserSetupProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const setupTestUsers = async () => {
    setLoading(true);
    try {
      console.log('🚀 Setting up test users for E2E tests...');
      
      const { data, error } = await supabase.functions.invoke('setup-test-users', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "✅ Test Users Created",
          description: `Successfully set up ${data.users.length} test users for E2E testing`,
        });
        
        console.log('✅ Test users setup completed:', data.users);
        onComplete();
      } else {
        throw new Error(data.error || 'Failed to setup test users');
      }
      
    } catch (error) {
      console.error('Error setting up test users:', error);
      toast({
        title: "❌ Setup Failed",
        description: error.message || "Failed to create test users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupTestUsers = async () => {
    setLoading(true);
    try {
      console.log('🧹 Cleaning up test users...');
      
      const { data, error } = await supabase.functions.invoke('setup-test-users', {
        body: { action: 'cleanup' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "✅ Test Users Cleaned",
          description: `Successfully cleaned up ${data.results.length} test users`,
        });
        
        console.log('✅ Test users cleanup completed:', data.results);
      } else {
        throw new Error(data.error || 'Failed to cleanup test users');
      }
      
    } catch (error) {
      console.error('Error cleaning up test users:', error);
      toast({
        title: "❌ Cleanup Failed",
        description: error.message || "Failed to clean up test users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">🧪 E2E Test Users Setup</h3>
      
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">The following test users will be created:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>owner@demo.com</strong> - OWNER role</li>
            <li><strong>team_manager@demo.com</strong> - TEAM_MANAGER role</li>
            <li><strong>artist_manager@demo.com</strong> - ARTIST_MANAGER for Rita Payés</li>
            <li><strong>artist_observer@demo.com</strong> - ARTIST_OBSERVER for Rita Payés</li>
            <li><strong>booking_editor@demo.com</strong> - EDITOR for "Gira 2025" project</li>
            <li><strong>marketing_viewer@demo.com</strong> - VIEWER for "Campaña PR" project</li>
          </ul>
          <p className="mt-2 text-xs">All users have password: <code>demo123456</code></p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={setupTestUsers} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? '⏳ Setting up...' : '🚀 Setup Test Users'}
          </Button>
          
          <Button 
            onClick={cleanupTestUsers} 
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading ? '⏳ Cleaning...' : '🧹 Cleanup Test Users'}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          ⚠️ Test users are marked with <code>is_test_user=true</code> for safe cleanup.
        </p>
      </div>
    </div>
  );
};

export default TestUserSetup;