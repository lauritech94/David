import React, { useState, useRef, useEffect } from 'react';
import { TeamMemberCard, MemberType } from './TeamMemberCard';

interface Position {
  x: number;
  y: number;
}

const GRID_SNAP_SIZE = 24; // Matches background dot-grid size

const snapToGrid = (pos: Position): Position => ({
  x: Math.round(pos.x / GRID_SNAP_SIZE) * GRID_SNAP_SIZE,
  y: Math.round(pos.y / GRID_SNAP_SIZE) * GRID_SNAP_SIZE,
});

interface DraggableMemberCardProps {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  type: MemberType;
  position: Position;
  onPositionChange: (position: Position) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onEditRole?: () => void;
  onCategoryChange?: (category: string) => void;
  onToggleCategory?: (category: string) => void;
  categories?: Array<{ value: string; label: string }>;
  currentCategory?: string;
  memberCategories?: string[];
  showActions?: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function DraggableMemberCard({
  id,
  name,
  email,
  role,
  avatarUrl,
  type,
  position,
  onPositionChange,
  onClick,
  onDoubleClick,
  onEdit,
  onRemove,
  onEditRole,
  onCategoryChange,
  onToggleCategory,
  categories,
  currentCategory,
  memberCategories,
  showActions,
  containerRef,
  selectable,
  selected,
  onSelect,
}: DraggableMemberCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState<Position>(position);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag from buttons or dropdown
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('[role="menu"]')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('[role="menu"]')) {
      return;
    }

    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - currentPosition.x,
      y: touch.clientY - currentPosition.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const elementWidth = elementRef.current?.offsetWidth || 120;
      const elementHeight = elementRef.current?.offsetHeight || 100;

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      // Constrain to container bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - elementWidth));
      newY = Math.max(0, Math.min(newY, containerRect.height - elementHeight));

      setCurrentPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const touch = e.touches[0];
      const containerRect = containerRef.current.getBoundingClientRect();
      const elementWidth = elementRef.current?.offsetWidth || 120;
      const elementHeight = elementRef.current?.offsetHeight || 100;

      let newX = touch.clientX - dragStart.x;
      let newY = touch.clientY - dragStart.y;

      // Constrain to container bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - elementWidth));
      newY = Math.max(0, Math.min(newY, containerRect.height - elementHeight));

      setCurrentPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        const snappedPosition = snapToGrid(currentPosition);
        setCurrentPosition(snappedPosition);
        onPositionChange(snappedPosition);
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        const snappedPosition = snapToGrid(currentPosition);
        setCurrentPosition(snappedPosition);
        onPositionChange(snappedPosition);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart, currentPosition, onPositionChange, containerRef]);

  return (
    <div
      ref={elementRef}
      className={`absolute transition-shadow select-none ${
        isDragging 
          ? 'z-50 shadow-2xl scale-105 cursor-grabbing' 
          : 'z-10 cursor-grab hover:z-20'
      }`}
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isDragging && onDoubleClick) {
          onDoubleClick();
        }
      }}
    >
      <TeamMemberCard
        id={id}
        name={name}
        email={email}
        role={role}
        avatarUrl={avatarUrl}
        type={type}
        onClick={isDragging ? undefined : onClick}
        onEdit={onEdit}
        onRemove={onRemove}
        onEditRole={onEditRole}
        onCategoryChange={onCategoryChange}
        onToggleCategory={onToggleCategory}
        categories={categories}
        currentCategory={currentCategory}
        memberCategories={memberCategories}
        showActions={showActions}
        selectable={selectable}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  );
}
