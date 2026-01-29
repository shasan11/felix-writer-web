// src/layouts/partials/AppNavbar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Layout, theme as antdTheme, Input, Space, Tooltip, Badge, Button, Switch, Dropdown, Typography } from "antd";
import { SearchOutlined, BellOutlined, SettingOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Header } = Layout;

export default function AppNavbar({
  onOpenSettings,        // (sectionKey) => void
  onOpenNotifications,   // () => void
  onThemeChange,         // (isDark:boolean) => void  <-- IMPORTANT if you control ConfigProvider above
}) {
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();
  const { token } = antdTheme.useToken();

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("felix_theme");
    const dark = saved === "dark";
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    onThemeChange?.(dark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist theme changes
  useEffect(() => {
    localStorage.setItem("felix_theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    onThemeChange?.(isDark);
  }, [isDark, onThemeChange]);

  const settingsItems = 
   [
      { key: "profile", label: "Profile" },
      { key: "billing", label: "Billing" },
      { key: "workspace", label: "Workspace" },
      { type: "divider" },
      { key: "logout", label: "Logout" },
    ];

  const onSettingsClick = ({ key }) => {
    if (key === "logout") return onOpenSettings?.("logout");
    onOpenSettings?.(key);
  };

  return (
    <Header
      className="app-navbar"
      style={{
        padding: "0 16px",
        background: token.colorBgContainer,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        // If your border wasn't showing earlier, set it here explicitly:
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* Left: Search */}
      <div style={{ width: 520, maxWidth: "60vw" }}>
        <Input
          allowClear
          size="medium"
          prefix={<SearchOutlined />}
          suffix={<Typography.Text type="secondary">Ctrl+K</Typography.Text>}
          placeholder="Search documents, tools, templates..."
          onPressEnter={(e) => {
            const value = e.target.value?.trim();
            if (!value) return;
            // Navigate to search page (recommended)
            navigate(`/app/search?q=${encodeURIComponent(value)}`);
          }}
        />
      </div>

      {/* Right: Actions */}
      <Space size="middle">
        {/* Theme Toggle */}
        <Tooltip title={isDark ? "Switch to Light" : "Switch to Dark"}>
          <Switch
            checked={isDark}
            size="large"
            onChange={setIsDark}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
          />
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="Notifications">
          <Badge dot>
            <Button
             shape="circle"
               
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              onClick={() => onOpenNotifications?.()}
            />
          </Badge>
        </Tooltip>

        {/* Settings */}
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={{ items: settingsItems, onClick: onSettingsClick }}
        >
          <Tooltip title="Settings">
            <Button
              shape="circle"
              icon={<SettingOutlined style={{ fontSize: 18 }} />}
              onClick={(e) => e.preventDefault()}
            />
          </Tooltip>
        </Dropdown>
      </Space>
    </Header>
  );
}
