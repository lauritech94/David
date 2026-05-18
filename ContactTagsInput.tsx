import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ContactTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function ContactTagsInput({ 
  value = [], 
  onChange, 
  placeholder = "Añadir etiqueta...",
  label = "Etiquetas",
  className 
}: ContactTagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all existing tags for autocomplete
  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('tags')
        .not('tags', 'is', null);
      
      if (data) {
        const tagSet = new Set<string>();
        data.forEach(contact => {
          const tags = contact.tags as string[] | null;
          if (tags) {
            tags.forEach(tag => tagSet.add(tag.toLowerCase()));
          }
        });
        setAllTags(Array.from(tagSet).sort());
      }
    };
    fetchTags();
  }, []);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = allTags.filter(
        tag => tag.includes(inputValue.toLowerCase()) && !value.includes(tag)
      );
      setSuggestions(filtered.slice(0, 8));
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, allTags, value]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim().replace(/^#/, '');
    if (normalizedTag && !value.includes(normalizedTag)) {
      onChange([...value, normalizedTag]);
      // Add to allTags for future suggestions
      if (!allTags.includes(normalizedTag)) {
        setAllTags(prev => [...prev, normalizedTag].sort());
      }
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Group tags by type for visual distinction
  const getTagColor = (tag: string): string => {
    // Location-related tags
    if (['madrid', 'barcelona', 'paris', 'london', 'berlin', 'tokyo', 'japan', 'argentina', 'mexico', 'usa', 'uk', 'spain', 'france', 'germany'].some(loc => tag.includes(loc))) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    }
    // Profession-related tags
    if (['prensa', 'tourmanager', 'productora', 'productor', 'ingeniero', 'tecnico', 'manager', 'booking', 'promotor', 'agente'].some(prof => tag.includes(prof))) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-700';
    }
    // Company/festival tags
    if (['festival', 'sala', 'venue', 'label', 'sello', 'agency', 'agencia'].some(comp => tag.includes(comp))) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700';
    }
    // Default
    return 'bg-secondary text-secondary-foreground border-border';
  };

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      {label && <Label>{label}</Label>}
      
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map(tag => (
          <Badge
            key={tag}
            variant="outline"
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 text-xs font-medium",
              getTagColor(tag)
            )}
          >
            <Hash className="w-3 h-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setSuggestions.length > 0 && setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
        />
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full max-w-xs mt-1 bg-popover border rounded-md shadow-lg">
          <div className="p-1">
            <p className="px-2 py-1 text-xs text-muted-foreground">Sugerencias</p>
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm text-left"
              >
                <Hash className="w-3 h-3 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Escribe y pulsa Enter, espacio o coma para añadir. Ej: #prensa #paris #sonar
      </p>
    </div>
  );
}
