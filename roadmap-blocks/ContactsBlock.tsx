import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Phone, Mail, MapPin, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  origin: string;
}

interface ContactsBlockData {
  contacts?: Contact[];
}

interface ContactsBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

interface InlineEditCellProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function InlineEditCell({ value, onChange, placeholder, className }: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className="h-7 text-sm"
        />
      </div>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors min-w-[20px] inline-block ${className}`}
    >
      {value || <span className="text-muted-foreground italic">{placeholder || '—'}</span>}
    </span>
  );
}

export function ContactsBlock({ data, onChange }: ContactsBlockProps) {
  const blockData = data as ContactsBlockData;
  const incomingContacts = blockData.contacts || [];

  const [localContacts, setLocalContacts] = useState<Contact[]>(incomingContacts);
  
  const lastSyncedRef = useRef<string>(JSON.stringify(incomingContacts));
  const debouncedContacts = useDebounce(localContacts, 500);

  useEffect(() => {
    const next = JSON.stringify(incomingContacts);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalContacts(incomingContacts);
    }
  }, [incomingContacts]);

  useEffect(() => {
    const next = JSON.stringify(debouncedContacts);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, contacts: debouncedContacts });
    }
  }, [debouncedContacts]);

  const addContact = () => {
    const newContact: Contact = { 
      id: crypto.randomUUID(), 
      name: '', 
      role: '', 
      phone: '', 
      email: '', 
      origin: '' 
    };
    setLocalContacts((prev) => [...prev, newContact]);
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setLocalContacts((prev) => 
      prev.map((c) => c.id === id ? { ...c, [field]: value } : c)
    );
  };

  const removeContact = (id: string) => {
    setLocalContacts((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4">
      {localContacts.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 p-3 bg-muted/50 font-medium text-sm">
            <div>NOMBRE</div>
            <div>ROL</div>
            <div>TELÉFONO</div>
            <div>EMAIL</div>
            <div></div>
          </div>
          <div className="divide-y">
            {localContacts.map((contact) => (
              <div key={contact.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 p-3 items-center hover:bg-muted/30 group">
                <div className="flex flex-col gap-1">
                  <InlineEditCell
                    value={contact.name}
                    onChange={(v) => updateContact(contact.id, 'name', v)}
                    placeholder="Nombre"
                    className="font-medium"
                  />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <InlineEditCell
                      value={contact.origin}
                      onChange={(v) => updateContact(contact.id, 'origin', v)}
                      placeholder="Ciudad"
                    />
                  </div>
                </div>
                <div>
                  <InlineEditCell
                    value={contact.role}
                    onChange={(v) => updateContact(contact.id, 'role', v)}
                    placeholder="Sin rol"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                  <InlineEditCell
                    value={contact.phone}
                    onChange={(v) => updateContact(contact.id, 'phone', v)}
                    placeholder="+34..."
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                  <InlineEditCell
                    value={contact.email}
                    onChange={(v) => updateContact(contact.id, 'email', v)}
                    placeholder="email@..."
                  />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive hover:text-destructive" 
                    onClick={() => removeContact(contact.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          No hay contactos configurados
        </div>
      )}
      <Button onClick={addContact} variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />
        Añadir Contacto
      </Button>
    </div>
  );
}
