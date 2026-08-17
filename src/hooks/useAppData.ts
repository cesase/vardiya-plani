import { useEffect, useState } from 'react';
import { AppData } from '../types';
import { clearAppData, loadAppData, saveAppData } from '../storage/appStorage';
import { DEFAULT_DATA } from '../constants';

function freshDefaults(): AppData {
  return JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData;
}

export function useAppData() {
  const [data, setData] = useState<AppData>(freshDefaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    loadAppData().then((loaded) => {
      if (!active) return;
      setData(loaded);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAppData(data).catch(() => {
      // Uygulama kullanılmaya devam eder; sonraki değişiklikte yeniden kaydetmeyi dener.
    });
  }, [data, hydrated]);

  async function resetData() {
    const defaults = await clearAppData();
    setData(defaults);
  }

  return { data, setData, hydrated, resetData };
}

