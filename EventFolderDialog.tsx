import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Link, FileText, Upload, Download, Image, FileBarChart, FileSignature, Clock, Share2, Copy, AlertTriangle, ChevronDown, Folder, Home, ChevronRight, X, Send, Bot, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useBookingFolders } from '@/hooks/useBookingFolders';
import CreateBudgetDialog from './CreateBudgetDialog';
import { useAuth } from '@/hooks/useAuth';

interface BookingOffer {
  id: string;
  fecha?: string;
  ciudad?: string;
  festival_ciclo?: string;
  lugar?: string;
  formato?: string;
  estado?: string;
  capacidad?: number;
  oferta?: string;
  contacto?: string;
}

interface EventFile {
  name: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  subfolder?: string;
}

interface EventFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: BookingOffer | null;
}

export function EventFolderDialog({ open, onOpenChange, offer }: EventFolderDialogProps) {
  const { profile } = useAuth();
  const { generateFolderName, generateSendingsShareLink, checkContractExists } = useBookingFolders();
  const [loading, setLoading] = useState(false);
  const [folderContents, setFolderContents] = useState<Record<string, EventFile[]>>({});
  const [showCreateBudgetDialog, setShowCreateBudgetDialog] = useState(false);
  const [recentFiles, setRecentFiles] = useState<EventFile[]>([]);
  const [sendingsShareLink, setSendingsShareLink] = useState<string | null>(null);
  const [hasContract, setHasContract] = useState(false);
  const [currentSubfolder, setCurrentSubfolder] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [citeSources, setCiteSources] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [aiConversation, setAiConversation] = useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    sources?: Array<{
      fileName: string;
      subfolder: string;
      pageNumber?: number;
      confidence: number;
      type: string;
      filePath: string;
      content: string;
    }>;
    timestamp: Date;
  }>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [eventSummaryExpanded, setEventSummaryExpanded] = useState(true);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{
    totalDocuments: number;
    processedDocuments: number;
    totalFragmentsSaved?: number;
    lastIndexed: string | null;
    status: string;
    warning?: string | null;
    stats?: {
      PDF?: { processed: number; skipped: number; errors: number };
      DOC?: { processed: number; skipped: number; errors: number };
      XLS?: { processed: number; skipped: number; errors: number };
      TXT?: { processed: number; skipped: number; errors: number };
      CSV?: { processed: number; skipped: number; errors: number };
      JSON?: { processed: number; skipped: number; errors: number };
      IMAGE?: { processed: number; skipped: number; errors: number };
      OTHER?: { processed: number; skipped: number; errors: number };
    };
    processingSummary?: Array<{
      type: string;
      processed: number;
      skipped: number;
      errors: number;
      total: number;
    }>;
  }>({
    totalDocuments: 0,
    processedDocuments: 0,
    totalFragmentsSaved: 0,
    lastIndexed: null,
    status: 'idle'
  });

  const subfolders = ['Assets', 'Facturas', 'Contrato', 'Agente IA'];

  const normalizeFileName = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  useEffect(() => {
    if (open && offer) {
      loadFolderContents();
      checkContractStatus();
      loadIndexStatus();
    }
  }, [open, offer]);

  const loadFolderContents = async () => {
    if (!offer) return;

    setLoading(true);
    try {
      const folderName = generateFolderName(offer);
      const contents: Record<string, EventFile[]> = {};

      // Load contents for each subfolder
      for (const subfolder of subfolders) {
        const { data, error } = await supabase.storage
          .from('documents')
          .list(`events/${folderName}/${subfolder}`, {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) {
          console.error(`Error loading ${subfolder}:`, error);
          contents[subfolder] = [];
        } else {
          // Filter out .keep files
          contents[subfolder] = (data || []).filter(file => file.name !== '.keep');
        }
      }

      setFolderContents(contents);
      
      // Collect all files for recent files panel
      const allFiles: EventFile[] = [];
      Object.entries(contents).forEach(([subfolder, files]) => {
        files.forEach(file => {
          allFiles.push({ ...file, subfolder });
        });
      });
      
      // Sort by creation date and take the 10 most recent
      const sortedFiles = allFiles
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      setRecentFiles(sortedFiles);
    } catch (error) {
      console.error('Error loading folder contents:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el contenido de la carpeta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkContractStatus = async () => {
    if (!offer) return;
    
    try {
      const contractExists = await checkContractExists(offer);
      setHasContract(contractExists);
    } catch (error) {
      console.error('Error checking contract status:', error);
    }
  };

  const handleFileUpload = async (subfolder: string, file: File) => {
    if (!offer) return;

    // Contract replacement confirmation
    if (subfolder === 'Contrato' && hasContract) {
      const confirm = window.confirm('Ya existe un contrato en esta carpeta. ¿Deseas reemplazarlo?');
      if (!confirm) return;
    }

    // Set upload progress
    setUploadProgress(prev => ({ ...prev, [subfolder]: 0 }));

    try {
      const folderName = generateFolderName(offer);
      const normalizedFileName = normalizeFileName(file.name);
      const filePath = `events/${folderName}/${subfolder}/${normalizedFileName}`;

      // Simulate progress for user feedback
      setUploadProgress(prev => ({ ...prev, [subfolder]: 50 }));

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      setUploadProgress(prev => ({ ...prev, [subfolder]: 100 }));

      toast({
        title: "Archivo subido",
        description: `${file.name} se ha subido a ${subfolder}.`,
      });

      await loadFolderContents();
      
      // Update contract field if uploading to Contrato folder
      if (subfolder === 'Contrato') {
        await updateBookingContract(normalizedFileName);
        await checkContractStatus();
        // Trigger auto-reindex for contract uploads
        triggerAutoReindex();
      } else if (subfolder === 'Facturas') {
        // Trigger auto-reindex for invoice uploads
        triggerAutoReindex();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo.",
        variant: "destructive",
      });
    } finally {
      // Clear progress after 1 second
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[subfolder];
          return newProgress;
        });
      }, 1000);
    }
  };

  const handleQuickUpload = async (subfolder: string, enableDragDrop = false) => {
    if (!offer) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    // Allow any file type for Assets, Facturas, and Contrato
    if (['Assets', 'Facturas', 'Contrato'].includes(subfolder)) {
      input.accept = '*/*';
    }
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (const file of Array.from(files)) {
          await handleFileUpload(subfolder, file);
        }
      }
    };
    input.click();
  };

  const updateBookingContract = async (fileName: string) => {
    if (!offer) return;

    try {
      const folderName = generateFolderName(offer);
      const fileUrl = `events/${folderName}/Contrato/${fileName}`;
      
      const { error } = await supabase
        .from('booking_offers')
        .update({ contratos: fileUrl })
        .eq('id', offer.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Contrato vinculado",
        description: "El enlace del contrato se ha actualizado en la oferta de booking.",
      });
    } catch (error) {
      console.error('Error updating booking contract:', error);
      toast({
        title: "Error",
        description: "No se pudo vincular el contrato a la oferta.",
        variant: "destructive",
      });
    }
  };

  const handleCreateBudget = () => {
    // Validate required fields
    if (!offer?.fecha || !offer?.ciudad) {
      toast({
        title: "Error de validación",
        description: "La fecha y la ciudad son requeridos para crear un presupuesto.",
        variant: "destructive",
      });
      return;
    }
    setShowCreateBudgetDialog(true);
  };

  const handleLinkBudget = () => {
    // Validate required fields
    if (!offer?.fecha || !offer?.ciudad) {
      toast({
        title: "Error de validación",
        description: "La fecha y la ciudad son requeridos para vincular un presupuesto.",
        variant: "destructive",
      });
      return;
    }
    handleQuickUpload('Agente IA');
  };

  const handleShareSendings = async () => {
    if (!offer) return;

    try {
      const shareLink = await generateSendingsShareLink(offer);
      if (shareLink) {
        setSendingsShareLink(shareLink);
        await navigator.clipboard.writeText(shareLink);
        toast({
          title: "Enlace copiado",
          description: "El enlace de la carpeta Sendings se ha copiado al portapapeles.",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo generar el enlace compartible.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sharing sendings:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace compartible.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAccess = () => {
    setSendingsShareLink(null);
    toast({
      title: "Acceso revocado",
      description: "El enlace compartible ha sido revocado.",
    });
  };

  const handleBudgetCreated = async () => {
    // When budget is created, we could potentially create a link or reference in the folder
    toast({
      title: "Presupuesto creado",
      description: "El presupuesto se ha creado y vinculado al evento.",
    });
    setShowCreateBudgetDialog(false);
    await loadFolderContents();
  };

  const downloadFile = async (subfolder: string, fileName: string) => {
    if (!offer) return;

    try {
      const folderName = generateFolderName(offer);
      const filePath = `events/${folderName}/${subfolder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="h-4 w-4 text-blue-500" />;
      case 'pdf':
        return <FileSignature className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileBarChart className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleGoToFolder = async (subfolder: string) => {
    if (!offer) return;

    // Create subfolder if it doesn't exist
    if (!folderContents[subfolder] || folderContents[subfolder].length === 0) {
      try {
        const folderName = generateFolderName(offer);
        const keepFilePath = `events/${folderName}/${subfolder}/.keep`;
        const keepContent = `# ${subfolder}\n\nEsta carpeta está destinada para ${subfolder.toLowerCase()}.`;
        const keepBlob = new Blob([keepContent], { type: 'text/plain' });

        const { error } = await supabase.storage
          .from('documents')
          .upload(keepFilePath, keepBlob, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error('Error creating subfolder:', error);
        } else {
          await loadFolderContents();
        }
      } catch (error) {
        console.error('Error creating subfolder:', error);
      }
    }

    setCurrentSubfolder(subfolder);
  };

  const handleUploadFile = (subfolder: string) => {
    if (!offer || uploadProgress[subfolder] !== undefined) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '*/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (const file of Array.from(files)) {
          await handleFileUpload(subfolder, file);
        }
      }
    };
    input.click();
  };

  const getSubfolderIcon = (subfolder: string) => {
    switch (subfolder) {
      case 'Assets':
        return <Image className="h-4 w-4" />;
      case 'Facturas':
        return <FileBarChart className="h-4 w-4" />;
      case 'Contrato':
        return <FileSignature className="h-4 w-4" />;
      case 'Agente IA':
        return <Bot className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  const handleAIItemClick = () => {
    setShowAIPanel(true);
  };

  // Helper function to detect simple intentions and respond with eventMeta
  const detectSimpleIntention = (query: string): string | null => {
    if (!offer) return null;

    const lowerQuery = query.toLowerCase().trim();
    
    // Detect "where" intentions (dónde es el concierto)
    if (lowerQuery.match(/dónde|donde|ubicación|lugar|ciudad|localización/)) {
      const location = [offer.ciudad, offer.lugar].filter(Boolean).join(', ');
      return location ? `📍 **Ubicación del concierto:**\n${location}` : null;
    }
    
    // Detect "when" intentions (cuándo es)
    if (lowerQuery.match(/cuándo|cuando|fecha|día|horario|hora/)) {
      if (offer.fecha) {
        const date = new Date(offer.fecha).toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        // TODO: Add hour if available from hora field
        return `📅 **Fecha del concierto:**\n${date}`;
      }
      return null;
    }
    
    // Detect format intentions
    if (lowerQuery.match(/formato|tipo de show|tipo de concierto/)) {
      return offer.formato ? `🎵 **Formato:**\n${offer.formato}` : null;
    }
    
    // Detect capacity intentions
    if (lowerQuery.match(/capacidad|aforo|cuánta gente|cuantas personas/)) {
      return offer.capacidad ? `👥 **Capacidad del venue:**\n${offer.capacidad} personas` : null;
    }
    
    // Detect offer/fee intentions
    if (lowerQuery.match(/oferta|caché|cachê|honorarios|precio|pago/)) {
      if (offer.oferta) {
        let response = `💰 **Oferta/Caché:**\n${offer.oferta}`;
        
        // Calculate IVA if the offer contains "+ IVA"
        if (offer.oferta.toLowerCase().includes('+ iva') || offer.oferta.toLowerCase().includes('+iva')) {
          const amountMatch = offer.oferta.match(/(\d+(?:\.?\d+)?(?:,\d+)?)/);
          if (amountMatch) {
            const amount = parseFloat(amountMatch[1].replace(',', '.'));
            if (!isNaN(amount)) {
              const withIva = amount * 1.21;
              response += `\n\n💡 **Con IVA (21%):** ${withIva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
            }
          }
        }
        
        return response;
      }
      return null;
    }
    
    // Detect status intentions
    if (lowerQuery.match(/estado|status|situación|confirmado|pendiente/)) {
      return offer.estado ? `📋 **Estado del booking:**\n${offer.estado}` : null;
    }
    
    return null;
  };

  // Helper function to detect contract-related intentions
  const detectContractIntention = (query: string): boolean => {
    const contractKeywords = [
      'contrato', 'forma de pago', 'pagos', 'transferencia', 'iban', 
      'cancelación', 'penalización', 'hospitality', 'backline'
    ];
    
    const lowerQuery = query.toLowerCase().trim();
    return contractKeywords.some(keyword => lowerQuery.includes(keyword));
  };

  const handleSendMessage = async () => {
    if (!aiMessage.trim() || isAiLoading) return;
    
    const userMessage = aiMessage.trim();
    setAiMessage('');
    setIsAiLoading(true);

    // Add user message to conversation
    const userMessageObj = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };
    setAiConversation(prev => [...prev, userMessageObj]);

    try {
      // First, try to detect simple intentions and respond with eventMeta
      const simpleResponse = detectSimpleIntention(userMessage);
      
      // Handle diagnostic command
      if (userMessage.toLowerCase().trim() === '/diagnostico' || userMessage.toLowerCase().trim() === '/diag') {
        setShowDiagnostic(true);
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant' as const,
          content: '🔍 **Modo diagnóstico activado**\n\nPuedes ver la información de diagnóstico en el panel que aparece arriba.',
          timestamp: new Date()
        };
        setAiConversation(prev => [...prev, assistantMessage]);
        return;
      }
      
      if (simpleResponse) {
        // Respond directly with eventMeta data
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant' as const,
          content: simpleResponse,
          timestamp: new Date()
        };
        setAiConversation(prev => [...prev, assistantMessage]);
        return;
      }

      // Check if it's a contract-related query
      const isContractQuery = detectContractIntention(userMessage);
      
      // If not a simple intention, search the document index
      const { data, error } = await supabase.functions.invoke('search-event-ai', {
        body: {
          eventId: offer?.id,
          query: userMessage,
          citeSources: isContractQuery ? true : citeSources, // Always cite sources for contract queries
          topK: isContractQuery ? 6 : 8,
          scope: isContractQuery ? '/Contrato' : undefined
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Handle different response scenarios
      let responseContent = '';
      let sources = [];

      if (data.sources && data.sources.length > 0) {
        // We have results from the document index
        responseContent = data.response;
        sources = (isContractQuery ? true : citeSources) ? data.sources : [];
      } else {
        // No results found in document index
        if (isContractQuery) {
          responseContent = '❌ **No encuentro esa cláusula en el contrato**\n\nNo he encontrado información sobre esa consulta en el contrato. Te recomiendo:\n• Reindexa los documentos\n• Sube el documento del contrato si falta';
        } else {
          responseContent = '❌ **No consta en los archivos del evento.**\n\nNo he encontrado información sobre esa consulta en los documentos indexados de este evento.';
        }
      }

      // Add assistant response to conversation
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: responseContent,
        sources: sources,
        timestamp: new Date()
      };
      setAiConversation(prev => [...prev, assistantMessage]);

      // Scroll to bottom
      setTimeout(() => {
        const scrollArea = document.querySelector('[data-ai-scroll-area]');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }, 100);

    } catch (error) {
      console.error('Error sending AI message:', error);
      toast({
        title: "Error",
        description: "No pude procesar tu consulta. Inténtalo de nuevo.",
        variant: "destructive",
      });

      // Add error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: '❌ **Error:** No pude procesar tu consulta. Por favor, inténtalo de nuevo.',
        timestamp: new Date()
      };
      setAiConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const quickStartChips = [
    "Fecha, ciudad y formato",
    "¿Hay contrato y condiciones clave?",
    "Resumen económico (oferta + IVA)",
    "Forma de pago",
    "Tareas pendientes antes del show"
  ];

  const handleQuickStartChip = async (chip: string) => {
    setAiMessage(chip);
    // Auto-send for quick start chips
    setTimeout(() => handleSendMessage(), 100);
  };

  const getFileTypeBadge = (type: string) => {
    const colors = {
      PDF: 'bg-red-100 text-red-800 border-red-200',
      DOC: 'bg-blue-100 text-blue-800 border-blue-200',
      XLS: 'bg-green-100 text-green-800 border-green-200',
      TXT: 'bg-gray-100 text-gray-800 border-gray-200',
      CSV: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      JSON: 'bg-purple-100 text-purple-800 border-purple-200',
      IMAGE: 'bg-pink-100 text-pink-800 border-pink-200',
      OTHER: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    return colors[type as keyof typeof colors] || colors.OTHER;
  };

  const formatPageReference = (source: any) => {
    if (source.pageNumber) {
      return `p. ${source.pageNumber}`;
    }
    if (source.fileName.includes('.xlsx') || source.fileName.includes('.xls')) {
      return 'Hoja de cálculo';
    }
    if (source.fileName.includes('.docx') || source.fileName.includes('.doc')) {
      return 'DOC sección';
    }
    return 'Archivo';
  };

  // Function to group sources by file and collapse consecutive pages
  const groupSources = (sources: any[]) => {
    const grouped = new Map();
    
    sources.forEach(source => {
      const key = `${source.fileName}_${source.subfolder}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(source);
    });

    return Array.from(grouped.entries()).map(([key, groupSources]) => {
      const sortedSources = groupSources.sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
      
      // Group consecutive pages
      const pageGroups = [];
      let currentGroup = [sortedSources[0]];
      
      for (let i = 1; i < sortedSources.length; i++) {
        const current = sortedSources[i];
        const previous = sortedSources[i - 1];
        
        if (current.pageNumber && previous.pageNumber && 
            current.pageNumber === previous.pageNumber + 1) {
          currentGroup.push(current);
        } else {
          pageGroups.push(currentGroup);
          currentGroup = [current];
        }
      }
      pageGroups.push(currentGroup);
      
      return {
        fileName: sortedSources[0].fileName,
        subfolder: sortedSources[0].subfolder,
        type: sortedSources[0].type,
        pageGroups,
        firstPageNumber: sortedSources[0].pageNumber
      };
    });
  };

  const loadIndexStatus = async () => {
    if (!offer) return;

    try {
      const { data, error } = await supabase
        .from('event_index_status')
        .select('*')
        .eq('event_id', offer.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading index status:', error);
        return;
      }

      if (data) {
        setIndexStatus({
          totalDocuments: data.total_documents,
          processedDocuments: data.processed_documents,
          totalFragmentsSaved: (data as any).metadata?.total_fragments_saved || 0,
          lastIndexed: data.last_indexed_at,
          status: data.status,
          warning: (data as any).metadata?.warning,
          stats: (data as any).metadata?.processing_stats,
          processingSummary: (data as any).metadata?.processing_summary
        });
      }
    } catch (error) {
      console.error('Error loading index status:', error);
    }
  };

  const handleReindex = async () => {
    if (!offer || reindexing) return;

    setReindexing(true);
    setIndexStatus(prev => ({ ...prev, status: 'processing' }));

    try {
      const { data, error } = await supabase.functions.invoke('reindex-event', {
        body: { eventId: offer.id }
      });

      if (error) throw error;

      // Poll for status updates
      const pollStatus = async () => {
        try {
          const { data: statusData, error: statusError } = await supabase
            .from('event_index_status')
            .select('*')
            .eq('event_id', offer.id)
            .single();

          if (statusError) throw statusError;

          setIndexStatus({
            totalDocuments: statusData.total_documents,
            processedDocuments: statusData.processed_documents,
            totalFragmentsSaved: (statusData as any).metadata?.total_fragments_saved || 0,
            lastIndexed: statusData.last_indexed_at,
            status: statusData.status,
            warning: (statusData as any).metadata?.warning,
            stats: (statusData as any).metadata?.processing_stats,
            processingSummary: (statusData as any).metadata?.processing_summary
          });

          if (statusData.status === 'processing') {
            setTimeout(pollStatus, 2000); // Poll every 2 seconds
          } else {
            setReindexing(false);
            
            if (statusData.status === 'completed') {
              const warning = (statusData as any).metadata?.warning;
              const totalFragments = (statusData as any).metadata?.total_fragments_saved || 0;
              
              if (warning) {
                toast({
                  title: "Advertencia de indexación",
                  description: warning,
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Reindexado completado",
                  description: `Se indexaron ${totalFragments} fragmentos de ${statusData.processed_documents} documentos.`,
                });
              }
            } else if (statusData.status === 'error') {
              toast({
                title: "Error en reindexado",
                description: statusData.error_message || "Error desconocido",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
          setReindexing(false);
        }
      };

      // Start polling
      setTimeout(pollStatus, 1000);

    } catch (error) {
      console.error('Error starting reindex:', error);
      setReindexing(false);
      setIndexStatus(prev => ({ ...prev, status: 'error' }));
      
      toast({
        title: "Error",
        description: "No se pudo iniciar el reindexado.",
        variant: "destructive",
      });
    }
  };

  const triggerAutoReindex = async () => {
    // Auto-reindex when files are uploaded to Contrato or Facturas
    if (offer) {
      handleReindex();
    }
  };

  if (!offer) return null;

  const folderName = generateFolderName(offer);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carpeta del Evento</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {folderName}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Contract Warning for Confirmed Events */}
              {offer.estado === 'confirmado' && !hasContract && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Aviso:</strong> Este evento está confirmado pero no tiene contrato subido en la carpeta /Contrato.
                  </AlertDescription>
                </Alert>
              )}

              {/* Event Info */}
              <Card className="card-moodita">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold tracking-tight text-gradient-primary">
                    Información del Evento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Información principal del evento */}
                  <div className="bg-gradient-card rounded-xl p-6 space-y-4">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Fecha:</span>
                        <span className="text-sm font-semibold text-foreground">
                          {offer.fecha ? new Date(offer.fecha).toLocaleDateString('es-ES') : '-'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Ciudad:</span>
                        <span className="text-sm font-semibold text-foreground">{offer.ciudad || '-'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Lugar:</span>
                        <span className="text-sm font-semibold text-foreground">{offer.lugar || '-'}</span>
                      </div>
                      
                      {offer.festival_ciclo && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Festival/Ciclo:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.festival_ciclo}</span>
                        </div>
                      )}
                      
                      {offer.formato && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Formato:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.formato}</span>
                        </div>
                      )}
                      
                      {offer.capacidad && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Capacidad:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.capacidad.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {offer.oferta && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Oferta:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.oferta}</span>
                        </div>
                      )}
                      
                      {offer.contacto && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-muted-foreground">Contacto:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.contacto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Estado en sección separada */}
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                      <Badge 
                        variant="outline" 
                        className="bg-primary/10 text-primary border-primary/20 font-medium rounded-full px-3 py-1"
                      >
                        {offer.estado || 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Folder Navigation */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {currentSubfolder ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentSubfolder(null)}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Home className="h-4 w-4" />
                          Evento
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{currentSubfolder}</span>
                      </>
                    ) : (
                      <CardTitle className="text-lg">Carpetas del Evento</CardTitle>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!currentSubfolder ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {subfolders.map((subfolder) => (
                        <div key={subfolder} className="relative">
                          {subfolder === 'Agente IA' ? (
                            <Button
                              variant="outline"
                              className="flex items-center justify-center w-full p-4 h-auto hover:bg-muted/50"
                              onClick={handleAIItemClick}
                            >
                              <div className="flex items-center gap-2">
                                {getSubfolderIcon(subfolder)}
                                <span className="text-sm font-medium">{subfolder}</span>
                              </div>
                            </Button>
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="flex items-center justify-between w-full p-4 h-auto hover:bg-muted/50"
                                  disabled={uploadProgress[subfolder] !== undefined}
                                >
                                  <div className="flex items-center gap-2">
                                    {getSubfolderIcon(subfolder)}
                                    <span className="text-sm font-medium">{subfolder}</span>
                                  </div>
                                  <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2" align="start">
                                <div className="space-y-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleGoToFolder(subfolder)}
                                    className="w-full justify-start text-sm"
                                  >
                                    <Folder className="h-4 w-4 mr-2" />
                                    Ir a carpeta
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUploadFile(subfolder)}
                                    className="w-full justify-start text-sm"
                                    disabled={uploadProgress[subfolder] !== undefined}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Subir archivo
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                          {uploadProgress[subfolder] !== undefined && (
                            <div className="absolute inset-x-0 bottom-0 px-2 pb-1">
                              <Progress value={uploadProgress[subfolder]} className="h-1" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Current subfolder content */}
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary">
                          {folderContents[currentSubfolder]?.length || 0} archivos
                        </Badge>
                        <Button
                          onClick={() => handleUploadFile(currentSubfolder)}
                          className="flex items-center gap-2"
                          disabled={uploadProgress[currentSubfolder] !== undefined}
                        >
                          <Upload className="h-4 w-4" />
                          Subir archivos
                        </Button>
                      </div>
                      
                      {uploadProgress[currentSubfolder] !== undefined && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subiendo archivo...</span>
                            <span>{uploadProgress[currentSubfolder]}%</span>
                          </div>
                          <Progress value={uploadProgress[currentSubfolder]} />
                        </div>
                      )}

                      {folderContents[currentSubfolder]?.length > 0 ? (
                        <div className="space-y-2">
                          {folderContents[currentSubfolder].map((file) => (
                            <div
                              key={file.name}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-center gap-3">
                                {getFileIcon(file.name)}
                                <div>
                                  <div className="font-medium text-sm">{file.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(file.created_at).toLocaleDateString('es-ES')}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadFile(currentSubfolder, file.name)}
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center text-center p-6 hover:border-muted-foreground/50 transition-colors cursor-pointer"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-primary');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-primary');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-primary');
                            const files = e.dataTransfer.files;
                            if (files && currentSubfolder) {
                              Array.from(files).forEach(file => {
                                handleFileUpload(currentSubfolder, file);
                              });
                            }
                          }}
                          onClick={() => currentSubfolder && handleUploadFile(currentSubfolder)}
                        >
                          <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
                          <div className="space-y-2">
                            <div className="font-medium">Arrastra archivos aquí o haz clic para subir</div>
                            <div className="text-sm text-muted-foreground">
                              Cualquier tipo de archivo: psd, ai, indd, sketch, fig, ttf, otf, zip, rar, 7z, wav, aiff, mp3, mov, mp4, pdf, doc, docx, xls, xlsx, csv, jpg, png, webp, svg, etc.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show budget creation only in Presupuestos subfolder (hidden from menu but still accessible) */}
                      {currentSubfolder === 'Presupuestos' && (
                        <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Crear presupuesto</div>
                              <div className="text-sm text-muted-foreground">Generar un nuevo presupuesto para este evento</div>
                            </div>
                            <Button
                              onClick={handleCreateBudget}
                              disabled={!offer.fecha || !offer.ciudad}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Crear
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>


            </div>

            {/* Sidebar - Recent Files */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Últimos Archivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Cargando...</div>
                  ) : recentFiles.length > 0 ? (
                    <div className="space-y-3">
                      {recentFiles.map((file, index) => (
                        <div key={`${file.subfolder}-${file.name}-${index}`} className="space-y-1">
                          <div className="flex items-start gap-2">
                            {getFileIcon(file.name)}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {file.subfolder}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(file.created_at).toLocaleDateString('es-ES')}
                              </div>
                            </div>
                          </div>
                          {index < recentFiles.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No hay archivos recientes
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>

        {/* AI Agent Side Panel */}
        {showAIPanel && (
          <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Agente IA</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIPanel(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" data-ai-scroll-area>
              <div className="space-y-4">
                {/* Event Summary */}
                <Collapsible open={eventSummaryExpanded} onOpenChange={setEventSummaryExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/30 border rounded-lg">
                      <span className="text-sm font-medium">Resumen del evento</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${eventSummaryExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="bg-muted/20 rounded-lg p-3 border space-y-2">
                      {offer && (
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          {offer.fecha && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fecha:</span>
                              <span className="font-medium">{new Date(offer.fecha).toLocaleDateString('es-ES')}</span>
                            </div>
                          )}
                          {offer.ciudad && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Ciudad:</span>
                              <span className="font-medium">{offer.ciudad}</span>
                            </div>
                          )}
                          {offer.lugar && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lugar:</span>
                              <span className="font-medium">{offer.lugar}</span>
                            </div>
                          )}
                          {offer.festival_ciclo && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Festival/Ciclo:</span>
                              <span className="font-medium">{offer.festival_ciclo}</span>
                            </div>
                          )}
                          {offer.formato && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Formato:</span>
                              <span className="font-medium">{offer.formato}</span>
                            </div>
                          )}
                          {offer.capacidad && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Capacidad:</span>
                              <span className="font-medium">{offer.capacidad}</span>
                            </div>
                          )}
                          {offer.oferta && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Oferta:</span>
                              <span className="font-medium">{offer.oferta}</span>
                            </div>
                          )}
                          {offer.estado && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Estado:</span>
                              <Badge variant="outline" className="text-xs h-5">{offer.estado}</Badge>
                            </div>
                          )}
                          {offer.contacto && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Contacto:</span>
                              <span className="font-medium">{offer.contacto}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Diagnostic Panel */}
                {showDiagnostic && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-950/20 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">🔍 Diagnóstico del Agente IA</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDiagnostic(false)}
                        className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs space-y-1 text-yellow-700 dark:text-yellow-300">
                      <div className="flex justify-between">
                        <span>EventMeta presente:</span>
                        <span className="font-mono font-medium">
                          {offer ? '✅ SÍ' : '❌ NO'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Documentos totales:</span>
                        <span className="font-mono font-medium">{indexStatus.totalDocuments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fragmentos indexados:</span>
                        <span className="font-mono font-medium">{indexStatus.totalFragmentsSaved || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Último warning:</span>
                        <span className="font-mono font-medium text-[10px] max-w-32 truncate">
                          {indexStatus.warning || 'Ninguno'}
                        </span>
                      </div>
                      <div className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-2 pt-1 border-t border-yellow-200 dark:border-yellow-800">
                        💡 Escribe "/diagnostico" en el chat para mostrar este panel
                      </div>
                    </div>
                  </div>
                )}

                {/* Index Status */}
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Estado del índice</span>
                    <Badge variant={indexStatus.status === 'completed' ? 'default' : indexStatus.status === 'error' ? 'destructive' : 'secondary'}>
                      {indexStatus.status === 'completed' ? 'Actualizado' : 
                       indexStatus.status === 'processing' ? 'Procesando' : 
                       indexStatus.status === 'error' ? 'Error' : 'No indexado'}
                    </Badge>
                  </div>
                   <div className="text-xs text-muted-foreground space-y-2">
                     <div>Documentos totales: {indexStatus.totalDocuments} <span className="text-[10px] text-muted-foreground/60">(archivos únicos)</span></div>
                     <div>Fragmentos indexados: {indexStatus.totalFragmentsSaved || 0} <span className="text-[10px] text-muted-foreground/60">(chunks guardados)</span></div>
                     {indexStatus.lastIndexed && (
                       <div>Última actualización: {new Date(indexStatus.lastIndexed).toLocaleString('es-ES')}</div>
                     )}
                    
                    {/* Processing Summary */}
                    {indexStatus.processingSummary && indexStatus.processingSummary.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="font-medium text-xs">Archivos procesados por tipo:</div>
                        {indexStatus.processingSummary.map((summary, index) => (
                          <div key={index} className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1">
                              <span className="font-mono text-[10px] bg-muted px-1 rounded">{summary.type}</span>
                              {summary.total}
                            </span>
                            <div className="flex gap-1 text-[10px]">
                              {summary.processed > 0 && (
                                <span className="text-green-600">✓{summary.processed}</span>
                              )}
                              {summary.skipped > 0 && (
                                <span className="text-yellow-600">⚠{summary.skipped}</span>
                              )}
                              {summary.errors > 0 && (
                                <span className="text-red-600">✗{summary.errors}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          ✓ Procesado | ⚠ Omitido | ✗ Error
                        </div>
                      </div>
                    )}
                    
                    {reindexing && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Procesando...</span>
                          <span>{indexStatus.processedDocuments}/{indexStatus.totalDocuments}</span>
                        </div>
                        <Progress 
                          value={indexStatus.totalDocuments > 0 ? (indexStatus.processedDocuments / indexStatus.totalDocuments) * 100 : 0} 
                          className="h-1"
                        />
                      </div>
                    )}
                   </div>
                 </div>

                 {/* Warning Alert */}
                 {indexStatus.warning && (
                   <Alert variant="destructive" className="mb-4">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertDescription>
                       {indexStatus.warning}
                     </AlertDescription>
                   </Alert>
                 )}

                {/* Conversation Messages */}
                {aiConversation.length === 0 ? (
                  <>
                    <div className="text-center text-sm text-muted-foreground">
                      ¡Hola! Soy tu asistente para gestionar este evento. ¿En qué puedo ayudarte?
                    </div>
                    
                    {/* Quick Start Chips */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Inicio rápido
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {quickStartChips.map((chip, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="h-auto py-2 px-3 text-xs rounded-full whitespace-nowrap"
                            onClick={() => handleQuickStartChip(chip)}
                            disabled={isAiLoading}
                          >
                            {chip}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {aiConversation.map((message) => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 ${
                          message.type === 'user' 
                            ? 'bg-primary text-primary-foreground ml-8' 
                            : 'bg-muted text-foreground mr-8'
                        }`}>
                          {/* Message Content */}
                          <div className="text-sm whitespace-pre-wrap" 
                               dangerouslySetInnerHTML={{ 
                                 __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                               }} 
                          />
                          
                           {/* Sources (only for assistant messages with sources) */}
                           {message.type === 'assistant' && message.sources && message.sources.length > 0 && citeSources && (
                             <div className="mt-3 pt-3 border-t border-border/20">
                               <div className="text-xs font-medium mb-2">📚 Fuentes:</div>
                               <div className="space-y-2">
                                 {groupSources(message.sources).map((groupedSource, groupIndex) => (
                                   <div key={groupIndex} className="bg-background/50 rounded-md p-2 border border-border/30">
                                     <div className="flex items-start justify-between gap-2 mb-1">
                                       <div className="flex items-center gap-2 min-w-0">
                                         <Badge 
                                           variant="outline" 
                                           className={`text-[10px] px-1 py-0.5 ${getFileTypeBadge(groupedSource.type)}`}
                                         >
                                           {groupedSource.type}
                                         </Badge>
                                         <span className="text-[11px] font-medium truncate">
                                           {groupedSource.fileName}
                                           {groupedSource.subfolder === 'Contrato' && ' (Contrato)'}
                                         </span>
                                       </div>
                                       <div className="flex gap-1">
                                         {groupedSource.pageGroups.map((pageGroup, pageGroupIndex) => {
                                           const firstPage = pageGroup[0]?.pageNumber;
                                           const lastPage = pageGroup[pageGroup.length - 1]?.pageNumber;
                                           const pageDisplay = firstPage ? 
                                             (pageGroup.length > 1 && lastPage !== firstPage ? 
                                               `p. ${firstPage}-${lastPage}` : 
                                               `p. ${firstPage}`) : '';
                                           
                                           return pageDisplay ? (
                                             <Badge key={pageGroupIndex} variant="secondary" className="text-[10px] px-1 py-0.5 shrink-0">
                                               {pageDisplay}
                                             </Badge>
                                           ) : null;
                                         })}
                                       </div>
                                     </div>
                                     
                                     <div className="text-[10px] text-muted-foreground mb-1">
                                       {groupedSource.subfolder}
                                     </div>
                                     
                                     {/* Show content from first source in group */}
                                     {groupedSource.pageGroups[0] && groupedSource.pageGroups[0][0]?.content && (
                                       <div className="text-[10px] text-muted-foreground italic mb-2">
                                         "{groupedSource.pageGroups[0][0].content}"
                                       </div>
                                     )}
                                     
                                     {/* Ver contrato button for contract sources */}
                                     {groupedSource.subfolder === 'Contrato' && groupedSource.firstPageNumber && (
                                       <div className="flex justify-end">
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           className="h-6 text-[10px] px-2"
                                           onClick={() => {
                                             toast({
                                               title: "Ver contrato",
                                               description: `Abriendo ${groupedSource.fileName} en página ${groupedSource.firstPageNumber}`,
                                             });
                                           }}
                                         >
                                           📄 Ver contrato
                                         </Button>
                                       </div>
                                     )}
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                          
                          {/* Timestamp */}
                          <div className="text-[10px] opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Loading indicator */}
                    {isAiLoading && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-lg p-3 bg-muted text-foreground mr-8">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="animate-spin h-4 w-4 border-2 border-foreground border-t-transparent rounded-full"></div>
                            Pensando...
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border space-y-3">
              {/* Cite Sources Toggle */}
              <div className="flex items-center justify-between">
                <label htmlFor="cite-sources" className="text-sm font-medium">
                  Citar fuentes
                </label>
                <Switch
                  id="cite-sources"
                  checked={citeSources}
                  onCheckedChange={setCiteSources}
                />
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  placeholder="En qué puedo ayudarte"
                  className="flex-1"
                  disabled={isAiLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!aiMessage.trim() || isAiLoading}
                  size="sm"
                  className="px-3"
                >
                  {isAiLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Reindex Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReindex}
                disabled={reindexing}
                className="w-full flex items-center gap-2"
              >
                <RotateCcw className={`h-4 w-4 ${reindexing ? 'animate-spin' : ''}`} />
                {reindexing ? 'Reindexando...' : 'Reindexar ahora'}
              </Button>
            </div>
          </div>
        )}

        {/* Backdrop for AI Panel */}
        {showAIPanel && (
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowAIPanel(false)}
          />
        )}
      </Dialog>

      {offer && profile && (
        <CreateBudgetDialog
          open={showCreateBudgetDialog}
          onOpenChange={setShowCreateBudgetDialog}
          onSuccess={handleBudgetCreated}
        />
      )}
    </>
  );
}
