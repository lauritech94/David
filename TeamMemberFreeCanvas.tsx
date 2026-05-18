import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DraggableMemberCard } from './DraggableMemberCard';
import { MemberType } from './TeamMemberCard';
import { Button } from '@/components/ui/button';
import { RotateCcw, Save, LayoutGrid } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Position {
  x: number;
  y: number;
}

interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  type: MemberType;
  currentCategory?: string;
  rawData?: any;
}

interface TeamMemberFreeCanvasProps {
  members: Member[];
  onMemberClick?: (member: Member) => void;
  onMemberDoubleClick?: (member: Member) => void;
  onMemberEdit?: (member: Member) => void;
  onMemberRemove?: (member: Member) => void;
  onMemberEditRole?: (member: Member) => void;
  onCategoryChange?: (memberId: string, newCategory: string) => void;
  onToggleCategory?: (memberId: string, category: string) => void;
  getMemberCategories?: (member: Member) => string[];
  categories?: Array<{ value: string; label: string }>;
  showActions?: boolean;
  /** Context key to separate position storage (e.g., artistId or 'all') */
  contextKey?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

const STORAGE_KEY_PREFIX = 'team_member_positions';
const DEFAULT_KEY_PREFIX = 'team_member_positions_default';
const CARD_WIDTH = 120;
const CARD_HEIGHT = 100;
const GRID_COLS = 6;
const GRID_PADDING = 20;
const GRID_GAP = 16;
const MIN_CANVAS_WIDTH = 1200;
const MIN_CANVAS_HEIGHT = 600;
const CANVAS_EXPAND_BUFFER = 200;

const getStorageKey = (contextKey: string) => `${STORAGE_KEY_PREFIX}_${contextKey}`;
const getDefaultKey = (contextKey: string) => `${DEFAULT_KEY_PREFIX}_${contextKey}`;

const loadPositions = (contextKey: string): Record<string, Position> => {
  try {
    const stored = localStorage.getItem(getStorageKey(contextKey));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const loadDefaultPositions = (contextKey: string): Record<string, Position> | null => {
  try {
    const stored = localStorage.getItem(getDefaultKey(contextKey));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const savePosition = (contextKey: string, memberId: string, position: Position) => {
  const stored = loadPositions(contextKey);
  stored[memberId] = position;
  localStorage.setItem(getStorageKey(contextKey), JSON.stringify(stored));
};

const clearAllPositions = (contextKey: string) => {
  localStorage.removeItem(getStorageKey(contextKey));
};

// Calculate initial grid position for a member without saved position
const calculateInitialPosition = (index: number): Position => {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  
  return {
    x: GRID_PADDING + col * (CARD_WIDTH + GRID_GAP),
    y: GRID_PADDING + row * (CARD_HEIGHT + GRID_GAP),
  };
};

export function TeamMemberFreeCanvas({
  members,
  onMemberClick,
  onMemberDoubleClick,
  onMemberEdit,
  onMemberRemove,
  onMemberEditRole,
  onCategoryChange,
  onToggleCategory,
  getMemberCategories,
  categories = [],
  showActions = true,
  contextKey = 'default',
  selectable = false,
  selectedIds = new Set(),
  onSelect,
}: TeamMemberFreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  
  // Load saved positions on mount and calculate initial positions for new members
  useEffect(() => {
    const savedPositions = loadPositions(contextKey);
    const newPositions: Record<string, Position> = {};
    
    members.forEach((member, index) => {
      if (savedPositions[member.id]) {
        newPositions[member.id] = savedPositions[member.id];
      } else {
        // Calculate grid position for new members
        const position = calculateInitialPosition(index);
        newPositions[member.id] = position;
        // Save the initial position
        savePosition(contextKey, member.id, position);
      }
    });
    
    setPositions(newPositions);
  }, [members, contextKey]);

  // Handle position change from drag
  const handlePositionChange = (memberId: string, position: Position) => {
    setPositions(prev => ({
      ...prev,
      [memberId]: position,
    }));
    savePosition(contextKey, memberId, position);
  };

  // Reset positions to saved default or grid
  const handleResetPositions = () => {
    const defaultPositions = loadDefaultPositions(contextKey);
    
    if (defaultPositions) {
      // Restore to saved default
      clearAllPositions(contextKey);
      const newPositions: Record<string, Position> = {};
      members.forEach((member, index) => {
        const pos = defaultPositions[member.id] || calculateInitialPosition(index);
        newPositions[member.id] = pos;
        savePosition(contextKey, member.id, pos);
      });
      setPositions(newPositions);
      toast({ title: "Posiciones restauradas", description: "Se restauró la disposición predeterminada." });
    } else {
      // No default saved, reset to grid
      clearAllPositions(contextKey);
      const newPositions: Record<string, Position> = {};
      members.forEach((member, index) => {
        const position = calculateInitialPosition(index);
        newPositions[member.id] = position;
        savePosition(contextKey, member.id, position);
      });
      setPositions(newPositions);
    }
  };

  // Save current positions as default
  const handleSaveAsDefault = () => {
    localStorage.setItem(getDefaultKey(contextKey), JSON.stringify(positions));
    toast({ title: "Guardado", description: "Disposición guardada como predeterminada." });
  };

  // Reset to auto-grid (original layout)
  const handleResetToGrid = () => {
    clearAllPositions(contextKey);
    const newPositions: Record<string, Position> = {};
    members.forEach((member, index) => {
      const position = calculateInitialPosition(index);
      newPositions[member.id] = position;
      savePosition(contextKey, member.id, position);
    });
    setPositions(newPositions);
    toast({ title: "Reorganizado", description: "Disposición original en cuadrícula." });
  };

  const hasDefaultSaved = loadDefaultPositions(contextKey) !== null;

  // Calculate canvas dimensions based on member positions (dynamic expansion)
  const canvasDimensions = useMemo(() => {
    if (Object.keys(positions).length === 0) {
      const rows = Math.ceil(members.length / GRID_COLS);
      return {
        width: MIN_CANVAS_WIDTH,
        height: Math.max(MIN_CANVAS_HEIGHT, rows * (CARD_HEIGHT + GRID_GAP) + GRID_PADDING * 2),
      };
    }
    
    const maxX = Math.max(...Object.values(positions).map(p => p.x));
    const maxY = Math.max(...Object.values(positions).map(p => p.y));
    
    return {
      width: Math.max(MIN_CANVAS_WIDTH, maxX + CARD_WIDTH + CANVAS_EXPAND_BUFFER),
      height: Math.max(MIN_CANVAS_HEIGHT, maxY + CARD_HEIGHT + CANVAS_EXPAND_BUFFER),
    };
  }, [positions, members.length]);

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveAsDefault}
          className="text-muted-foreground hover:text-foreground"
        >
          <Save className="h-4 w-4 mr-2" />
          Guardar como predeterminado
        </Button>
        {hasDefaultSaved && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetPositions}
            className="text-muted-foreground hover:text-foreground"
            title="Restaurar disposición predeterminada"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar predeterminado
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToGrid}
          className="text-muted-foreground hover:text-foreground"
          title="Reorganizar en cuadrícula automática"
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Reorganizar original
        </Button>
      </div>
      
      {/* Scrollable Canvas Container */}
      <div 
        className="overflow-auto border rounded-lg bg-muted/20" 
        style={{ 
          maxHeight: '70vh',
          overscrollBehavior: 'contain',
        }}
        onWheel={(e) => {
          // Prevent browser back navigation on horizontal scroll
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault();
          }
        }}
      >
        <div
          ref={containerRef}
          className="relative"
          style={{ 
            width: canvasDimensions.width,
            height: canvasDimensions.height,
            backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
        {members.map((member) => {
          const position = positions[member.id] || { x: 0, y: 0 };
          
          return (
            <DraggableMemberCard
              key={member.id}
              id={member.id}
              name={member.name}
              email={member.email}
              role={member.role}
              avatarUrl={member.avatarUrl}
              type={member.type}
              position={position}
              onPositionChange={(pos) => handlePositionChange(member.id, pos)}
              onClick={() => onMemberClick?.(member)}
              onDoubleClick={() => onMemberDoubleClick?.(member)}
              onEdit={() => onMemberEdit?.(member)}
              onRemove={() => onMemberRemove?.(member)}
              onEditRole={() => onMemberEditRole?.(member)}
              onCategoryChange={onCategoryChange ? (cat) => onCategoryChange(member.id, cat) : undefined}
              onToggleCategory={onToggleCategory ? (cat) => onToggleCategory(member.id, cat) : undefined}
              memberCategories={getMemberCategories ? getMemberCategories(member) : []}
              categories={categories}
              currentCategory={member.currentCategory}
              showActions={showActions}
              containerRef={containerRef}
              selectable={selectable}
              selected={selectedIds.has(member.id)}
              onSelect={onSelect}
            />
          );
        })}
        </div>
      </div>
    </div>
  );
}
