// src/pages/Dashboard.jsx
import React, { useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  List,
  Tag,
  Tabs,
  Input,
  Modal,
  Form,
  message,
  Empty,
} from "antd";
import {
  PlusOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  BookOutlined,
  ReadOutlined,
  SafetyOutlined,
  RadarChartOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const ACADEMIC_TOOL_ROUTES = {
  plagiarism: "/app/plagiarism",
  citations: "/app/citations",
  "paper-gen": "/app/paper-generator",
  "ai-detector": "/app/ai-detector",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Dummy data (replace with API)
  const [projects, setProjects] = useState([
    {
      id: "p1",
      name: "MSc Application — Dubai",
      description: "SOP, CV, scholarship emails, and docs.",
      updatedAt: "2 hours ago",
      tags: ["SOP", "Academic"],
    },
    {
      id: "p2",
      name: "Research Paper — Literature Review",
      description: "Citations + plagiarism + outline.",
      updatedAt: "Yesterday",
      tags: ["Research", "Citations"],
    },
  ]);

  const activities = useMemo(
    () => [
      { id: 1, text: "Generated APA citations for “Literature Review”.", time: "25 min ago" },
      { id: 2, text: "Plagiarism check completed for “SOP — Dubai”.", time: "4 hours ago" },
      { id: 3, text: "AI Detector suggested rewrites for a paragraph.", time: "Yesterday" },
    ],
    []
  );

  const academicTools = useMemo(
    () => [
      {
        key: "paper-gen",
        title: "Academic Paper Generator",
        desc: "Essay, Research Paper, Thesis, SOP (sectioned templates).",
        icon: <ReadOutlined />,
      },
      {
        key: "citations",
        title: "Citation Generator",
        desc: "APA/MLA/Harvard/Chicago + auto bibliography.",
        icon: <BookOutlined />,
      },
      {
        key: "plagiarism",
        title: "Plagiarism Checker",
        desc: "Highlights duplicate content + suggests citation/paraphrase.",
        icon: <SafetyOutlined />,
      },
      {
        key: "ai-detector",
        title: "AI Detector & Rewriter",
        desc: "Detect GPT-style writing and recommend edits.",
        icon: <RadarChartOutlined />,
      },
    ],
    []
  );

  const filteredProjects = projects.filter((p) =>
    (p.name + " " + (p.description || "")).toLowerCase().includes(search.toLowerCase())
  );

  const openProject = (projectId) => {
    // TODO: route to project details page
    message.info(`Open project: ${projectId} (hook to your route)`);
    // navigate(`/app/projects/${projectId}`);
  };

  const createProject = (values) => {
    const newProject = {
      id: `p_${Date.now()}`,
      name: values.name,
      description: values.description || "",
      updatedAt: "just now",
      tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };
    setProjects((prev) => [newProject, ...prev]);
    setProjectModalOpen(false);
    message.success("Project created.");
  };

  const goTool = (key) => {
    const to = ACADEMIC_TOOL_ROUTES[key];
    if (to) navigate(to);
    else message.warning("Route not set.");
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Row gutter={[16, 16]}>
        {/* Page title */}
        <Col span={24}>
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Title level={2} style={{ margin: 0 }}>
              Home
            </Title>
            <Text type="secondary">
              Organize work into projects, then use academic tools, then track activity.
            </Text>
          </Space>
        </Col>

        {/* 1) Projects Section */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <FolderOpenOutlined />
                Projects
              </Space>
            }
            extra={
              <Space>
                <Input
                  allowClear
                  placeholder="Search projects..."
                  prefix={<SearchOutlined />}
                  style={{ width: 260 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalOpen(true)}>
                  New Project
                </Button>
              </Space>
            }
          >
            {filteredProjects.length === 0 ? (
              <Empty description="No projects yet. Create one to organize your docs." />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={filteredProjects}
                renderItem={(p) => (
                  <List.Item
                    actions={[
                      <Button key="open" type="link" onClick={() => openProject(p.id)}>
                        Open
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Text strong>{p.name}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Updated {p.updatedAt}
                          </Text>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                          {p.description ? <Text type="secondary">{p.description}</Text> : null}
                          <Space wrap>
                            {p.tags?.map((t) => (
                              <Tag key={t}>{t}</Tag>
                            ))}
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 2) Academic Tools Tabs */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <BookOutlined />
                Academic Tools
              </Space>
            }
          >
            <Tabs
              defaultActiveKey="tools"
              items={[
                {
                  key: "tools",
                  label: "Tools",
                  children: (
                    <Row gutter={[12, 12]}>
                      {academicTools.map((t) => (
                        <Col key={t.key} xs={24} md={12} lg={6}>
                          <Card hoverable onClick={() => goTool(t.key)} style={{ height: "100%" }}>
                            <Space direction="vertical" size={6}>
                              <Space>
                                {t.icon}
                                <Text strong>{t.title}</Text>
                              </Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {t.desc}
                              </Text>
                              <Button type="link" style={{ padding: 0 }}>
                                Open →
                              </Button>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ),
                },
                {
                  key: "templates",
                  label: "Templates",
                  children: (
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={8}>
                        <Card hoverable onClick={() => message.info("Template: SOP (hook it)")}>
                          <Text strong>SOP Template</Text>
                          <div><Text type="secondary">Structured SOP sections + tone guidance.</Text></div>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card hoverable onClick={() => message.info("Template: Research Paper (hook it)")}>
                          <Text strong>Research Paper Template</Text>
                          <div><Text type="secondary">Abstract → Methods → Results → Discussion.</Text></div>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card hoverable onClick={() => message.info("Template: Essay (hook it)")}>
                          <Text strong>Essay Template</Text>
                          <div><Text type="secondary">Outline + thesis statement helper.</Text></div>
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* 3) Recent Activities */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                Recent Activities
              </Space>
            }
          >
            <List
              dataSource={activities}
              renderItem={(a) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text>{a.text}</Text>}
                    description={<Text type="secondary">{a.time}</Text>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Create Project Modal */}
      <Modal
        title="Create Project"
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={createProject}>
          <Form.Item
            label="Project name"
            name="name"
            rules={[{ required: true, message: "Project name is required" }]}
          >
            <Input placeholder="e.g., MSc Applications — Dubai" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea placeholder="Short description (optional)" autoSize={{ minRows: 3, maxRows: 6 }} />
          </Form.Item>

          <Form.Item label="Tags (comma separated)" name="tags">
            <Input placeholder="e.g., SOP, Research, Citations" />
          </Form.Item>

          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setProjectModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Create
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
