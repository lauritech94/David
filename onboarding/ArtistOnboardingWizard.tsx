import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Step Components
import { Step1Identity } from './steps/Step1Identity';
import { Step2Team } from './steps/Step2Team';
import { Step3Business } from './steps/Step3Business';
import { Step4Catalog } from './steps/Step4Catalog';
import { Step5BookingFormats } from './steps/Step5BookingFormats';
import { Step6Calendar } from './steps/Step6Calendar';

export interface ArtistFormData {
  // Step 1: Identity
  name: string;
  stageName: string;
  legalName: string;
  genre: string;
  avatarUrl: string | null;
  headerImageUrl: string | null;
  spotifyUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  
  // Step 2: Team
  teamMembers: TeamMember[];
  
  // Step 3: Business
  companyName: string;
  taxId: string;
  iban: string;
  swiftCode: string;
  bankName: string;
  legalDocuments: LegalDocument[];
  
  // Step 4: Catalog
  defaultSplits: RoyaltySplit[];
  songs: SongEntry[];
  
  // Step 5: Booking Formats
  bookingProducts: BookingProduct[];
  
  // Step 6: Calendar
  calendarUrl: string;
  brandColor: string;
}

export interface TeamMember {
  email: string;
  role: 'MANAGER' | 'BOOKER' | 'TOUR_MANAGER' | 'ARTIST';
  name?: string;
  isExisting?: boolean;
  userId?: string;
}

export interface LegalDocument {
  id?: string;
  title: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface RoyaltySplit {
  recipientName: string;
  recipientRole: string;
  percentage: number;
}

export interface SongEntry {
  title: string;
  isrc?: string;
}

export interface BookingProduct {
  name: string;
  description?: string;
  feeMin?: number;
  feeMax?: number;
  riderUrl?: string;
  hospitalityRequirements?: string;
  crewSize: number;
  setupTimeMinutes?: number;
  performanceDurationMinutes?: number;
}

const STEPS = [
  { id: 1, title: 'Identidad', description: 'Nombre, logo y redes' },
  { id: 2, title: 'Equipo', description: 'Invita a tu equipo' },
  { id: 3, title: 'Legal & Fiscal', description: 'Datos de facturación' },
  { id: 4, title: 'Catálogo', description: 'Canciones y splits' },
  { id: 5, title: 'Formatos', description: 'Productos de booking' },
  { id: 6, title: 'Calendario', description: 'Integración y color' },
];

const initialFormData: ArtistFormData = {
  name: '',
  stageName: '',
  legalName: '',
  genre: '',
  avatarUrl: null,
  headerImageUrl: null,
  spotifyUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  teamMembers: [],
  companyName: '',
  taxId: '',
  iban: '',
  swiftCode: '',
  bankName: '',
  legalDocuments: [],
  defaultSplits: [
    { recipientName: 'Artista', recipientRole: 'artist', percentage: 80 },
    { recipientName: 'Manager', recipientRole: 'manager', percentage: 20 },
  ],
  songs: [],
  bookingProducts: [],
  calendarUrl: '',
  brandColor: '#8B5CF6',
};

export function ArtistOnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ArtistFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({
    1: false,
    2: true, // Optional
    3: true, // Optional
    4: true, // Optional
    5: true, // Optional
    6: true, // Optional
  });

  const updateFormData = (updates: Partial<ArtistFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateStepValidation = (step: number, isValid: boolean) => {
    setStepValidation(prev => ({ ...prev, [step]: isValid }));
  };

  const canProceed = stepValidation[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length && canProceed) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: 'Error', description: 'No hay usuario autenticado', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Get workspace_id
      const { data: membership } = await supabase
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!membership?.workspace_id) {
        throw new Error('No se encontró workspace');
      }

      // 2. Create artist record
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .insert({
          name: formData.name,
          stage_name: formData.stageName || null,
          legal_name: formData.legalName || null,
          genre: formData.genre || null,
          avatar_url: formData.avatarUrl,
          header_image_url: formData.headerImageUrl,
          spotify_url: formData.spotifyUrl || null,
          instagram_url: formData.instagramUrl || null,
          tiktok_url: formData.tiktokUrl || null,
          company_name: formData.companyName || null,
          tax_id: formData.taxId || null,
          iban: formData.iban || null,
          swift_code: formData.swiftCode || null,
          bank_name: formData.bankName || null,
          calendar_url: formData.calendarUrl || null,
          brand_color: formData.brandColor,
          workspace_id: membership.workspace_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (artistError) throw artistError;

      const artistId = artist.id;

      // 3. Create team role bindings
      if (formData.teamMembers.length > 0) {
        for (const member of formData.teamMembers) {
          if (member.userId) {
            // Map UI roles to DB roles
            const dbRole = member.role === 'ARTIST' ? 'ARTIST_OBSERVER' : 'ARTIST_MANAGER';
            await supabase.from('artist_role_bindings').insert({
              artist_id: artistId,
              user_id: member.userId,
              role: dbRole,
            });
          }
          // TODO: Send invitations for non-existing users
        }
      }

      // 4. Create legal documents
      if (formData.legalDocuments.length > 0) {
        await supabase.from('legal_documents').insert(
          formData.legalDocuments.map(doc => ({
            artist_id: artistId,
            document_type: doc.documentType,
            title: doc.title,
            file_url: doc.fileUrl,
            file_name: doc.fileName,
            is_active: doc.isActive,
            start_date: doc.startDate || null,
            end_date: doc.endDate || null,
            uploaded_by: user.id,
          }))
        );
      }

      // 5. Create default royalty splits
      if (formData.defaultSplits.length > 0) {
        await supabase.from('default_royalty_splits').insert(
          formData.defaultSplits.map(split => ({
            artist_id: artistId,
            recipient_name: split.recipientName,
            recipient_role: split.recipientRole,
            percentage: split.percentage,
          }))
        );
      }

      // 6. Create songs
      if (formData.songs.length > 0) {
        await supabase.from('songs').insert(
          formData.songs.map(song => ({
            artist_id: artistId,
            title: song.title,
            isrc: song.isrc || null,
            created_by: user.id,
          }))
        );
      }

      // 7. Create booking products
      if (formData.bookingProducts.length > 0) {
        await supabase.from('booking_products').insert(
          formData.bookingProducts.map((product, idx) => ({
            artist_id: artistId,
            name: product.name,
            description: product.description || null,
            fee_min: product.feeMin || null,
            fee_max: product.feeMax || null,
            rider_url: product.riderUrl || null,
            hospitality_requirements: product.hospitalityRequirements || null,
            crew_size: product.crewSize,
            setup_time_minutes: product.setupTimeMinutes || null,
            performance_duration_minutes: product.performanceDurationMinutes || null,
            sort_order: idx,
            created_by: user.id,
          }))
        );
      }

      // 8. Storage folders are created automatically by trigger

      toast({
        title: '¡Artista creado!',
        description: `${formData.name} ha sido configurado correctamente.`,
      });

      navigate('/mi-management');
    } catch (error: any) {
      console.error('Error creating artist:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el artista',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Configurar Nuevo Artista</h1>
          <p className="text-muted-foreground">
            Paso {currentStep} de {STEPS.length}: {STEPS[currentStep - 1].title}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          
          {/* Step indicators */}
          <div className="hidden md:flex justify-between">
            {STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-2',
                  currentStep > step.id && 'text-primary',
                  currentStep === step.id && 'text-primary font-medium',
                  currentStep < step.id && 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    currentStep > step.id && 'bg-primary border-primary text-primary-foreground',
                    currentStep === step.id && 'border-primary bg-primary/10',
                    currentStep < step.id && 'border-muted-foreground/30'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground hidden lg:block">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <Step1Identity
                formData={formData}
                updateFormData={updateFormData}
                onValidationChange={(valid) => updateStepValidation(1, valid)}
              />
            )}
            {currentStep === 2 && (
              <Step2Team
                formData={formData}
                updateFormData={updateFormData}
                onValidationChange={(valid) => updateStepValidation(2, valid)}
              />
            )}
            {currentStep === 3 && (
              <Step3Business
                formData={formData}
                updateFormData={updateFormData}
                onValidationChange={(valid) => updateStepValidation(3, valid)}
              />
            )}
            {currentStep === 4 && (
              <Step4Catalog
                formData={formData}
                updateFormData={updateFormData}
                onValidationChange={(valid) => updateStepValidation(4, valid)}
              />
            )}
            {currentStep === 5 && (
              <Step5BookingFormats
                formData={formData}
                updateFormData={updateFormData}
                onValidationChange={(valid) => updateStepValidation(5, valid)}
              />
            )}
            {currentStep === 6 && (
              <Step6Calendar
                formData={formData}
                updateFormData={updateFormData}
                onValidationChange={(valid) => updateStepValidation(6, valid)}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed}>
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Finalizar y Crear Artista'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
