import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectProgressDisplayProps {
  projectId: string;
  viewMode: 'estados' | 'porcentajes';
  status: string;
}

export function ProjectProgressDisplay({ projectId, viewMode, status }: ProjectProgressDisplayProps) {
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (viewMode !== 'porcentajes') {
        setLoading(false);
        return;
      }

      try {
        const { data: checklistItems, error } = await supabase
          .from('project_checklist_items')
          .select('id, is_completed')
          .eq('project_id', projectId);
          
        if (error || !checklistItems || checklistItems.length === 0) {
          setProgress(0);
        } else {
          const completedItems = checklistItems.filter(item => item.is_completed).length;
          setProgress(Math.round((completedItems / checklistItems.length) * 100));
        }
      } catch (error) {
        console.error('Error calculating progress:', error);
        setProgress(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [projectId, viewMode]);

  if (viewMode === 'porcentajes') {
    if (loading) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
          ...
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
        {progress}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-primary/10 text-primary">
      {status.replace('_', ' ')}
    </span>
  );
}