import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  FileText, 
  Upload,
  Download,
  Trash2,
  Send,
  Link as LinkIcon,
  CheckCircle,
  Edit3,
  Eye,
  MoreHorizontal,
  Pencil,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';
import { ContractGenerator } from '@/components/ContractGenerator';
import { ContractTypeSelector } from '@/components/ContractTypeSelector';
import { IPLicenseGenerator } from '@/components/IPLicenseGenerator';
import { ContractSignersManager } from './ContractSignersManager';
import { ContractSignersSummary } from './ContractSignersSummary';
import { ContractSignaturesFooter, getDocumentSigners } from './ContractSignaturesFooter';
import jsPDF from 'jspdf';
import mooditaLogo from "@/assets/moodita-logo.png";
interface BookingDocument {
  id: string;
  booking_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  document_type: 'contract' | 'rider' | 'press_kit' | 'invoice' | 'other';
  status: 'draft' | 'sent' | 'signed' | 'pending_signature';
  created_at: string;
  contract_token?: string;
  signer_name?: string;
  signature_image_url?: string;
  signed_at?: string;
}

interface BookingDocumentsTabProps {
  booking: {
    id: string;
    festival_ciclo?: string;
    venue?: string;
    promotor?: string;
    fee?: number;
    fecha?: string;
    ciudad?: string;
    hora?: string;
    capacidad?: number;
    duracion?: string;
    contacto?: string;
    formato?: string;
  };
  artistName?: string;
  onUpdate: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contrato', icon: FileText },
  { value: 'rider', label: 'Rider', icon: FileText },
  { value: 'press_kit', label: 'Press Kit', icon: FileText },
  { value: 'invoice', label: 'Factura', icon: FileText },
  { value: 'other', label: 'Otro', icon: FileText },
];

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'bg-gray-500', icon: Edit3 },
  sent: { label: 'Enviado', color: 'bg-blue-500', icon: Send },
  pending_signature: { label: 'Firma pendiente', color: 'bg-amber-500', icon: Send },
  signed: { label: 'Firmado', color: 'bg-green-500', icon: CheckCircle },
};

export function BookingDocumentsTab({ booking, artistName, onUpdate }: BookingDocumentsTabProps) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<BookingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showContractGenerator, setShowContractGenerator] = useState(false);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const [showIPLicenseGenerator, setShowIPLicenseGenerator] = useState(false);
  const [editingContract, setEditingContract] = useState<BookingDocument | null>(null);
  const [viewingContract, setViewingContract] = useState<BookingDocument | null>(null);
  const [contractContents, setContractContents] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<BookingDocument | null>(null);
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [contractIdMap, setContractIdMap] = useState<Record<string, string>>({});

  const toggleContract = (id: string) => {
    setExpandedContracts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchDocuments();

    // Subscribe to real-time updates for this booking's documents
    const channel = supabase
      .channel(`booking-documents-${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_documents',
          filter: `booking_id=eq.${booking.id}`,
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Refresh documents when any change happens
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking.id]);

   const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('booking_documents')
        .select('*, contract_token, signer_name, signature_image_url, signed_at')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as BookingDocument[]);
      
      // Load content for generated contracts
      const contents: Record<string, string> = {};
      (data || []).forEach((doc: any) => {
        if (doc.content) {
          contents[doc.id] = doc.content;
        }
      });
      setContractContents(contents);

      // Fetch contract ID mapping (booking_document_id → contracts.id)
      const docIds = (data || []).map((d: any) => d.id);
      if (docIds.length > 0) {
        const { data: contractLinks } = await supabase
          .from('contracts')
          .select('id, booking_document_id')
          .in('booking_document_id', docIds);
        const idMap: Record<string, string> = {};
        (contractLinks || []).forEach((c: any) => {
          if (c.booking_document_id) idMap[c.booking_document_id] = c.id;
        });
        setContractIdMap(idMap);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${booking.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await (supabase as any)
        .from('booking_documents')
        .insert({
          booking_id: booking.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          document_type: docType,
          status: 'draft',
          created_by: profile?.user_id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Documento subido",
        description: "El documento se ha subido correctamente.",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Old handleContractSave removed - now using the new one defined below

  const handleUpdateStatus = async (docId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('booking_documents')
        .update({ status: newStatus })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `El documento ahora está: ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`,
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  // Generate signature link and update status
  const handleSendToSign = async (docId: string) => {
    try {
      // First get the current document to check if it has a token
      const doc = documents.find(d => d.id === docId);
      
      // Update status to pending_signature
      const { data: updatedDoc, error } = await (supabase as any)
        .from('booking_documents')
        .update({ status: 'pending_signature' })
        .eq('id', docId)
        .select('contract_token')
        .single();

      if (error) throw error;

      const token = updatedDoc?.contract_token || doc?.contract_token;
      
      if (token) {
        const signUrl = `${PUBLIC_APP_URL}/sign/${token}`;
        await navigator.clipboard.writeText(signUrl);
        
        toast({
          title: "Enlace de firma generado",
          description: "El enlace ha sido copiado al portapapeles. Compártelo con el firmante.",
        });
        
        // Refresh documents list
        fetchDocuments();
      } else {
        throw new Error('No se pudo obtener el token');
      }

    } catch (error) {
      console.error('Error generating signature link:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de firma.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('booking_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Documento eliminado",
        description: "El documento se ha eliminado correctamente.",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Enlace copiado",
      description: "El enlace se ha copiado al portapapeles.",
    });
  };

  // Download contract as PDF with Cityzen logo and signatures
  const handleDownloadPDF = async (doc: BookingDocument) => {
    const content = contractContents[doc.id];
    if (!content) {
      // If no generated content, just open the file URL
      if (doc.file_url && doc.file_url !== 'generated') {
        window.open(doc.file_url, '_blank');
      }
      return;
    }
    
    // Fetch signers for this document
    const signers = await getDocumentSigners(doc.id);
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 5;
    
    // Add logo to page
    const addLogo = () => {
      try {
        const logoWidth = 40;
        const logoHeight = 15;
        const logoX = (pageWidth - logoWidth) / 2;
        pdf.addImage(mooditaLogo, 'PNG', logoX, 10, logoWidth, logoHeight);
        return 30; // Return starting Y position after logo
      } catch {
        return margin;
      }
    };
    
    let y = addLogo();
    let pageNumber = 1;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    
    // Clean content to remove problematic characters
    const cleanContent = content
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/…/g, '...')
      .replace(/\u00A0/g, ' ');
    
    const lines = pdf.splitTextToSize(cleanContent, maxWidth);
    
    const addPageNumber = () => {
      pdf.setFontSize(8);
      pdf.text(String(pageNumber), pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.setFontSize(10);
    };
    
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - 20) {
        addPageNumber();
        pdf.addPage();
        pageNumber++;
        y = addLogo();
      }
      
      // Check for section headers
      const isSectionHeader = /^\d+\./.test(line.trim()) || 
        (line.length < 70 && line === line.toUpperCase() && line.trim().length > 0 && !line.includes('-'));
      
      if (isSectionHeader) {
        pdf.setFont("helvetica", "bold");
        if (/^\d+\./.test(line.trim()) && !line.includes('.1') && !line.includes('.2') && !line.includes('.3')) {
          y += 3;
        }
      } else {
        pdf.setFont("helvetica", "normal");
      }
      
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    
    // Add signatures section if there are signers
    if (signers.length > 0) {
      // Check if we need a new page for signatures
      const signatureBlockHeight = 80;
      if (y + signatureBlockHeight > pageHeight - 30) {
        addPageNumber();
        pdf.addPage();
        pageNumber++;
        y = addLogo();
      }
      
      y += 15;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("FIRMAS", pageWidth / 2, y, { align: 'center' });
      y += 10;
      pdf.setFontSize(10);
      
      // Calculate columns for signers
      const colCount = Math.min(signers.length, 3);
      const colWidth = (maxWidth - (colCount - 1) * 10) / colCount;
      
      signers.forEach((signer, index) => {
        const col = index % colCount;
        const row = Math.floor(index / colCount);
        const x = margin + col * (colWidth + 10);
        const baseY = y + row * 50;
        
        // Role
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(signer.role.toUpperCase(), x + colWidth / 2, baseY, { align: 'center' });
        
        // Signature line or image
        const lineY = baseY + 25;
        if (signer.status === 'signed' && signer.signature_image_url) {
          // Try to add signature image
          try {
            // Draw a placeholder line under where signature would be
            pdf.setDrawColor(100);
            pdf.line(x + 5, lineY, x + colWidth - 5, lineY);
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "italic");
            pdf.text("[Firma digital]", x + colWidth / 2, lineY - 3, { align: 'center' });
          } catch {
            pdf.line(x + 5, lineY, x + colWidth - 5, lineY);
          }
        } else {
          // Pending signature
          pdf.setDrawColor(150);
          pdf.line(x + 5, lineY, x + colWidth - 5, lineY);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "italic");
          pdf.setTextColor(150);
          pdf.text("(Pendiente)", x + colWidth / 2, lineY - 3, { align: 'center' });
          pdf.setTextColor(0);
        }
        
        // Name
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(signer.name, x + colWidth / 2, lineY + 8, { align: 'center' });
        
        // Signed date if applicable
        if (signer.status === 'signed' && signer.signed_at) {
          pdf.setFontSize(7);
          pdf.setTextColor(100);
          pdf.text(
            `Firmado: ${new Date(signer.signed_at).toLocaleDateString('es-ES')}`,
            x + colWidth / 2,
            lineY + 14,
            { align: 'center' }
          );
          pdf.setTextColor(0);
        }
      });
      
      y += Math.ceil(signers.length / colCount) * 50 + 10;
    }
    
    addPageNumber();
    pdf.save(doc.file_name.replace(/\.[^/.]+$/, '') + '.pdf');
    toast({ description: "PDF descargado correctamente" });
  };

  // View contract in a dialog
  const handleViewContract = (doc: BookingDocument) => {
    if (doc.file_url && doc.file_url !== 'generated') {
      setPreviewDoc(doc);
    } else {
      setViewingContract(doc);
    }
  };

  // Edit contract (only if not signed)
  const handleEditContract = (doc: BookingDocument) => {
    if (doc.status === 'signed') {
      toast({
        title: "No se puede editar",
        description: "Los contratos firmados no se pueden editar.",
        variant: "destructive",
      });
      return;
    }
    setEditingContract(doc);
    setShowContractGenerator(true);
  };

  // Save contract content when generated
  const handleContractSave = async (contract: { title: string; content: string }) => {
    try {
      if (editingContract) {
        // Update existing - save content to database
        const { error } = await (supabase as any)
          .from('booking_documents')
          .update({ 
            file_name: contract.title + '.pdf',
            content: contract.content 
          })
          .eq('id', editingContract.id);
        
        if (error) throw error;
        setContractContents(prev => ({ ...prev, [editingContract.id]: contract.content }));
        setEditingContract(null);
      } else {
        // Create new - save content to database
        const { data, error } = await (supabase as any)
          .from('booking_documents')
          .insert({
            booking_id: booking.id,
            file_name: contract.title + '.pdf',
            file_url: 'generated',
            file_type: 'application/pdf',
            document_type: 'contract',
            status: 'draft',
            created_by: profile?.user_id,
            content: contract.content,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setContractContents(prev => ({ ...prev, [data.id]: contract.content }));
          
          // Create unified contract record
          const { data: contractRecord } = await supabase
            .from('contracts')
            .insert({
              title: contract.title || data.file_name,
              status: 'borrador',
              file_url: data.file_url,
              created_by: profile?.user_id,
              contract_type: 'booking',
              booking_document_id: data.id,
              booking_id: booking.id,
              artist_id: null,
            } as any)
            .select()
            .single();

          const contractId = contractRecord?.id || data.id;

          // Auto-add "Agencia" signer (Ciudad Zen) — now points to contracts.id
          await supabase
            .from('contract_signers')
            .insert({
              document_id: contractId,
              name: 'Ciudad Zen Músicas S.L.',
              role: 'Agencia',
              email: null,
            });
          
          // If booking has promotor/contacto, suggest adding them too
          if (booking.promotor || booking.contacto) {
            await supabase
              .from('contract_signers')
              .insert({
                document_id: contractId,
                name: booking.promotor || booking.contacto || 'Promotor',
                role: 'Promotor',
                email: null,
              });
          }
        }
      }
      
      fetchDocuments();
      toast({ description: "Contrato guardado correctamente" });
    } catch (error) {
      console.error('Error saving contract:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el contrato.",
        variant: "destructive",
      });
    }
  };

  // Pre-fill contract data from booking
  const getBookingDataForContract = () => ({
    artista: artistName || '',
    ciudad: booking.ciudad || '',
    venue: booking.venue || '',
    fecha: booking.fecha || '',
    hora: booking.hora || '',
    fee: booking.fee || undefined,
    aforo: booking.capacidad || undefined,
    duracion: booking.duracion || '',
    promotor: booking.promotor || booking.contacto || '',
    festival_ciclo: booking.festival_ciclo || '',
    formato: booking.formato || '',
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const contracts = documents.filter(d => d.document_type === 'contract');
  const otherDocs = documents.filter(d => d.document_type !== 'contract');

  return (
    <div className="space-y-6">


      {/* Contract Generator Dialog */}
      <ContractGenerator
        open={showContractGenerator}
        onOpenChange={(open) => {
          setShowContractGenerator(open);
          if (!open) setEditingContract(null);
        }}
        bookingData={getBookingDataForContract()}
        onSave={handleContractSave}
      />

      {/* IP License Generator */}
      <IPLicenseGenerator
        open={showIPLicenseGenerator}
        onOpenChange={setShowIPLicenseGenerator}
        onSave={async (contract) => {
          if (!profile?.id || !contract.pdfBlob) return;
          try {
            const fileName = `${contract.title.replace(/\s+/g, '_')}.pdf`;
            const filePath = `booking-documents/${booking.id}/${Date.now()}_${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, contract.pdfBlob, { contentType: 'application/pdf' });
            if (uploadError) throw uploadError;
            const { error: insertError } = await supabase
              .from('booking_documents')
              .insert({
                booking_id: booking.id,
                document_type: 'contract',
                file_name: fileName,
                file_url: filePath,
                file_type: 'application/pdf',
                content: contract.content,
                status: 'draft',
                created_by: profile.id,
              });
            if (insertError) throw insertError;
            toast({ title: 'Contrato guardado', description: 'La licencia IP se ha guardado correctamente' });
            onUpdate();
          } catch (err: any) {
            toast({ title: 'Error', description: 'Error al guardar: ' + (err.message || ''), variant: 'destructive' });
          }
        }}
      />

      {/* Contract Viewer Dialog */}
      <Dialog open={!!viewingContract} onOpenChange={(open) => !open && setViewingContract(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingContract?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-white dark:bg-gray-950 rounded-lg p-6 max-h-[60vh] overflow-y-auto border shadow-inner">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-gray-800 dark:text-gray-200">
              {viewingContract && contractContents[viewingContract.id] 
                ? contractContents[viewingContract.id]
                : 'No hay contenido disponible para este contrato. Puede que haya sido subido externamente.'}
            </pre>
            
            {/* Dynamic Signatures Footer */}
            {viewingContract && (
              <ContractSignaturesFooter documentId={viewingContract.id} />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            {viewingContract && contractContents[viewingContract.id] && (
              <Button variant="outline" onClick={() => viewingContract && handleDownloadPDF(viewingContract)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewingContract(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) { setPreviewDoc(null); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewDoc?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-4 pt-0">
            {previewDoc?.file_url && previewDoc.file_url !== 'generated' ? (
              <>
                {previewDoc.file_type?.startsWith('image/') ? (
                  <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 max-h-[70vh] overflow-auto">
                    <img 
                      src={previewDoc.file_url} 
                      alt={previewDoc.file_name}
                      className="max-w-full max-h-[65vh] object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 h-[40vh]">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center mb-4">
                      Haz clic para ver el documento en una nueva pestaña
                    </p>
                    <Button onClick={() => window.open(previewDoc.file_url, '_blank')}>
                      <Eye className="h-4 w-4 mr-2" />
                      Abrir documento
                    </Button>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.open(previewDoc.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar archivo
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 h-[40vh]">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No se pudo cargar la vista previa
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 p-4 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => previewDoc?.file_url && window.open(previewDoc.file_url, '_blank')}
              disabled={!previewDoc?.file_url}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Contratos
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Genera y gestiona contratos del evento
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowContractGenerator(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Generar Contrato
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileUpload(e, 'contract')}
                disabled={uploading}
              />
              <Button size="sm" variant="outline" asChild disabled={uploading}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir
                </span>
              </Button>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-10 h-10 text-muted-foreground" />}
              title="Sin contratos"
              description="Genera un contrato desde una plantilla o sube uno existente"
            />
          ) : (
            <div className="space-y-2">
              {contracts.map((doc) => {
                const statusConfig = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
                const StatusIcon = statusConfig.icon;
                const isGenerated = doc.file_url === 'generated';
                const isSigned = doc.status === 'signed';
                const isPendingSignature = doc.status === 'pending_signature';
                const isExpanded = expandedContracts.has(doc.id);

                return (
                  <Collapsible
                    key={doc.id}
                    open={isExpanded}
                    onOpenChange={() => toggleContract(doc.id)}
                  >
                    <div className={`rounded-lg border transition-colors ${isSigned ? 'border-green-500/50 bg-green-500/5' : 'bg-muted/30'}`}>
                      {/* Minimized row — always visible */}
                      <div className="flex items-center justify-between px-4 py-3">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                            <div className={`p-1.5 rounded-md shrink-0 ${isSigned ? 'bg-green-500/20' : 'bg-primary/10'}`}>
                              {isSigned ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <span className="font-medium truncate text-sm">{doc.file_name}</span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </CollapsibleTrigger>

                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {contractIdMap[doc.id] && <ContractSignersSummary documentId={contractIdMap[doc.id]} />}
                          <Badge className={`${statusConfig.color} ${isSigned ? 'bg-green-600' : ''} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewContract(doc)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver contrato
                              </DropdownMenuItem>
                              {!isSigned && !isPendingSignature && (
                                <DropdownMenuItem onClick={() => handleEditContract(doc)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar contrato
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDownloadPDF(doc)}>
                                <Download className="h-4 w-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                              {doc.file_url && doc.file_url !== 'generated' && (
                                <DropdownMenuItem onClick={() => handleCopyLink(doc.file_url)}>
                                  <LinkIcon className="h-4 w-4 mr-2" />
                                  Copiar enlace
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Expanded content */}
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4">
                          <div className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                            {isGenerated && ' • Generado'}
                          </div>

                          {/* Legacy signature info */}
                          {isSigned && (
                            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-700 dark:text-green-400">
                                  Firmado por: {doc.signer_name || 'Desconocido'}
                                </span>
                              </div>
                              {doc.signed_at && (
                                <p className="text-xs text-muted-foreground">
                                  Fecha: {new Date(doc.signed_at).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
                                </p>
                              )}
                              {doc.signature_image_url && (
                                <div className="mt-2 bg-white dark:bg-gray-900 rounded p-2 border">
                                  <img src={doc.signature_image_url} alt="Firma" className="max-h-16 mx-auto" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            {!isSigned && !isPendingSignature && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendToSign(doc.id)}
                                className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Enviar a Firmar
                              </Button>
                            )}
                            {isPendingSignature && doc.contract_token && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const signUrl = `${PUBLIC_APP_URL}/sign/${doc.contract_token}`;
                                  navigator.clipboard.writeText(signUrl);
                                  toast({ title: "Enlace copiado", description: "Compártelo con el firmante." });
                                }}
                                className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                              >
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Copiar Link Firma
                              </Button>
                            )}
                          </div>

                          {/* Multi-Signer Manager */}
                          <div className="pt-2 border-t">
                            <ContractSignersManager 
                              documentId={contractIdMap[doc.id] || doc.id} 
                              onSignersChange={fetchDocuments}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Anexos y Documentos
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Riders, Press Kits, acreditaciones y otros archivos
            </p>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'other')}
                disabled={uploading}
              />
              <Button size="sm" variant="outline" asChild disabled={uploading}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Subir Archivo'}
                </span>
              </Button>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {otherDocs.length === 0 ? (
            <EmptyState
              icon={<Upload className="w-10 h-10 text-muted-foreground" />}
              title="Sin documentos adicionales"
              description="Sube riders, acreditaciones, tickets de parking u otros archivos"
            />
          ) : (
            <div className="space-y-3">
              {otherDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.file_url && doc.file_url !== 'generated' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewDoc(doc)}
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.file_url, '_blank')}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
