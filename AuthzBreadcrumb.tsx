import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<any>;
}

interface AuthzBreadcrumbProps {
  workspace?: {
    id: string;
    name: string;
  };
  artist?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  current?: string;
}

export function AuthzBreadcrumb({ workspace, artist, project, current }: AuthzBreadcrumbProps) {
  const items: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home
    }
  ];

  if (workspace) {
    items.push({
      label: workspace.name,
      href: `/workspace/${workspace.id}`
    });
  }

  if (artist) {
    items.push({
      label: artist.name,
      href: `/artist/${artist.id}`
    });
  }

  if (project) {
    items.push({
      label: project.name,
      href: `/project/${project.id}`
    });
  }

  if (current) {
    items.push({
      label: current
    });
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center">
            {item.icon && <item.icon className="h-4 w-4 mr-1" />}
            {item.href ? (
              <Link 
                to={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </div>
          {index < items.length - 1 && (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}