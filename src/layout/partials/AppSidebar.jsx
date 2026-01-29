// src/layouts/partials/AppSidebar.jsx
import React, { useMemo } from "react";
import {
  EditOutlined,
  SmileOutlined,
  CheckCircleOutlined,
  RadarChartOutlined,
  FileTextOutlined,
  BookOutlined,
  SearchOutlined,
  ReadOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import ApplicationLogo from "../../components/ApplicationLogo";

const { Sider } = Layout;

const siderStyle = {
  overflow: "auto",
  height: "100vh",
  position: "sticky",
  insetInlineStart: 0,
  backgroundColor: "#fff",
  borderRight: "1px solid #e5e7eb",
  top: 0,
 
};

// map menu keys -> routes
const ROUTES = {
  dashboard: "/app",
  paraphraser: "/app/paraphraser",
  humanizer: "/app/humanizer",
  grammar: "/app/grammar",
  "ai-detector": "/app/ai-detector",
  summarizer: "/app/summarizer",
  plagiarism: "/app/plagiarism",
  citations: "/app/citations",
  "paper-gen": "/app/paper-generator",
};

const items = [
  {
    key: "dashboard",
    icon: <HomeOutlined />,
    label: "Dashboard",
  },
  {
    key: "core",
    label: "Core Tools",
    type: "group",
    children: [
      { key: "paraphraser", icon: <EditOutlined />, label: "Paraphraser" },
      { key: "humanizer", icon: <SmileOutlined />, label: "Humanizer" },
      { key: "grammar", icon: <CheckCircleOutlined />, label: "Grammar & Style" },
      { key: "ai-detector", icon: <RadarChartOutlined />, label: "AI Detector" },
      { key: "summarizer", icon: <FileTextOutlined />, label: "Auto Summary" },
    ],
  },
  {
    key: "academic",
    label: "Academic & Research",
    type: "group",
    children: [
      { key: "plagiarism", icon: <SearchOutlined />, label: "Plagiarism Checker" },
      { key: "citations", icon: <BookOutlined />, label: "Citation Generator" },
      { key: "paper-gen", icon: <ReadOutlined />, label: "Paper Generator" },
    ],
  },
];

export default function AppSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const sortedRoutes = useMemo(
    () => Object.entries(ROUTES).sort((a, b) => b[1].length - a[1].length),
    []
  );

  // IMPORTANT: "/app" matches everything, so we match the LONGEST route first
  const selectedKey =
    sortedRoutes.find(([, path]) => pathname === path || pathname.startsWith(path + "/"))?.[0] ||
    (pathname === "/app" ? "dashboard" : "");

  return (
    <Sider style={siderStyle} className="app-sider" width={220}>
      <div style={{ padding: 0 }}>
        <ApplicationLogo />
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
        style={{ border: "none" }}
        onClick={({ key }) => {
          const to = ROUTES[key];
          if (to) navigate(to);
        }}
      />
    </Sider>
  );
}
