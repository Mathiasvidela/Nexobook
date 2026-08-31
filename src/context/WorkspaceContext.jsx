import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setApiEspacio } from '../services/api.js';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [espacios, setEspacios] = useState([]);
  const [espacioActual, setEspacioActual] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarEspacios = async () => {
    try {
      const list = await api.getEspacios();
      setEspacios(list || []);
      const saved = sessionStorage.getItem('estudio-espacio');
      if (saved) {
        const selected = list.find(item => item.id === saved);
        if (selected) { setApiEspacio(selected.id); setEspacioActual(selected); }
      }
      return list;
    } finally { setLoading(false); }
  };

  useEffect(() => { cargarEspacios(); }, []);

  const seleccionarEspacio = espacio => {
    setApiEspacio(espacio.id); setEspacioActual(espacio);
    sessionStorage.setItem('estudio-espacio', espacio.id);
  };

  const salirDelEspacio = () => {
    setApiEspacio(''); setEspacioActual(null); sessionStorage.removeItem('estudio-espacio');
  };

  const crearEspacio = async data => {
    const created = await api.createEspacio(data);
    setEspacios(prev => [...prev, created]); seleccionarEspacio(created); return created;
  };

  const actualizarEspacio = async (id, data) => {
    const updated = await api.updateEspacio(id, data);
    setEspacios(prev => prev.map(item => item.id === id ? updated : item));
    if (espacioActual?.id === id) setEspacioActual(updated);
    return updated;
  };

  const eliminarEspacio = async id => {
    await api.deleteEspacio(id);
    setEspacios(prev => prev.map(item => item.id === id ? { ...item, archivado: true } : item));
  };

  return <WorkspaceContext.Provider value={{ espacios, espacioActual, loading, seleccionarEspacio, salirDelEspacio, crearEspacio, actualizarEspacio, eliminarEspacio, cargarEspacios }}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);
