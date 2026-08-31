import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useWorkspace } from './WorkspaceContext.jsx';

const PeriodContext = createContext();

export function PeriodProvider({ children }) {
  const { espacioActual } = useWorkspace();
  const [periodos, setPeriodos] = useState([]);
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarPeriodos = async () => {
    try {
      setLoading(true);
      // El plan es la fuente de la estructura: sincroniza años, períodos y materias
      // antes de poblar el selector superior.
      await api.getPlanEstudios();
      const res = await api.getPeriodos();
      const list = res.periodos || [];
      setPeriodos(list);

      const activeId = res.periodoActivoId;
      let active = list.find(p => p.id === activeId) || list.find(p => p.esActivo) || list[0] || null;
      setPeriodoActivo(active);

      if (!periodoSeleccionado) {
        setPeriodoSeleccionado(active);
      } else {
        const updatedSel = list.find(p => p.id === periodoSeleccionado.id) || active;
        setPeriodoSeleccionado(updatedSel);
      }
    } catch (err) {
      console.error('Error al cargar períodos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPeriodoSeleccionado(null);
    if (espacioActual) cargarPeriodos();
    else { setPeriodos([]); setPeriodoActivo(null); setLoading(false); }
  }, [espacioActual?.id]);

  const activarPeriodo = async (id) => {
    await api.activarPeriodo(id);
    await cargarPeriodos();
  };

  const seleccionarPeriodo = (periodoId) => {
    const target = periodos.find(p => p.id === periodoId);
    if (target) setPeriodoSeleccionado(target);
  };

  return (
    <PeriodContext.Provider
      value={{
        periodos,
        periodoActivo,
        periodoSeleccionado,
        loading,
        cargarPeriodos,
        activarPeriodo,
        seleccionarPeriodo,
        setPeriodoSeleccionado
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  return useContext(PeriodContext);
}
