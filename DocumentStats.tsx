import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Image, Music, Video, File, HardDrive, TrendingUp, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface Document {
  id: string;
  title: string;
  category: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface DocumentStatsProps {
  documents: Document[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const CATEGORY_LABELS: Record<string, string> = {
  contract: 'Contratos',
  rider: 'Riders',
  setlist: 'Setlists',
  press: 'Prensa',
  legal: 'Legal',
  financial: 'Financiero',
  other: 'Otros',
};

export function DocumentStats({ documents }: DocumentStatsProps) {
  // Calculate stats
  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  
  // Category breakdown
  const categoryData = documents.reduce((acc, doc) => {
    const cat = doc.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name: CATEGORY_LABELS[name] || name,
    value,
  }));

  // File type breakdown
  const getFileCategory = (fileType: string) => {
    if (fileType?.includes('pdf')) return 'PDF';
    if (fileType?.startsWith('image/')) return 'Imágenes';
    if (fileType?.startsWith('audio/')) return 'Audio';
    if (fileType?.startsWith('video/')) return 'Video';
    if (fileType?.includes('word') || fileType?.includes('doc')) return 'Word';
    return 'Otros';
  };

  const fileTypeData = documents.reduce((acc, doc) => {
    const type = getFileCategory(doc.file_type);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fileTypeChartData = Object.entries(fileTypeData).map(([name, value]) => ({
    name,
    value,
  }));

  // Monthly uploads
  const monthlyData = documents.reduce((acc, doc) => {
    const month = new Date(doc.created_at).toLocaleDateString('es-ES', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyChartData = Object.entries(monthlyData).slice(-6).map(([name, value]) => ({
    name,
    value,
  }));

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Recent uploads count (last 7 days)
  const recentUploads = documents.filter(doc => {
    const uploadDate = new Date(doc.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return uploadDate > weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              en la biblioteca
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
            <p className="text-xs text-muted-foreground">
              espacio utilizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subidos esta semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentUploads}</div>
            <p className="text-xs text-muted-foreground">
              últimos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(categoryData).length}</div>
            <p className="text-xs text-muted-foreground">
              tipos diferentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} docs`, '']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sin datos
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {categoryChartData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File type bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Tipo de Archivo</CardTitle>
          </CardHeader>
          <CardContent>
            {fileTypeChartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fileTypeChartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={80}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} docs`, '']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sin datos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend */}
      {monthlyChartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subidas por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number) => [`${value} docs`, '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
