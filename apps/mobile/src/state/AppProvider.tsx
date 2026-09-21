import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { settings } from '../config/settings';
import { DemoDatabase } from '../data/offline';
import { SupabaseService } from '../data/supabase';
import { AppError, type DataMode, type KidsGuideGateway, type Language, type Persona } from '../domain/models';
import i18n from '../i18n';

type AppContext = {
  mode: DataMode; persona: Persona; scope: string; gateway: KidsGuideGateway; activeChildId: string | null;
  setActiveChildId: (id: string) => void; setMode: (mode: DataMode) => void; setPersona: (persona: Persona) => void;
  setLanguage: (language: Language) => Promise<void>; resetDemo: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>;
};
const Context = createContext<AppContext | null>(null);
export const uuid = () => Crypto.randomUUID();

export function AppProvider({ children }: React.PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: {
    retry: (attempt, error) => attempt < 1 && error instanceof AppError && error.code === 'network', staleTime: 30000,
  }, mutations: { retry: false } } }));
  const [database] = useState(() => new DemoDatabase(AsyncStorage, uuid));
  const [cloud] = useState(() => new SupabaseService(async () => (await import('../data/cloudClient')).createCloudClient()));
  const [mode, updateMode] = useState<DataMode>(settings.dataMode);
  const [persona, updatePersona] = useState<Persona>(settings.demo.defaultPersona);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  useEffect(() => { void AsyncStorage.getItem('kids-guide.language').then(value => {
    if (value === 'tr' || value === 'en') void i18n.changeLanguage(value);
  }).catch(() => undefined); }, []);
  const scope = `${mode}:${mode === 'offline' ? persona : settings.supabase.url}:${sessionVersion}`;
  const gateway = useMemo(() => mode === 'offline' ? database.forPersona(persona) : cloud.gateway, [mode, persona, database, cloud]);
  const clearContext = () => { queryClient.clear(); setActiveChildId(null); };
  const context: AppContext = {
    mode, persona, scope, gateway, activeChildId, setActiveChildId,
    setMode: next => { clearContext(); updateMode(next); },
    setPersona: next => { clearContext(); updatePersona(next); },
    async setLanguage(language) { await i18n.changeLanguage(language); await AsyncStorage.setItem('kids-guide.language', language); },
    async resetDemo() { await database.reset(); clearContext(); setSessionVersion(v => v + 1); },
    async login(email, password) { await cloud.login(email, password); clearContext(); setSessionVersion(v => v + 1); },
    async logout() { await cloud.logout(); clearContext(); setSessionVersion(v => v + 1); },
  };
  return <QueryClientProvider client={queryClient}><Context.Provider value={context}>{children}</Context.Provider></QueryClientProvider>;
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error('AppProvider is required');
  return context;
}
