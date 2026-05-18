import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Link, Truck } from 'lucide-react';
import { BookingReminder } from '@/hooks/useBookingReminders';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';

interface ReminderBadgeProps {
  reminders: BookingReminder[];
  variant?: 'default' | 'compact';
}

export function ReminderBadge({ reminders, variant = 'default' }: ReminderBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (reminders.length === 0) return null;

  const getIcon = (type: BookingReminder['type']) => {
    switch (type) {
      case 'contract':
        return <FileText className="h-3 w-3" />;
      case 'sales_link':
        return <Link className="h-3 w-3" />;
      case 'logistics':
        return <Truck className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getVariantColor = (priority: BookingReminder['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (variant === 'compact') {
    const highPriorityCount = reminders.filter(r => r.priority === 'high').length;
    const totalCount = reminders.length;
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Badge 
            variant={highPriorityCount > 0 ? 'destructive' : 'secondary'} 
            className="text-xs cursor-pointer hover:opacity-80"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            {totalCount}
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recordatorios</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`p-1 rounded ${
                  reminder.priority === 'high' ? 'bg-destructive/10 text-destructive' : 
                  reminder.priority === 'medium' ? 'bg-secondary text-secondary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {getIcon(reminder.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {reminder.type === 'contract' && 'Contrato'}
                    {reminder.type === 'sales_link' && 'Link de venta'}
                    {reminder.type === 'logistics' && 'Logística'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reminder.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {reminder.daysUntilEvent} días hasta el evento
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex flex-wrap gap-1 cursor-pointer">
          {reminders.map((reminder) => (
            <Badge
              key={reminder.id}
              variant={getVariantColor(reminder.priority)}
              className="text-xs flex items-center gap-1 hover:opacity-80"
            >
              {getIcon(reminder.type)}
              <span className="hidden sm:inline">
                {reminder.type === 'contract' && 'Contrato'}
                {reminder.type === 'sales_link' && 'Link venta'}
                {reminder.type === 'logistics' && 'Logística'}
              </span>
            </Badge>
          ))}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recordatorios</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`p-1 rounded ${
                reminder.priority === 'high' ? 'bg-destructive/10 text-destructive' : 
                reminder.priority === 'medium' ? 'bg-secondary text-secondary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {getIcon(reminder.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {reminder.type === 'contract' && 'Contrato'}
                  {reminder.type === 'sales_link' && 'Link de venta'}
                  {reminder.type === 'logistics' && 'Logística'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {reminder.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reminder.daysUntilEvent} días hasta el evento
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}