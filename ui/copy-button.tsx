import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/utils/exportUtils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label?: string;
  successMessage?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export function CopyButton({ 
  text, 
  label, 
  successMessage = 'Copiado al portapapeles',
  variant = 'outline',
  size = 'sm',
  className,
  showText = false
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    
    if (success) {
      setIsCopied(true);
      toast({
        title: "Copiado",
        description: successMessage,
      });
      
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("flex items-center gap-2", className)}
    >
      {isCopied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {showText && (label || (isCopied ? 'Copiado' : 'Copiar'))}
    </Button>
  );
}