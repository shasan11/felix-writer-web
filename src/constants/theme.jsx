// src/theme.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

/**
 * NOTE:
 * - Tokens affect almost everything globally.
 * - component overrides are for fine tuning specific components.
 * - For fonts to look good, install them (Google Fonts) or bundle them.
 */

const ThemeContext = createContext(null);

const STORAGE_KEY = "felix_theme_settings";

// Default theme settings (editable from settings UI later)
const DEFAULT_SETTINGS = {
  isDark: false,
  compact: false,

  // Brand / color
  colorPrimary: "#2ecc71",

  // Typography
  fontFamily:
    'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  fontSize: 14, // base
  lineHeight: 1.15,

  // Shape
  borderRadius: 3,
  

  // Layout density
  controlHeight: 40,

  // Optional: if you later add settings drawer
  componentSize: "middle", // "small" | "middle" | "large"
};

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // load saved settings once
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      setSettings((prev) => ({ ...prev, ...saved }));
    } else {
      // backward compatibility: if you previously stored felix_theme only
      const old = localStorage.getItem("felix_theme");
      if (old === "dark") setSettings((prev) => ({ ...prev, isDark: true }));
    }
  }, []);

  // persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute("data-theme", settings.isDark ? "dark" : "light");

    // Optional: set font on html/body for non-AntD elements too
    document.documentElement.style.fontFamily = settings.fontFamily;
    document.body.style.fontFamily = settings.fontFamily;
  }, [settings]);

  const setIsDark = (isDark) => setSettings((s) => ({ ...s, isDark }));
  const toggleDark = () => setSettings((s) => ({ ...s, isDark: !s.isDark }));
  const setPrimary = (colorPrimary) => setSettings((s) => ({ ...s, colorPrimary }));
  const setFontFamily = (fontFamily) => setSettings((s) => ({ ...s, fontFamily }));
  const setFontSize = (fontSize) => setSettings((s) => ({ ...s, fontSize }));
  const setRadius = (borderRadius) => setSettings((s) => ({ ...s, borderRadius }));
  const setCompact = (compact) => setSettings((s) => ({ ...s, compact }));
  const setControlHeight = (controlHeight) => setSettings((s) => ({ ...s, controlHeight }));

  // Ant Design theme config
  const antdConfig = useMemo(() => {
    const algorithm = [
      settings.isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      ...(settings.compact ? [antdTheme.compactAlgorithm] : []),
    ];

    return {
      algorithm,

      // Global tokens (big impact)
      token: {
        colorPrimary: settings.colorPrimary,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,

        borderRadius: settings.borderRadius,
        controlHeight: settings.controlHeight,

        // nice defaults
        wireframe: false,
      },

      // Component-level overrides (fine tuning)
      components: {
        Layout: {
          headerBg: settings.isDark ? "#0b1220" : "#ffffff",
          siderBg: settings.isDark ? "#0b1220" : "#ffffff",
          bodyBg: settings.isDark ? "#0a0f1a" : "#f5f7fb",
          headerHeight: 64,
        },

        Menu: {
          itemHeight: 44,
          itemBorderRadius: settings.borderRadius,
          itemSelectedBg: settings.isDark ? "rgba(0,67,202,0.25)" : "rgba(0,67,202,0.12)",
          itemSelectedColor: settings.colorPrimary,
          itemHoverBg: settings.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        },

        Button: {
          borderRadius: settings.borderRadius,
          controlHeight: settings.controlHeight,
          paddingInline: 16,
          fontWeight: 600,
        },

        Input: {
          controlHeight: settings.controlHeight,
          borderRadius: settings.borderRadius,
          paddingInline: 12,
        },

        Card: {
          borderRadiusLG: 5,
          paddingLG: 16,
        },

        Tabs: {
          titleFontSize: settings.fontSize,
          horizontalItemGutter: 24,
          itemSelectedColor: settings.colorPrimary,
          inkBarColor: settings.colorPrimary,
        },

        Table: {
          headerBg: settings.isDark ? "rgba(255,255,255,0.06)" : "#fafafa",
          rowHoverBg: settings.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
          borderRadius: settings.borderRadius,
        },

        Modal: {
          borderRadiusLG: settings.borderRadius ,
        },

        Tooltip: {
          borderRadius: settings.borderRadius,
        },

        Dropdown: {
          borderRadius: settings.borderRadius,
        },
      },
    };
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      setSettings,

      // simple setters
      setIsDark,
      toggleDark,
      setPrimary,
      setFontFamily,
      setFontSize,
      setRadius,
      setCompact,
      setControlHeight,
    }),
    [settings]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={antdConfig}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() must be used inside <ThemeProvider />");
  return ctx;
}
