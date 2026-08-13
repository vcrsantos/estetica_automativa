"use client";

import * as React from "react";

import type { Unidade } from "@/types/database";

const STORAGE_KEY = "polibrilho:unidade-selecionada";

type UnidadeContextValue = {
  unidades: Unidade[];
  /** null = "todas as unidades" (só disponível para administrador) */
  unidadeSelecionadaId: string | null;
  setUnidadeSelecionadaId: (id: string | null) => void;
  podeAlternar: boolean;
};

const UnidadeContext = React.createContext<UnidadeContextValue | null>(null);

export function UnidadeProvider({
  unidades,
  unidadeFixaId,
  children,
}: {
  unidades: Unidade[];
  /** Para atendente: a unidade do usuário, travada. Para admin: null. */
  unidadeFixaId: string | null;
  children: React.ReactNode;
}) {
  const podeAlternar = unidadeFixaId === null;
  const [unidadeSelecionadaId, setUnidadeSelecionadaIdState] = React.useState<
    string | null
  >(unidadeFixaId);

  React.useEffect(() => {
    if (!podeAlternar) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && unidades.some((u) => u.id === stored)) {
      // A leitura do localStorage só é possível depois da montagem (evita
      // divergir do HTML gerado no servidor), então a sincronização com o
      // estado precisa acontecer aqui.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnidadeSelecionadaIdState(stored);
    }
  }, [podeAlternar, unidades]);

  const setUnidadeSelecionadaId = React.useCallback(
    (id: string | null) => {
      if (!podeAlternar) return;
      setUnidadeSelecionadaIdState(id);
      if (id) {
        window.localStorage.setItem(STORAGE_KEY, id);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    },
    [podeAlternar]
  );

  return (
    <UnidadeContext.Provider
      value={{ unidades, unidadeSelecionadaId, setUnidadeSelecionadaId, podeAlternar }}
    >
      {children}
    </UnidadeContext.Provider>
  );
}

export function useUnidade() {
  const context = React.useContext(UnidadeContext);
  if (!context) {
    throw new Error("useUnidade deve ser usado dentro de UnidadeProvider");
  }
  return context;
}
