import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  disabled?: boolean;
  displayComponent?: (value: string) => React.ReactNode;
}

export function InlineEdit({
  value,
  onSave,
  placeholder,
  className,
  multiline = false,
  disabled = false,
  displayComponent
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [originalValue, setOriginalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
    setOriginalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    if (editValue === originalValue || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(editValue);
      setOriginalValue(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving:', error);
      setEditValue(originalValue); // Rollback
      toast({
        title: "Error",
        description: "No se pudo guardar el cambio",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editValue, originalValue, onSave, isSaving]);


  const handleCancel = () => {
    setEditValue(originalValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <span className={className}>
        {displayComponent ? displayComponent(value) : value || placeholder}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <div 
        className={cn(
          "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors min-h-[32px] flex items-center",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        {displayComponent ? displayComponent(value) : (value || (
          <span className="text-muted-foreground italic">{placeholder}</span>
        ))}
      </div>
    );
  }

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className={cn("relative", className)}>
      <InputComponent
        ref={inputRef as any}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        placeholder={placeholder}
        className={cn(
          "min-h-[32px]",
          multiline && "min-h-[80px] resize-none"
        )}
        disabled={isSaving}
      />
      {isSaving && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// Simple inline edit cell for roadmap blocks (synchronous updates)
interface InlineEditCellProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'time';
}

export function InlineEditCell({ value, onChange, placeholder, className, type = 'text' }: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = () => {
    onChange(localValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        placeholder={placeholder}
        className={cn("h-7 text-sm", type === 'time' && "w-24", className)}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors min-w-[20px] inline-block",
        className
      )}
    >
      {value || <span className="text-muted-foreground italic">{placeholder || '—'}</span>}
    </span>
  );
}

interface InlineSelectCellProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  placeholder?: string;
  className?: string;
  renderValue?: (option: { value: string; label: string; icon?: React.ComponentType<{ className?: string }> } | undefined) => React.ReactNode;
}

export function InlineSelectCell({ value, onChange, options, placeholder, className, renderValue }: InlineSelectCellProps) {
  const selectedOption = options.find(o => o.value === value);
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-7 text-sm border-0 bg-transparent hover:bg-muted/50 focus:ring-0 px-1", className)}>
        {renderValue ? renderValue(selectedOption) : <SelectValue placeholder={placeholder} />}
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              {opt.icon && <opt.icon className="w-3 h-3" />}
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface InlineCheckboxCellProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function InlineCheckboxCell({ checked, onChange, label, className }: InlineCheckboxCellProps) {
  return (
    <div className={cn("flex items-center gap-2 cursor-pointer", className)} onClick={() => onChange(!checked)}>
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}