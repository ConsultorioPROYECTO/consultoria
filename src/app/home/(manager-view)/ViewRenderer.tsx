'use client';

import React from 'react';
import { useNavigation } from '@rutas/app/context/NavigationContext';
import { renderView } from './ViewRegistry';

/**
 * Optimized ViewRenderer using the new ViewRegistry pattern
 * Eliminates switch statements and provides better type safety
 */
const ViewRenderer: React.FC = React.memo(() => {
  const { currentView } = useNavigation();

  // Simple, type-safe rendering using the registry
  return renderView(currentView);
});

ViewRenderer.displayName = 'ViewRenderer';



export default ViewRenderer;