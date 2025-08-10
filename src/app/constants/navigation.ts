/**
 * Navigation configuration with optimized TypeScript patterns
 * Uses const assertions for better type safety and performance
 */

// Navigation views configuration with const assertion for type safety
export const NAVIGATION_VIEWS = {
  HOME: 'Home',
  CALENDAR: 'calendar',
  PATIENTS: 'patients',
  ORGANIZATION: 'organization',
  CONFIGURATION: 'configuration',
  AI_CARE: 'ai-care',
  DOCUMENTS: 'documents',
} as const;

// Derive ViewType from the configuration object
export type ViewType = typeof NAVIGATION_VIEWS[keyof typeof NAVIGATION_VIEWS];

// View metadata for enhanced functionality
export interface ViewMetadata {
  readonly title: string;
  readonly icon: string;
  readonly requiresAuth: boolean;
  readonly allowedRoles?: readonly string[];
  readonly preloadable: boolean;
}

// Centralized view configuration with metadata
export const VIEW_CONFIG: Record<ViewType, ViewMetadata> = {
  [NAVIGATION_VIEWS.HOME]: {
    title: 'Panel',
    icon: 'House',
    requiresAuth: true,
    preloadable: true,
  },
  [NAVIGATION_VIEWS.CALENDAR]: {
    title: 'Calendario',
    icon: 'CalendarClock',
    requiresAuth: true,
    preloadable: true,
  },
  [NAVIGATION_VIEWS.PATIENTS]: {
    title: 'Pacientes',
    icon: 'Users',
    requiresAuth: true,
    allowedRoles: ['admin', 'asistente'],
    preloadable: true,
  },
  [NAVIGATION_VIEWS.ORGANIZATION]: {
    title: 'Organización',
    icon: 'Factory',
    requiresAuth: true,
    allowedRoles: ['admin'],
    preloadable: false,
  },
  [NAVIGATION_VIEWS.CONFIGURATION]: {
    title: 'Configuración',
    icon: 'Settings',
    requiresAuth: true,
    preloadable: false,
  },
  [NAVIGATION_VIEWS.AI_CARE]: {
    title: 'Ai-Care',
    icon: 'Activity',
    requiresAuth: true,
    allowedRoles: ['admin'],
    preloadable: true,
  },
  [NAVIGATION_VIEWS.DOCUMENTS]: {
    title: 'Documentos',
    icon: 'FolderOpen',
    requiresAuth: true,
    allowedRoles: ['admin'],
    preloadable: true,
  },
} as const;

// Helper functions for type-safe navigation
export const isValidView = (view: string): view is ViewType => {
  return Object.values(NAVIGATION_VIEWS).includes(view as ViewType);
};

export const getViewMetadata = (view: ViewType): ViewMetadata => {
  return VIEW_CONFIG[view];
};

export const canUserAccessView = (view: ViewType, userRole: string): boolean => {
  const metadata = getViewMetadata(view);
  if (!metadata.allowedRoles) return true;
  return metadata.allowedRoles.includes(userRole);
};

// Export all view values as an array for iteration
export const ALL_VIEWS = Object.values(NAVIGATION_VIEWS) as readonly ViewType[];