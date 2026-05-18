import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from './card';

interface CardSkeletonProps {
  showHeader?: boolean;
  headerHeight?: string;
  contentLines?: number;
  className?: string;
}

export function CardSkeleton({ 
  showHeader = true, 
  headerHeight = "h-6", 
  contentLines = 3,
  className 
}: CardSkeletonProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <Skeleton className={`w-3/4 ${headerHeight}`} />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i === contentLines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </CardContent>
    </Card>
  );
}