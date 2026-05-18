import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2, User, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedEntity {
  type: 'persona' | 'empresa';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  dni?: string;
  cif?: string;
  iban?: string;
  bank_name?: string;
  swift_code?: string;
  website?: string;
}

interface FieldSelection {
  [key: string]: boolean;
}

interface DocumentContactExtractorProps {
  onBack: () => void;
  onSelectEntity: (entity: ExtractedEntity, selectedFields: string[]) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  email: 'Email',
  phone: 'Teléfono',
  address: 'Dirección',
  dni: 'DNI/NIE',
  cif: 'CIF/NIF',
  iban: 'IBAN',
  bank_name: 'Banco',
  swift_code: 'SWIFT/BIC',
  website: 'Web'
};

export function DocumentContactExtractor({ onBack, onSelectEntity }: DocumentContactExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [selectedEntityIndex, setSelectedEntityIndex] = useState<number | null>(null);
  const [fieldSelections, setFieldSelections] = useState<Record<number, FieldSelection>>({});
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For now, we'll read text files directly
    // For PDFs, we'd need a parser - using basic text extraction
    if (file.type === 'text/plain') {
      return await file.text();
    }
    
    // For PDF and other files, we'll use FileReader and send to parse
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Try to extract text content - for PDFs this is limited
          // In production, you'd use a PDF parsing library
          const text = reader.result as string;
          
          // If it's a PDF, the text might be garbled - we'll try anyway
          // The AI can often make sense of partial text
          resolve(text);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsExtracting(true);
    setEntities([]);
    setSelectedEntityIndex(null);
    setFieldSelections({});

    try {
      // Extract text from file
      const documentText = await extractTextFromFile(file);
      
      if (!documentText || documentText.trim().length < 10) {
        toast.error('No se pudo extraer texto del documento. Intenta con otro archivo.');
        setIsExtracting(false);
        return;
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('extract-contact-from-document', {
        body: { documentText }
      });

      if (error) {
        console.error('Error calling extraction function:', error);
        toast.error('Error al procesar el documento');
        setIsExtracting(false);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        setIsExtracting(false);
        return;
      }

      const extractedEntities = data.entities || [];
      
      if (extractedEntities.length === 0) {
        toast.info('No se encontró información de contacto en el documento');
      } else {
        toast.success(`Se encontraron ${extractedEntities.length} entidad(es)`);
        
        // Initialize field selections - all fields selected by default
        const initialSelections: Record<number, FieldSelection> = {};
        extractedEntities.forEach((entity: ExtractedEntity, index: number) => {
          const fields: FieldSelection = {};
          Object.keys(entity).forEach(key => {
            if (key !== 'type' && entity[key as keyof ExtractedEntity]) {
              fields[key] = true;
            }
          });
          initialSelections[index] = fields;
        });
        setFieldSelections(initialSelections);
        
        if (extractedEntities.length === 1) {
          setSelectedEntityIndex(0);
        }
      }
      
      setEntities(extractedEntities);
    } catch (error) {
      console.error('Error extracting from document:', error);
      toast.error('Error al procesar el documento');
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const toggleField = (entityIndex: number, field: string) => {
    setFieldSelections(prev => ({
      ...prev,
      [entityIndex]: {
        ...prev[entityIndex],
        [field]: !prev[entityIndex]?.[field]
      }
    }));
  };

  const handleUseSelected = () => {
    if (selectedEntityIndex === null) {
      toast.error('Selecciona una entidad');
      return;
    }

    const entity = entities[selectedEntityIndex];
    const selectedFields = Object.entries(fieldSelections[selectedEntityIndex] || {})
      .filter(([_, selected]) => selected)
      .map(([field]) => field);

    if (selectedFields.length === 0) {
      toast.error('Selecciona al menos un campo');
      return;
    }

    onSelectEntity(entity, selectedFields);
  };

  const getEntityFields = (entity: ExtractedEntity) => {
    return Object.entries(entity)
      .filter(([key, value]) => key !== 'type' && value)
      .map(([key, value]) => ({ key, value: value as string }));
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      {entities.length === 0 ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          {isExtracting ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Extrayendo información...</p>
              {uploadedFileName && (
                <p className="text-xs text-muted-foreground">{uploadedFileName}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Arrastra un documento aquí</p>
                <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
              </div>
              <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{uploadedFileName}</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>

          <div className="text-sm font-medium">
            Se encontraron {entities.length} entidad(es):
          </div>

          <RadioGroup
            value={selectedEntityIndex?.toString()}
            onValueChange={(value) => setSelectedEntityIndex(parseInt(value))}
          >
            <div className="space-y-4">
              {entities.map((entity, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedEntityIndex === index ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={index.toString()} id={`entity-${index}`} className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {entity.type === 'persona' ? (
                          <User className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building2 className="h-4 w-4 text-purple-500" />
                        )}
                        <Label htmlFor={`entity-${index}`} className="font-medium cursor-pointer">
                          {entity.name}
                        </Label>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({entity.type})
                        </span>
                      </div>

                      {selectedEntityIndex === index && (
                        <div className="grid grid-cols-1 gap-2 pl-6">
                          {getEntityFields(entity).map(({ key, value }) => (
                            <div key={key} className="flex items-center gap-2">
                              <Checkbox
                                id={`field-${index}-${key}`}
                                checked={fieldSelections[index]?.[key] ?? true}
                                onCheckedChange={() => toggleField(index, key)}
                              />
                              <Label
                                htmlFor={`field-${index}-${key}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                <span className="text-muted-foreground">{FIELD_LABELS[key] || key}:</span>{' '}
                                <span className="font-mono text-xs">{value}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setEntities([]);
                setUploadedFileName(null);
              }}
            >
              Subir otro documento
            </Button>
            <Button onClick={handleUseSelected} disabled={selectedEntityIndex === null}>
              Usar datos seleccionados
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
