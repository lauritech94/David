import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { 
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarIcon,
  X,
  Eye,
  Copy,
  ExternalLink,
  DollarSign,
  FileText
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
}

interface BudgetItem {
  id: string;
  budget_id: string;
  category: string;
  subcategory?: string;
  name: string;
  quantity: number;
  unit_price: number;
  iva_percentage: number;
  irpf_percentage: number;
  is_attendee: boolean;
  billing_status: 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada' | 'cancelado' | 'pagado' | 'facturado' | 'pagado_sin_factura';
  invoice_link?: string;
  observations?: string;
  category_id?: string;
  contact_id?: string;
  fecha_emision?: string;
  created_at: string;
  updated_at: string;
  contacts?: Contact | null;
}

interface FilterChip {
  id: string;
  label: string;
  value: string;
  type: 'search' | 'status' | 'dateRange' | 'sort' | 'contact';
}

// Normalize text for flexible search (remove accents, lowercase)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
};

type SortField = 'total' | 'fecha_emision' | 'name' | 'unit_price' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface EnhancedBudgetItemsViewProps {
  budgetId: string;
  className?: string;
}

const statusLabels = {
  pendiente: 'Pendiente',
  factura_solicitada: 'Factura Solicitada',
  factura_recibida: 'Factura Recibida',
  pagada: 'Pagada',
  pagado: 'Pagada',
  pagado_sin_factura: 'Pagado (sin justificante)',
  facturado: 'Facturada',
  cancelado: 'Cancelado'
};

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  factura_solicitada: 'bg-blue-100 text-blue-800',
  factura_recibida: 'bg-purple-100 text-purple-800',
  pagada: 'bg-green-100 text-green-800',
  pagado: 'bg-green-100 text-green-800',
  pagado_sin_factura: 'bg-amber-100 text-amber-800 border border-amber-300',
  facturado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800'
};

export default function EnhancedBudgetItemsView({ budgetId, className }: EnhancedBudgetItemsViewProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  useEffect(() => {
    fetchItems();
  }, [budgetId]);

  // Derive contacts from items that have a linked contact
  const linkedContacts = useMemo(() => {
    const contactMap = new Map<string, Contact>();
    items.forEach(item => {
      if (item.contacts && item.contact_id) {
        contactMap.set(item.contacts.id, item.contacts);
      }
    });
    return Array.from(contactMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_items')
        .select('*, contacts(id, name)')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as BudgetItem[]) || []);
    } catch (error) {
      console.error('Error fetching budget items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos del presupuesto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Flexible search filter (normalized: removes accents, tolerant to typos)
      const searchNorm = normalizeText(searchTerm);
      const itemNameNorm = normalizeText(item.name);
      const itemCategoryNorm = normalizeText(item.category);
      const itemSubcategoryNorm = normalizeText(item.subcategory || '');
      const contactNameNorm = normalizeText(item.contacts?.name || '');

      const matchesSearch = !searchTerm || 
        itemNameNorm.includes(searchNorm) ||
        itemCategoryNorm.includes(searchNorm) ||
        itemSubcategoryNorm.includes(searchNorm) ||
        contactNameNorm.includes(searchNorm) ||
        item.unit_price.toString().includes(searchTerm) ||
        (item.unit_price * item.quantity).toString().includes(searchTerm);

      // Status filter
      const matchesStatus = statusFilter === 'all' || item.billing_status === statusFilter;

      // Contact filter
      const matchesContact = contactFilter === 'all' || item.contact_id === contactFilter;

      // Date range filter
      const itemDate = item.fecha_emision ? new Date(item.fecha_emision) : null;
      const matchesDateRange = (!dateFrom || !itemDate || itemDate >= dateFrom) &&
                               (!dateTo || !itemDate || itemDate <= dateTo);

      // Amount range filter
      const totalAmount = item.unit_price * item.quantity;
      const matchesMinAmount = !minAmount || totalAmount >= parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || totalAmount <= parseFloat(maxAmount);

      return matchesSearch && matchesStatus && matchesContact && matchesDateRange && matchesMinAmount && matchesMaxAmount;
    });

    // Sort items
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'total':
          aValue = a.unit_price * a.quantity;
          bValue = b.unit_price * b.quantity;
          break;
        case 'fecha_emision':
          aValue = a.fecha_emision ? new Date(a.fecha_emision) : new Date(0);
          bValue = b.fecha_emision ? new Date(b.fecha_emision) : new Date(0);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'unit_price':
          aValue = a.unit_price;
          bValue = b.unit_price;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, searchTerm, statusFilter, contactFilter, sortField, sortDirection, dateFrom, dateTo, minAmount, maxAmount]);

  // Generate active filter chips
  const activeFilters = useMemo(() => {
    const filters: FilterChip[] = [];

    if (searchTerm) {
      filters.push({
        id: 'search',
        label: `Buscar: "${searchTerm}"`,
        value: searchTerm,
        type: 'search'
      });
    }

    if (statusFilter !== 'all') {
      filters.push({
        id: 'status',
        label: `Estado: ${statusLabels[statusFilter as keyof typeof statusLabels]}`,
        value: statusFilter,
        type: 'status'
      });
    }

    if (dateFrom || dateTo) {
      const fromStr = dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '...';
      const toStr = dateTo ? format(dateTo, 'dd/MM/yyyy') : '...';
      filters.push({
        id: 'dateRange',
        label: `Fechas: ${fromStr} - ${toStr}`,
        value: `${dateFrom?.toISOString() || ''}_${dateTo?.toISOString() || ''}`,
        type: 'dateRange'
      });
    }

    if (minAmount || maxAmount) {
      const minStr = minAmount || '0';
      const maxStr = maxAmount || '∞';
      filters.push({
        id: 'amountRange',
        label: `Importe: €${minStr} - €${maxStr}`,
        value: `${minAmount}_${maxAmount}`,
        type: 'search'
      });
    }

    if (sortField !== 'created_at' || sortDirection !== 'desc') {
      const sortLabel = {
        total: 'Total',
        fecha_emision: 'Fecha emisión',
        name: 'Nombre',
        unit_price: 'Precio unitario',
        created_at: 'Fecha creación'
      }[sortField];
      
      filters.push({
        id: 'sort',
        label: `Orden: ${sortLabel} ${sortDirection === 'asc' ? '↑' : '↓'}`,
        value: `${sortField}_${sortDirection}`,
        type: 'sort'
      });
    }

    if (contactFilter !== 'all') {
      const contactName = linkedContacts.find(c => c.id === contactFilter)?.name || contactFilter;
      filters.push({
        id: 'contact',
        label: `Contacto: ${contactName}`,
        value: contactFilter,
        type: 'contact'
      });
    }

    return filters;
  }, [searchTerm, statusFilter, contactFilter, dateFrom, dateTo, minAmount, maxAmount, sortField, sortDirection, linkedContacts]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setContactFilter('all');
    setSortField('created_at');
    setSortDirection('desc');
    setDateFrom(undefined);
    setDateTo(undefined);
    setMinAmount('');
    setMaxAmount('');
  };

  const removeFilter = (filterId: string) => {
    switch (filterId) {
      case 'search':
        setSearchTerm('');
        break;
      case 'status':
        setStatusFilter('all');
        break;
      case 'dateRange':
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
      case 'amountRange':
        setMinAmount('');
        setMaxAmount('');
        break;
      case 'sort':
        setSortField('created_at');
        setSortDirection('desc');
        break;
      case 'contact':
        setContactFilter('all');
        break;
    }
  };

  const calculateTotal = (item: BudgetItem) => {
    const subtotal = item.unit_price * item.quantity;
    const iva = subtotal * (item.iva_percentage / 100);
    const irpf = subtotal * (item.irpf_percentage / 100);
    return subtotal + iva - irpf;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Vista General de Elementos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and basic filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar concepto, contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="factura_solicitada">Factura Solicitada</SelectItem>
                <SelectItem value="factura_recibida">Factura Recibida</SelectItem>
                <SelectItem value="pagada">Pagada</SelectItem>
                <SelectItem value="pagado">Pagada</SelectItem>
                <SelectItem value="pagado_sin_factura">Pagado (sin justificante)</SelectItem>
                <SelectItem value="facturado">Facturada</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            {/* Contact Filter */}
            <Select value={contactFilter} onValueChange={setContactFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Contacto" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50 max-h-60 overflow-auto">
                <SelectItem value="all">Todos los contactos</SelectItem>
                {linkedContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortField}_${sortDirection}`} onValueChange={(value) => {
              const [field, direction] = value.split('_') as [SortField, SortDirection];
              setSortField(field);
              setSortDirection(direction);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="total_desc">Total (mayor a menor)</SelectItem>
                <SelectItem value="total_asc">Total (menor a mayor)</SelectItem>
                <SelectItem value="fecha_emision_desc">Fecha emisión (más reciente)</SelectItem>
                <SelectItem value="fecha_emision_asc">Fecha emisión (más antiguo)</SelectItem>
                <SelectItem value="name_asc">Nombre (A-Z)</SelectItem>
                <SelectItem value="name_desc">Nombre (Z-A)</SelectItem>
                <SelectItem value="unit_price_desc">Precio unitario (mayor a menor)</SelectItem>
                <SelectItem value="unit_price_asc">Precio unitario (menor a mayor)</SelectItem>
                <SelectItem value="created_at_desc">Más recientes</SelectItem>
                <SelectItem value="created_at_asc">Más antiguos</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {activeFilters.length > 0 && (
              <Button 
                variant="outline" 
                onClick={clearAllFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Advanced filters row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Desde fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: es }) : "Hasta fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Min Amount */}
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="number"
                placeholder="Importe mínimo"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="pl-10"
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Amount */}
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="number"
                placeholder="Importe máximo"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="pl-10"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1"
                >
                  {filter.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilter(filter.id)}
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredAndSortedItems.length} de {items.length} elementos
        </p>
        <div className="text-sm text-muted-foreground">
          Total filtrado: €{filteredAndSortedItems.reduce((sum, item) => sum + calculateTotal(item), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Concepto
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSort('fecha_emision')}
                >
                  <div className="flex items-center gap-2">
                    Fecha Emisión
                    {sortField === 'fecha_emision' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                  onClick={() => toggleSort('unit_price')}
                >
                  <div className="flex items-center gap-2 justify-end">
                    Precio Unitario
                    {sortField === 'unit_price' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                  onClick={() => toggleSort('total')}
                >
                  <div className="flex items-center gap-2 justify-end">
                    Total
                    {sortField === 'total' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {activeFilters.length > 0 
                          ? "No se encontraron elementos con los filtros aplicados" 
                          : "No hay elementos en este presupuesto"
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        {item.subcategory && (
                          <p className="text-xs text-muted-foreground">{item.subcategory}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.fecha_emision ? (
                        format(new Date(item.fecha_emision), "dd/MM/yyyy", { locale: es })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      €{item.unit_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{calculateTotal(item).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[item.billing_status as keyof typeof statusColors]}>
                        {statusLabels[item.billing_status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.invoice_link && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}