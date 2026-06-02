"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupplyStatus } from "./types";

export interface AlertSettings {
  enabled: boolean;
  email: string;
  notifyOn: SupplyStatus[];
}

const KEY = "alert_settings";
const DEFAULT: AlertSettings = { enabled: false, email: "", notifyOn: ["供給停止", "販売中止"] };

export function useAlertSettings() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<AlertSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { settings, update, ready };
}
