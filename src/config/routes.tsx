import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

import '@/config/modules'
import { moduleRoutes } from '@/core/modules'

const NotFound = lazy(() => import('@/app/errors/not-found/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

/**
 * Route table assembled from the module registry. Only the root redirect
 * and the 404 catch-all live outside module manifests.
 */
export const routes: RouteConfig[] = [
  // Use relative path "dashboard" instead of "/dashboard" for basename compatibility
  {
    path: '/',
    element: <Navigate to="dashboard" replace />,
  },
  ...moduleRoutes(),
  {
    path: '*',
    element: <NotFound />,
  },
]
