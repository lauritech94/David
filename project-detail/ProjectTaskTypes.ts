import type { ResponsibleRef } from '@/components/releases/ResponsibleSelector';

export type ProjectSubtaskType = 'full' | 'checkbox' | 'note' | 'comment';

export interface ProjectCommentMessage {
  id: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface ProjectSubtask {
  id: string;
  name: string;
  type: ProjectSubtaskType;
  // Full subtask
  responsible_ref?: ResponsibleRef | null;
  status?: string;
  // Checkbox
  completed?: boolean;
  // Note
  content?: string;
  directedTo?: ResponsibleRef | null;
  // Comment thread
  thread?: ProjectCommentMessage[];
  resolved?: boolean;
}
