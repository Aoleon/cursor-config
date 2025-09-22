import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper pour les pages qui ont déjà leur propre layout avec Sidebar
 * Ce composant permet de migrer progressivement vers AppLayout
 */
export default function PageWrapper({ children }: PageWrapperProps) {
  return <>{children}</>;
}