// src/views/ai-detector/index.jsx
import React, { useMemo, useState } from "react";
import axios from "axios";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Input,
  Button,
  Select,
  Slider,
  Switch,
  Tag,
  Divider,
  Alert,
  message,
  theme,
  Progress,
  Segmented,
  List,
  Empty,
  Tooltip,
} from "antd";
import {
  RadarChartOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  SwapOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import * as Yup from "yup";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * ✅ API in the same file (as you asked)
 * .env later:
 * VITE_API_BASE_URL=http://localhost:8000
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const LANGS = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "ne", label: "Nepali" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
];

const TARGETS = [
  { value: "lower_ai", label: "Reduce AI detection" },
  { value: "balanced", label: "Balanced" },
  { value: "keep_style", label: "Keep current style" },
];

function countWords(text = "") {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function riskLabel(score) {
  // score 0-100 => 0 human, 100 AI
  if (score >= 75) return { label: "High AI-likeness", color: "red", icon: <FireOutlined /> };
  if (score >= 45) return { label: "Medium AI-likeness", color: "orange", icon: <WarningOutlined /> };
  return { label: "Low AI-likeness", color: "green", icon: <CheckCircleOutlined /> };
}

export default function AiDetector() {
  const { token } = theme.useToken();
  const [apiError, setApiError] = useState("");

  // Results
  const [score, setScore] = useState(null); // 0-100 (AI likelihood)
  const [highlights, setHighlights] = useState([]); // segments with risk
  const [suggestions, setSuggestions] = useState([]); // rewrite tips
  const [rewriteText, setRewriteText] = useState(""); // rewritten output
  const [activeView, setActiveView] = useState("result"); // result | highlights | rewrite

  const formik = useFormik({
    initialValues: {
      inputText: "",
      language: "auto",

      // Detection sensitivity
      sensitivity: 60, // 0-100

      // Rewrite options
      autoRewrite: false,
      target: "lower_ai",
      strength: 55, // 0-100
      preserveMeaning: true,
      preserveTerms: true,
      addPersonalization: true,
      varySentenceLength: true,
    },
    validationSchema: Yup.object({
      inputText: Yup.string()
        .trim()
        .min(10, "Please enter at least 10 characters.")
        .required("Input text is required."),
    }),
    onSubmit: async (values) => {
      setApiError("");
      setScore(null);
      setHighlights([]);
      setSuggestions([]);
      setRewriteText("");

      try {
        /**
         * 🔌 Backend contract (recommended)
         * POST /api/ai-detect
         * Body:
         * {
         *   text, language, sensitivity,
         *   rewrite: {
         *     enabled, target, strength,
         *     preserveMeaning, preserveTerms,
         *     addPersonalization, varySentenceLength
         *   }
         * }
         * Response:
         * {
         *   score: number, // 0-100 AI-likeness
         *   highlights: [
         *     { id, start, end, risk: "low"|"medium"|"high", reason }
         *   ],
         *   suggestions: [
         *     { id, title, detail, impact: "low"|"medium"|"high" }
         *   ],
         *   rewrittenText?: string
         * }
         */
        const payload = {
          text: values.inputText,
          language: values.language,
          sensitivity: values.sensitivity,
          rewrite: {
            enabled: values.autoRewrite,
            target: values.target,
            strength: values.strength,
            preserveMeaning: values.preserveMeaning,
            preserveTerms: values.preserveTerms,
            addPersonalization: values.addPersonalization,
            varySentenceLength: values.varySentenceLength,
          },
        };

        const res = await api.post("/api/ai-detect", payload);

        const s = res?.data?.score;
        const hl = res?.data?.highlights ?? [];
        const sug = res?.data?.suggestions ?? [];
        const rewritten = res?.data?.rewrittenText ?? "";

        if (s == null && !hl.length && !sug.length && !rewritten) {
          setApiError("Backend returned empty results. Return at least { score }.");
          return;
        }

        if (s != null) setScore(clamp(Number(s), 0, 100));
        setHighlights(Array.isArray(hl) ? hl : []);
        setSuggestions(Array.isArray(sug) ? sug : []);
        setRewriteText(rewritten || "");

        message.success("AI detection completed.");

        if (values.autoRewrite && rewritten) setActiveView("rewrite");
        else setActiveView("result");
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Something went wrong.";
        setApiError(msg);
      }
    },
  });

  const words = useMemo(() => countWords(formik.values.inputText), [formik.values.inputText]);

  const labelInfo = useMemo(() => {
    if (score == null) return null;
    return riskLabel(score);
  }, [score]);

  const copyRewrite = async () => {
    if (!rewriteText.trim()) return message.warning("Nothing to copy yet.");
    await navigator.clipboard.writeText(rewriteText);
    message.success("Copied rewrite to clipboard.");
  };

  const replaceInput = () => {
    if (!rewriteText.trim()) return message.warning("Nothing to apply yet.");
    formik.setFieldValue("inputText", rewriteText);
    message.success("Replaced input with rewritten text.");
  };

  const insertBelow = () => {
    if (!rewriteText.trim()) return message.warning("Nothing to insert yet.");
    formik.setFieldValue("inputText", `${formik.values.inputText}\n\n---\n\n${rewriteText}`);
    message.success("Inserted rewrite below input.");
  };

  const clearAll = () => {
    formik.resetForm();
    setApiError("");
    setScore(null);
    setHighlights([]);
    setSuggestions([]);
    setRewriteText("");
    setActiveView("result");
    message.success("Cleared.");
  };

  const run = () => formik.handleSubmit();

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          AI Detector & Rewriter
        </Title>
        <Text type="secondary">
          Detect AI-likeness, highlight risky parts, and (optionally) rewrite to sound more human.
        </Text>
      </Space>

      {/* Controls */}
      <Card style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }} bodyStyle={{ padding: 14 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Text type="secondary">Language</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.language}
              options={LANGS}
              onChange={(v) => formik.setFieldValue("language", v)}
            />
          </Col>

          <Col xs={24} md={10}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Sensitivity <Tag style={{ marginLeft: 8 }}>{formik.values.sensitivity}%</Tag>
              </Text>
              <Tooltip title="Higher sensitivity flags more patterns as AI-like.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Slider
              value={formik.values.sensitivity}
              onChange={(v) => formik.setFieldValue("sensitivity", v)}
            />
          </Col>

          <Col xs={24} md={8}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button icon={<ReloadOutlined />} onClick={clearAll}>
                Clear
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<RadarChartOutlined />}
                loading={formik.isSubmitting}
                onClick={run}
              >
                Detect
              </Button>
            </Space>
          </Col>

          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
          </Col>

          <Col xs={24} md={6}>
            <Space>
              <Switch
                checked={formik.values.autoRewrite}
                onChange={(v) => formik.setFieldValue("autoRewrite", v)}
              />
              <Text>Auto rewrite</Text>
            </Space>
          </Col>

          <Col xs={24} md={6}>
            <Text type="secondary">Rewrite target</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.target}
              options={TARGETS}
              onChange={(v) => formik.setFieldValue("target", v)}
              disabled={!formik.values.autoRewrite}
            />
          </Col>

          <Col xs={24} md={12}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Rewrite strength <Tag style={{ marginLeft: 8 }}>{formik.values.strength}%</Tag>
              </Text>
              <Tooltip title="Higher strength changes more. Lower strength keeps closer to original.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Slider
              value={formik.values.strength}
              onChange={(v) => formik.setFieldValue("strength", v)}
              disabled={!formik.values.autoRewrite}
            />
          </Col>

          <Col xs={24}>
            <Space wrap size={16} style={{ width: "100%", justifyContent: "flex-end" }}>
              <Space>
                <Switch
                  checked={formik.values.preserveMeaning}
                  onChange={(v) => formik.setFieldValue("preserveMeaning", v)}
                  disabled={!formik.values.autoRewrite}
                />
                <Text>Preserve meaning</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.preserveTerms}
                  onChange={(v) => formik.setFieldValue("preserveTerms", v)}
                  disabled={!formik.values.autoRewrite}
                />
                <Text>Preserve key terms</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.addPersonalization}
                  onChange={(v) => formik.setFieldValue("addPersonalization", v)}
                  disabled={!formik.values.autoRewrite}
                />
                <Text>Add personalization</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.varySentenceLength}
                  onChange={(v) => formik.setFieldValue("varySentenceLength", v)}
                  disabled={!formik.values.autoRewrite}
                />
                <Text>Vary sentence length</Text>
              </Space>
            </Space>
          </Col>

          {apiError ? (
            <Col xs={24}>
              <Alert type="error" showIcon message="AI detection failed" description={apiError} />
            </Col>
          ) : null}
        </Row>
      </Card>

      {/* Workspace */}
      <Row gutter={[16, 16]}>
        {/* Input */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <RadarChartOutlined />
                Input
              </Space>
            }
            extra={<Tag>{words} words</Tag>}
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            <TextArea
              value={formik.values.inputText}
              onChange={(e) => formik.setFieldValue("inputText", e.target.value)}
              onBlur={formik.handleBlur}
              placeholder="Paste or write content to detect AI-likeness..."
              autoSize={{ minRows: 14, maxRows: 24 }}
              style={{ borderRadius: token.borderRadiusLG }}
            />

            {formik.touched.inputText && formik.errors.inputText ? (
              <Text type="danger" style={{ display: "block", marginTop: 8 }}>
                {formik.errors.inputText}
              </Text>
            ) : (
              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                Tip: If you want rewrite, turn on Auto rewrite and click Detect.
              </Text>
            )}
          </Card>
        </Col>

        {/* Results */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                Results
              </Space>
            }
            extra={
              <Segmented
                value={activeView}
                onChange={setActiveView}
                options={[
                  { label: "Result", value: "result" },
                  { label: "Highlights", value: "highlights" },
                  { label: "Rewrite", value: "rewrite" },
                ]}
              />
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            {/* RESULT VIEW */}
            {activeView === "result" ? (
              <>
                {score == null ? (
                  <Empty description="Run Detect to see AI score and suggestions." />
                ) : (
                  <>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      <Space>
                        {labelInfo?.icon}
                        <Text strong>{labelInfo?.label}</Text>
                        <Tag color={labelInfo?.color}>{score}/100</Tag>
                      </Space>
                      <Tag>Detector sensitivity: {formik.values.sensitivity}%</Tag>
                    </Space>

                    <Divider style={{ margin: "12px 0" }} />

                    <Progress percent={score} showInfo strokeLinecap="round" />

                    <Divider style={{ margin: "12px 0" }} />

                    <Text strong>Suggested improvements</Text>
                    <div style={{ marginTop: 10 }}>
                      {suggestions?.length ? (
                        <List
                          size="small"
                          dataSource={suggestions}
                          renderItem={(s) => (
                            <List.Item>
                              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                  <Text strong>{s.title || "Suggestion"}</Text>
                                  <Tag color={impactColor(s.impact)}>{s.impact || "medium"}</Tag>
                                </Space>
                                <Text type="secondary">{s.detail || "—"}</Text>
                              </Space>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Text type="secondary">No suggestions returned by backend.</Text>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : null}

            {/* HIGHLIGHTS VIEW */}
            {activeView === "highlights" ? (
              <>
                {!highlights?.length ? (
                  <Empty description="No highlighted risky segments returned." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {highlights.map((h) => (
                      <Card
                        key={h.id}
                        size="small"
                        style={{
                          borderRadius: token.borderRadiusLG,
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                        bodyStyle={{ padding: 12 }}
                      >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <Space>
                            <Tag color={riskColor(h.risk)}>{h.risk || "medium"}</Tag>
                            <Text strong>Segment</Text>
                          </Space>
                          <Text type="secondary">
                            {h.start}-{h.end}
                          </Text>
                        </Space>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">{h.reason || "No reason provided."}</Text>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {/* REWRITE VIEW */}
            {activeView === "rewrite" ? (
              <>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Text strong>Rewrite output</Text>
                  <Space>
                    <Button icon={<CopyOutlined />} onClick={copyRewrite} disabled={!rewriteText}>
                      Copy
                    </Button>
                    <Button icon={<SwapOutlined />} onClick={replaceInput} disabled={!rewriteText}>
                      Replace
                    </Button>
                    <Button icon={<PlusOutlined />} onClick={insertBelow} disabled={!rewriteText}>
                      Insert
                    </Button>
                  </Space>
                </Space>

                <Divider style={{ margin: "12px 0" }} />

                <TextArea
                  value={rewriteText}
                  readOnly
                  placeholder="Enable Auto rewrite and run Detect to get rewritten text here..."
                  autoSize={{ minRows: 14, maxRows: 24 }}
                  style={{
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillAlter,
                  }}
                />

                <Divider style={{ margin: "12px 0" }} />

                <Space wrap>
                  <Tag color="blue">{TARGETS.find((t) => t.value === formik.values.target)?.label}</Tag>
                  <Tag>Strength {formik.values.strength}%</Tag>
                  {formik.values.preserveMeaning ? <Tag color="green">Meaning preserved</Tag> : <Tag color="orange">Meaning flexible</Tag>}
                  {formik.values.addPersonalization ? <Tag color="green">Personalization</Tag> : <Tag color="orange">No personalization</Tag>}
                  {formik.values.varySentenceLength ? <Tag color="green">Varied sentences</Tag> : <Tag color="orange">Same rhythm</Tag>}
                </Space>
              </>
            ) : null}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function impactColor(impact) {
  if (impact === "high") return "red";
  if (impact === "medium") return "orange";
  return "green";
}

function riskColor(risk) {
  if (risk === "high") return "red";
  if (risk === "medium") return "orange";
  return "green";
}
