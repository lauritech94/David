import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Mail, Phone, Building2, MapPin, Contact } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  category: string;
  city?: string;
  country?: string;
  notes?: string;
  field_config: any;
}

interface RolodexViewProps {
  contacts: Contact[];
  onClose: () => void;
}

export function RolodexView({ contacts, onClose }: RolodexViewProps) {
  // Sort contacts alphabetically by name
  const sortedContacts = [...contacts].sort((a, b) => {
    const nameA = (a.stage_name || a.name).toLowerCase();
    const nameB = (b.stage_name || b.name).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const wheelTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  const handleNext = (steps: number = 1) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setDirection('next');
    setCurrentIndex((prev) => (prev + steps) % sortedContacts.length);
    
    // Reset transition lock after animation completes - 150ms for faster navigation
    setTimeout(() => setIsTransitioning(false), 150);
  };

  const handlePrev = (steps: number = 1) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setDirection('prev');
    setCurrentIndex((prev) => (prev - steps + sortedContacts.length) % sortedContacts.length);
    
    // Reset transition lock after animation completes - 150ms for faster navigation
    setTimeout(() => setIsTransitioning(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      // Jump to letter
      const targetLetter = e.key.toUpperCase();
      jumpToLetter(targetLetter);
    }
  };

  const jumpToLetter = (letter: string) => {
    // Find first contact that starts with this letter
    const targetIndex = sortedContacts.findIndex(contact => {
      const name = contact.stage_name || contact.name;
      return name.charAt(0).toUpperCase() === letter;
    });

    if (targetIndex === -1) {
      // Letter not found - show subtle message
      toast({
        description: `No hay contactos que empiecen por "${letter}"`,
        duration: 2000,
      });
      return;
    }

    // Calculate shortest path
    const totalContacts = sortedContacts.length;
    const forwardDistance = (targetIndex - currentIndex + totalContacts) % totalContacts;
    const backwardDistance = (currentIndex - targetIndex + totalContacts) % totalContacts;

    // Set direction based on shortest path
    if (forwardDistance <= backwardDistance) {
      setDirection('next');
    } else {
      setDirection('prev');
    }

    // Jump to the target index
    setCurrentIndex(targetIndex);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (isTransitioning) return;
    
    // Clear any existing timeout
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }

    // Detect scroll intensity - if deltaY is large (>100), advance by 3
    const scrollIntensity = Math.abs(e.deltaY);
    const steps = scrollIntensity > 100 ? 3 : 1;

    // Throttle wheel events to 50ms for faster navigation (6 per second max)
    wheelTimeoutRef.current = setTimeout(() => {
      if (e.deltaY > 0) {
        handleNext(steps);
      } else if (e.deltaY < 0) {
        handlePrev(steps);
      }
    }, 50);
  };

  if (sortedContacts.length === 0) return null;

  const currentContact = sortedContacts[currentIndex];
  const displayName = currentContact.stage_name || currentContact.name;
  const firstLetter = displayName.charAt(0).toUpperCase();

  // Get visible cards for stack effect - more cards for realistic effect
  const getVisibleCards = () => {
    const visible = [];
    const totalVisible = Math.min(15, sortedContacts.length);
    
    for (let i = 0; i < totalVisible; i++) {
      const index = (currentIndex + i) % sortedContacts.length;
      const contact = sortedContacts[index];
      const contactName = contact.stage_name || contact.name;
      
      visible.push({
        contact,
        offset: i,
        letter: contactName.charAt(0).toUpperCase(),
      });
    }
    return visible;
  };

  return (
    <div
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      tabIndex={0}
      style={{ overflow: 'hidden' }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      <div className="relative w-full max-w-4xl">
        {/* Navigation Info */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Contact className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Fichero de Contactos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} de {sortedContacts.length} contactos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Usa ← → o scroll para navegar
          </p>
        </div>

        {/* Rolodex Container */}
        <div className="relative h-[550px] flex items-center justify-center">
          {/* Base/Stand */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-4 bg-gradient-to-b from-border to-border/50 rounded-full blur-sm" />
          
          {/* Card Stack with 3D perspective */}
          <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '2000px' }}>
            {getVisibleCards().map(({ contact, offset, letter }) => {
              const isActive = offset === 0;
              const displayName = contact.stage_name || contact.name;
              
              // Calculate rotation and position for rolodex effect
              const rotationY = offset * -8; // Cards rotate back
              const translateZ = -offset * 40; // Cards go back in depth
              const translateY = offset * 3; // Slight downward tilt
              const scale = 1 - offset * 0.03;
              const opacity = Math.max(0.1, 1 - offset * 0.15);

              return (
                <div
                  key={contact.id}
                  className={cn(
                    "absolute transition-all duration-500 ease-out",
                    isActive ? "z-20" : "pointer-events-none",
                  )}
                  style={{
                    transform: `
                      translateY(${translateY}px)
                      rotateY(${rotationY}deg)
                      translateZ(${translateZ}px)
                      scale(${scale})
                    `,
                    transformStyle: 'preserve-3d',
                    opacity,
                    zIndex: 100 - offset,
                  }}
                >
                  {/* Card Container */}
                  <div className="relative w-[400px]">
                    {/* Alphabet Tab - visible on active and back cards */}
                    <div 
                      className={cn(
                        "absolute right-8 w-16 h-12 bg-gradient-to-b from-primary to-primary/80 rounded-t-lg flex items-center justify-center shadow-lg z-10",
                        isActive ? "-top-12" : "-top-8"
                      )}
                      style={{
                        transform: isActive ? 'translateZ(30px)' : 'translateZ(20px)',
                      }}
                    >
                      <span className="text-xl font-bold text-primary-foreground">
                        {letter}
                      </span>
                    </div>

                    {/* Business Card */}
                    <div 
                      className={cn(
                        "bg-card border-2 rounded-lg shadow-2xl overflow-hidden",
                        isActive ? "border-primary" : "border-border"
                      )}
                      style={{
                        boxShadow: isActive 
                          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 2px hsl(var(--primary))' 
                          : '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {/* Card Header with gradient */}
                      <div className="h-4 bg-gradient-to-r from-primary via-primary/80 to-primary" />
                      
                      <div className="p-8 space-y-5 bg-card min-h-[320px]">
                        {/* Name Section */}
                        <div className="border-b pb-4">
                          <h2 className="text-2xl font-bold text-foreground leading-tight">
                            {displayName}
                          </h2>
                          {contact.stage_name && contact.name !== contact.stage_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {contact.name}
                            </p>
                          )}
                        </div>

                        {/* Role & Company */}
                        <div className="space-y-2">
                          {contact.role && (
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                              {contact.role}
                            </Badge>
                          )}
                          {contact.company && contact.field_config?.company && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building2 className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm">{contact.company}</span>
                            </div>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2.5">
                          {contact.email && contact.field_config?.email && (
                            <div className="flex items-center gap-2.5">
                              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-xs hover:text-primary transition-colors truncate"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && contact.field_config?.phone && (
                            <div className="flex items-center gap-2.5">
                              <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-xs hover:text-primary transition-colors"
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )}
                          {contact.city && (
                            <div className="flex items-center gap-2.5">
                              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {contact.city}{contact.country && `, ${contact.country}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {contact.notes && contact.field_config?.notes && isActive && (
                          <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground italic line-clamp-2">
                              {contact.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="h-3 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <Button
            size="lg"
            variant="outline"
            onClick={() => handlePrev()}
            className="rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-shadow"
          >
            <ChevronLeft className="h-7 w-7" />
          </Button>
          
          <div className="px-8 py-3 bg-primary text-primary-foreground rounded-full shadow-lg">
            <span className="text-2xl font-bold">
              {firstLetter}
            </span>
          </div>

          <Button
            size="lg"
            variant="outline"
            onClick={() => handleNext()}
            className="rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-shadow"
          >
            <ChevronRight className="h-7 w-7" />
          </Button>
        </div>

        {/* Quick Jump Dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {sortedContacts.slice(0, Math.min(20, sortedContacts.length)).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 'next' : 'prev');
                setCurrentIndex(idx);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === currentIndex
                  ? "bg-primary w-10"
                  : "bg-muted hover:bg-muted-foreground/50"
              )}
            />
          ))}
          {sortedContacts.length > 20 && (
            <span className="text-xs text-muted-foreground ml-2">
              +{sortedContacts.length - 20}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
