// src/views/grammar/index.jsx
import React, { useMemo, useRef, useState } from "react";
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
  Switch,
  Tag,
  Divider,
  Alert,
  message,
  theme,
  Badge,
  Tooltip,
  Progress,
  Segmented,
  Collapse,
  Empty,
} from "antd";
import {
  CheckCircleOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  BulbOutlined,
  SafetyOutlined,
  SoundOutlined,
  EyeOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import * as Yup from "yup";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * ✅ API in same file (as you asked)
 * .env (later):
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

const DIALECTS = [
  { value: "auto", label: "Auto" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-AU", label: "English (AU)" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "confident", label: "Confident" },
  { value: "friendly", label: "Friendly" },
  { value: "empathetic", label: "Empathetic" },
];

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "correctness", label: "Correctness" },
  { key: "clarity", label: "Clarity" },
  { key: "engagement", label: "Engagement" },
  { key: "delivery", label: "Delivery" },
  { key: "style", label: "Style" },
];

function countWords(text = "") {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function safeClamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Issues expected from backend:
 * [
 *  {
 *    id: "iss_1",
 *    start: 10,            // character offset (inclusive)
 *    end: 15,              // character offset (exclusive)
 *    original: "teh",
 *    message: "Spelling mistake",
 *    category: "correctness" | "clarity" | "engagement" | "delivery" | "style",
 *    severity: "low" | "medium" | "high",
 *    suggestions: ["the", "ten", ...], // optional
 *    explanation: "Optional longer reasoning",
 *    rule: "SPELLING" // optional
 *  }
 * ]
 */

function severityColor(sev) {
  if (sev === "high") return "red";
  if (sev === "medium") return "orange";
  return "green";
}

function categoryIcon(cat) {
  if (cat === "correctness") return <SafetyOutlined />;
  if (cat === "clarity") return <EyeOutlined />;
  if (cat === "engagement") return <SmileOutlined />;
  if (cat === "delivery") return <SoundOutlined />;
  return <BulbOutlined />;
}

function applyEdit(text, issue, replacement) {
  const start = safeClamp(issue.start, 0, text.length);
  const end = safeClamp(issue.end, start, text.length);
  return text.slice(0, start) + replacement + text.slice(end);
}

function buildHighlightedHTML(text, issues, activeId) {
  // Simple highlight renderer for preview (not a rich editor).
  // We assume issues are in-range; if overlapping, later ones may render weird (backend should avoid overlaps).
  const sorted = [...issues].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;

  for (const iss of sorted) {
    const s = safeClamp(iss.start, 0, text.length);
    const e = safeClamp(iss.end, s, text.length);
    if (s < cursor) continue; // skip overlaps behind cursor

    out += escapeHtml(text.slice(cursor, s));

    const bg =
      iss.id === activeId
        ? "rgba(0,67,202,0.25)"
        : iss.severity === "high"
        ? "rgba(255,77,79,0.22)"
        : iss.severity === "medium"
        ? "rgba(250,173,20,0.22)"
        : "rgba(82,196,26,0.18)";

    out += `<mark data-iss="${iss.id}" style="background:${bg}; padding:1px 2px; border-radius:4px;">${escapeHtml(
      text.slice(s, e)
    )}</mark>`;

    cursor = e;
  }

  out += escapeHtml(text.slice(cursor));
  return out;
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function GrammarAndStyle() {
  const { token } = theme.useToken();

  const [output, setOutput] = useState("");
  const [issues, setIssues] = useState([]);
  const [apiError, setApiError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [viewMode, setViewMode] = useState("suggestions"); // suggestions | preview
  const previewRef = useRef(null);

  const formik = useFormik({
    initialValues: {
      inputText: "",
      language: "auto",
      dialect: "auto",
      targetTone: "professional",

      goalsCorrectness: true,
      goalsClarity: true,
      goalsEngagement: true,
      goalsDelivery: true,

      // Grammarly-ish toggles
      detectPassive: true,
      conciseness: true,
      inclusiveLanguage: true,
      formalStyle: false,
    },
    validationSchema: Yup.object({
      inputText: Yup.string()
        .trim()
        .min(10, "Please enter at least 10 characters.")
        .required("Input text is required."),
    }),
    onSubmit: async (values) => {
      setApiError("");
      setOutput("");
      setIssues([]);
      setActiveIssueId(null);

      try {
        /**
         * 🔌 Backend contract (recommended)
         * POST /api/grammar-check
         * Body:
         * {
         *  text,
         *  language,
         *  dialect,
         *  tone,
         *  goals: { correctness, clarity, engagement, delivery },
         *  options: { detectPassive, conciseness, inclusiveLanguage, formalStyle }
         * }
         * Response:
         * {
         *  correctedText: string,
         *  issues: Issue[],
         *  scores: { correctness, clarity, engagement, delivery, overall } // 0-100 optional
         * }
         */
        const payload = {
          text: values.inputText,
          language: values.language,
          dialect: values.dialect,
          tone: values.targetTone,
          goals: {
            correctness: values.goalsCorrectness,
            clarity: values.goalsClarity,
            engagement: values.goalsEngagement,
            delivery: values.goalsDelivery,
          },
          options: {
            detectPassive: values.detectPassive,
            conciseness: values.conciseness,
            inclusiveLanguage: values.inclusiveLanguage,
            formalStyle: values.formalStyle,
          },
        };

        const res = await api.post("/api/grammar-check", payload);

        const corrected = res?.data?.correctedText ?? "";
        const foundIssues = res?.data?.issues ?? [];
        const scores = res?.data?.scores ?? null;

        if (!corrected && !foundIssues?.length) {
          setApiError("Backend returned empty results. Return { correctedText, issues } at minimum.");
          return;
        }

        setOutput(corrected || values.inputText);
        setIssues(Array.isArray(foundIssues) ? foundIssues : []);
        message.success("Check completed.");

        // Optional: show a quick score toast
        if (scores?.overall != null) {
          message.info(`Overall score: ${scores.overall}/100`);
        }
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

  const filteredIssues = useMemo(() => {
    if (activeCategory === "all") return issues;
    return issues.filter((i) => i.category === activeCategory);
  }, [issues, activeCategory]);

  const countsByCategory = useMemo(() => {
    const base = { all: issues.length };
    for (const c of CATEGORIES) {
      if (c.key === "all") continue;
      base[c.key] = issues.filter((i) => i.category === c.key).length;
    }
    return base;
  }, [issues]);

  const overallScore = useMemo(() => {
    // fake "overall score" if backend doesn't provide; just for UI polish
    if (!formik.values.inputText.trim()) return 0;
    const penalty = safeClamp(issues.length * 3, 0, 60);
    return safeClamp(90 - penalty, 35, 95);
  }, [issues, formik.values.inputText]);

  const highlightedPreviewHTML = useMemo(() => {
    const textToPreview = output || formik.values.inputText || "";
    return buildHighlightedHTML(textToPreview, filteredIssues, activeIssueId);
  }, [output, formik.values.inputText, filteredIssues, activeIssueId]);

  const activeIssue = useMemo(
    () => issues.find((i) => i.id === activeIssueId) || null,
    [issues, activeIssueId]
  );

  const runCheck = () => formik.handleSubmit();

  const clearAll = () => {
    formik.resetForm();
    setOutput("");
    setIssues([]);
    setApiError("");
    setActiveIssueId(null);
    message.success("Cleared.");
  };

  const copyOutput = async () => {
    const text = (output || "").trim();
    if (!text) return message.warning("Nothing to copy yet.");
    await navigator.clipboard.writeText(text);
    message.success("Copied to clipboard.");
  };

  const replaceInput = () => {
    const text = (output || "").trim();
    if (!text) return message.warning("Nothing to apply yet.");
    formik.setFieldValue("inputText", text);
    message.success("Replaced input with corrected text.");
  };

  const insertBelow = () => {
    const text = (output || "").trim();
    if (!text) return message.warning("Nothing to insert yet.");
    formik.setFieldValue("inputText", `${formik.values.inputText}\n\n---\n\n${text}`);
    message.success("Inserted corrected text below input.");
  };

  const acceptSuggestion = (issue, suggestion) => {
    const base = output || formik.values.inputText || "";
    const next = applyEdit(base, issue, suggestion);

    // Apply and then remove this issue (offsets change; real apps re-run analysis)
    setOutput(next);
    setIssues((prev) => prev.filter((x) => x.id !== issue.id));
    setActiveIssueId(null);
    message.success("Applied suggestion.");
  };

  const ignoreSuggestion = (issueId) => {
    setIssues((prev) => prev.filter((x) => x.id !== issueId));
    if (activeIssueId === issueId) setActiveIssueId(null);
    message.info("Ignored.");
  };

  const autofixAll = () => {
    if (!issues.length) return message.info("No issues to fix.");
    let base = output || formik.values.inputText || "";

    // Only apply "low" severity with first suggestion
    const fixables = issues
      .filter((i) => i.severity === "low" && Array.isArray(i.suggestions) && i.suggestions.length)
      .sort((a, b) => a.start - b.start);

    if (!fixables.length) return message.info("No safe autofix suggestions found.");

    // Apply from end to start to keep offsets stable
    const fromEnd = [...fixables].sort((a, b) => b.start - a.start);
    for (const iss of fromEnd) {
      base = applyEdit(base, iss, iss.suggestions[0]);
    }

    setOutput(base);
    setIssues((prev) => prev.filter((i) => !fixables.some((f) => f.id === i.id)));
    setActiveIssueId(null);
    message.success(`Auto-fixed ${fixables.length} issues.`);
  };

  const onPreviewClick = (e) => {
    const mark = e.target?.closest?.("mark");
    if (!mark) return;
    const id = mark.getAttribute("data-iss");
    if (!id) return;
    setActiveIssueId(id);
    setViewMode("suggestions");
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Grammar & Style
        </Title>
        <Text type="secondary">
          Grammarly-style experience: goals, categories, highlights, and one-click fixes.
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

          <Col xs={24} md={6}>
            <Text type="secondary">Dialect</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.dialect}
              options={DIALECTS}
              onChange={(v) => formik.setFieldValue("dialect", v)}
            />
          </Col>

          <Col xs={24} md={6}>
            <Text type="secondary">Target tone</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.targetTone}
              options={TONES}
              onChange={(v) => formik.setFieldValue("targetTone", v)}
            />
          </Col>

          <Col xs={24} md={6}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button icon={<ReloadOutlined />} onClick={clearAll}>
                Clear
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                loading={formik.isSubmitting}
                onClick={runCheck}
              >
                Run check
              </Button>
            </Space>
          </Col>

          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
          </Col>

          {/* Goals */}
          <Col xs={24} md={14}>
            <Space wrap size={16}>
              <Tooltip title="Fix grammar, spelling, punctuation">
                <Space>
                  <Switch
                    checked={formik.values.goalsCorrectness}
                    onChange={(v) => formik.setFieldValue("goalsCorrectness", v)}
                  />
                  <Text>Correctness</Text>
                </Space>
              </Tooltip>
              <Tooltip title="Make it clearer and easier to understand">
                <Space>
                  <Switch
                    checked={formik.values.goalsClarity}
                    onChange={(v) => formik.setFieldValue("goalsClarity", v)}
                  />
                  <Text>Clarity</Text>
                </Space>
              </Tooltip>
              <Tooltip title="Keep it engaging and less boring">
                <Space>
                  <Switch
                    checked={formik.values.goalsEngagement}
                    onChange={(v) => formik.setFieldValue("goalsEngagement", v)}
                  />
                  <Text>Engagement</Text>
                </Space>
              </Tooltip>
              <Tooltip title="Improve tone, confidence, and delivery">
                <Space>
                  <Switch
                    checked={formik.values.goalsDelivery}
                    onChange={(v) => formik.setFieldValue("goalsDelivery", v)}
                  />
                  <Text>Delivery</Text>
                </Space>
              </Tooltip>
            </Space>
          </Col>

          {/* Pro toggles */}
          <Col xs={24} md={10}>
            <Space wrap size={14} style={{ width: "100%", justifyContent: "flex-end" }}>
              <Tooltip title="Detect passive voice and suggest active voice">
                <Space>
                  <Switch
                    checked={formik.values.detectPassive}
                    onChange={(v) => formik.setFieldValue("detectPassive", v)}
                  />
                  <Text>Passive</Text>
                </Space>
              </Tooltip>
              <Tooltip title="Remove unnecessary words">
                <Space>
                  <Switch
                    checked={formik.values.conciseness}
                    onChange={(v) => formik.setFieldValue("conciseness", v)}
                  />
                  <Text>Concise</Text>
                </Space>
              </Tooltip>
              <Tooltip title="Flag non-inclusive words and suggest alternatives">
                <Space>
                  <Switch
                    checked={formik.values.inclusiveLanguage}
                    onChange={(v) => formik.setFieldValue("inclusiveLanguage", v)}
                  />
                  <Text>Inclusive</Text>
                </Space>
              </Tooltip>
              <Tooltip title="Prefer formal style suggestions">
                <Space>
                  <Switch
                    checked={formik.values.formalStyle}
                    onChange={(v) => formik.setFieldValue("formalStyle", v)}
                  />
                  <Text>Formal</Text>
                </Space>
              </Tooltip>
            </Space>
          </Col>

          {apiError ? (
            <Col xs={24}>
              <Alert type="error" showIcon message="Grammar check failed" description={apiError} />
            </Col>
          ) : null}
        </Row>
      </Card>

      {/* Main responsive workspace */}
      <Row gutter={[16, 16]}>
        {/* Left: Editor */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                Editor
              </Space>
            }
            extra={
              <Space size={10}>
                <Tag>{words} words</Tag>
                <Tag color="blue">Score {overallScore}/100</Tag>
              </Space>
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            <TextArea
              value={formik.values.inputText}
              onChange={(e) => formik.setFieldValue("inputText", e.target.value)}
              onBlur={formik.handleBlur}
              placeholder="Paste or write your content here..."
              autoSize={{ minRows: 14, maxRows: 24 }}
              style={{ borderRadius: token.borderRadiusLG }}
            />

            {formik.touched.inputText && formik.errors.inputText ? (
              <Text type="danger" style={{ display: "block", marginTop: 8 }}>
                {formik.errors.inputText}
              </Text>
            ) : (
              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                Tip: Run check, then apply suggestions one-by-one or auto-fix safe ones.
              </Text>
            )}

            <Divider style={{ margin: "12px 0" }} />

            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Space>
                <Button icon={<ThunderboltOutlined />} onClick={autofixAll} disabled={!issues.length}>
                  Auto-fix safe
                </Button>
                <Button icon={<ReloadOutlined />} onClick={runCheck} loading={formik.isSubmitting}>
                  Re-check
                </Button>
              </Space>

              <Space>
                <Button icon={<CopyOutlined />} onClick={copyOutput} disabled={!output}>
                  Copy corrected
                </Button>
                <Button icon={<SwapOutlined />} onClick={replaceInput} disabled={!output}>
                  Replace
                </Button>
                <Button icon={<PlusOutlined />} onClick={insertBelow} disabled={!output}>
                  Insert
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Right: Suggestions + Preview */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FilterOutlined />
                Suggestions
              </Space>
            }
            extra={
              <Space size={10}>
                <Segmented
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { label: "Suggestions", value: "suggestions" },
                    { label: "Highlights", value: "preview" },
                  ]}
                />
                <Badge count={issues.length} showZero />
              </Space>
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            {/* Category tabs (Grammarly-like) */}
            <Space wrap style={{ marginBottom: 12 }}>
              {CATEGORIES.map((c) => (
                <Button
                  key={c.key}
                  type={activeCategory === c.key ? "primary" : "default"}
                  onClick={() => setActiveCategory(c.key)}
                >
                  {c.label}{" "}
                  <Tag style={{ marginLeft: 8 }} color={activeCategory === c.key ? "blue" : "default"}>
                    {countsByCategory[c.key] ?? 0}
                  </Tag>
                </Button>
              ))}
            </Space>

            {viewMode === "preview" ? (
              <>
                <Text type="secondary">
                  Click highlighted text to jump to the suggestion.
                </Text>
                <Divider style={{ margin: "10px 0" }} />

                <div
                  ref={previewRef}
                  onClick={onPreviewClick}
                  style={{
                    minHeight: 280,
                    maxHeight: 520,
                    overflow: "auto",
                    padding: 12,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    cursor: "pointer",
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightedPreviewHTML }}
                />

                {activeIssue ? (
                  <>
                    <Divider style={{ margin: "12px 0" }} />
                    <ActiveIssuePanel
                      issue={activeIssue}
                      onAccept={acceptSuggestion}
                      onIgnore={ignoreSuggestion}
                    />
                  </>
                ) : null}
              </>
            ) : (
              <>
                {/* Suggestions list */}
                {filteredIssues.length === 0 ? (
                  <Empty
                    description={
                      issues.length
                        ? "No suggestions in this category."
                        : "No suggestions yet. Run a check."
                    }
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredIssues.map((iss) => (
                      <Card
                        key={iss.id}
                        size="small"
                        hoverable
                        style={{
                          borderRadius: token.borderRadiusLG,
                          border:
                            activeIssueId === iss.id
                              ? `1px solid ${token.colorPrimary}`
                              : `1px solid ${token.colorBorderSecondary}`,
                        }}
                        bodyStyle={{ padding: 12 }}
                        onClick={() => setActiveIssueId(iss.id)}
                      >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <Space>
                            {categoryIcon(iss.category)}
                            <Text strong>{capitalize(iss.category || "style")}</Text>
                            <Tag color={severityColor(iss.severity)}>{iss.severity || "low"}</Tag>
                          </Space>
                          <Button type="text" onClick={(e) => (e.stopPropagation(), ignoreSuggestion(iss.id))}>
                            Ignore
                          </Button>
                        </Space>

                        <div style={{ marginTop: 6 }}>
                          <Text>{iss.message || "Suggestion"}</Text>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">Original:</Text>{" "}
                          <Tag>{(iss.original ?? "").slice(0, 80) || "—"}</Tag>
                        </div>

                        {Array.isArray(iss.suggestions) && iss.suggestions.length ? (
                          <Space wrap style={{ marginTop: 10 }}>
                            {iss.suggestions.slice(0, 4).map((sug, idx) => (
                              <Button
                                key={idx}
                                type="primary"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptSuggestion(iss, sug);
                                }}
                              >
                                {sug}
                              </Button>
                            ))}
                            {iss.suggestions.length > 4 ? (
                              <Tag>+{iss.suggestions.length - 4} more</Tag>
                            ) : null}
                          </Space>
                        ) : (
                          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                            No direct replacement — consider rewriting this part.
                          </Text>
                        )}

                        {iss.explanation ? (
                          <Collapse
                            size="small"
                            style={{ marginTop: 10 }}
                            items={[
                              {
                                key: "why",
                                label: "Why this matters",
                                children: <Text type="secondary">{iss.explanation}</Text>,
                              },
                            ]}
                          />
                        ) : null}
                      </Card>
                    ))}
                  </div>
                )}

                {activeIssue ? (
                  <>
                    <Divider style={{ margin: "12px 0" }} />
                    <ActiveIssuePanel
                      issue={activeIssue}
                      onAccept={acceptSuggestion}
                      onIgnore={ignoreSuggestion}
                    />
                  </>
                ) : null}
              </>
            )}
          </Card>

          {/* Mini “Grammarly-like” scorecard */}
          <Card style={{ marginTop: 16, borderRadius: token.borderRadiusLG }} bodyStyle={{ padding: 14 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Text strong>Writing score</Text>
                <Tag color="blue">{overallScore}/100</Tag>
              </Space>

              <Progress percent={overallScore} showInfo={false} />

              <Row gutter={[10, 10]}>
                <Col span={12}>
                  <ScorePill label="Correctness" value={scoreFromCategory(issues, "correctness")} />
                </Col>
                <Col span={12}>
                  <ScorePill label="Clarity" value={scoreFromCategory(issues, "clarity")} />
                </Col>
                <Col span={12}>
                  <ScorePill label="Engagement" value={scoreFromCategory(issues, "engagement")} />
                </Col>
                <Col span={12}>
                  <ScorePill label="Delivery" value={scoreFromCategory(issues, "delivery")} />
                </Col>
              </Row>

              <Text type="secondary" style={{ fontSize: 12 }}>
                These are UI scores. If you return real scores from backend, you can replace this.
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function ActiveIssuePanel({ issue, onAccept, onIgnore }) {
  const { token } = theme.useToken();
  const hasSuggestions = Array.isArray(issue?.suggestions) && issue.suggestions.length;

  return (
    <Card
      size="small"
      style={{
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      }}
      bodyStyle={{ padding: 12 }}
    >
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Space>
          {categoryIcon(issue.category)}
          <Text strong>Selected suggestion</Text>
          <Tag color={severityColor(issue.severity)}>{issue.severity || "low"}</Tag>
        </Space>
        <Button type="text" onClick={() => onIgnore(issue.id)}>
          Ignore
        </Button>
      </Space>

      <div style={{ marginTop: 6 }}>
        <Text>{issue.message || "Suggestion"}</Text>
      </div>

      <div style={{ marginTop: 8 }}>
        <Text type="secondary">Original:</Text>{" "}
        <Tag>{(issue.original ?? "").slice(0, 120) || "—"}</Tag>
      </div>

      {hasSuggestions ? (
        <>
          <Divider style={{ margin: "10px 0" }} />
          <Text type="secondary">Apply:</Text>
          <Space wrap style={{ marginTop: 8 }}>
            {issue.suggestions.slice(0, 6).map((sug, idx) => (
              <Button key={idx} type="primary" onClick={() => onAccept(issue, sug)}>
                {sug}
              </Button>
            ))}
            {issue.suggestions.length > 6 ? <Tag>+{issue.suggestions.length - 6} more</Tag> : null}
          </Space>
        </>
      ) : (
        <Text type="secondary" style={{ display: "block", marginTop: 10 }}>
          No direct replacements — consider rewriting this section.
        </Text>
      )}

      {issue.explanation ? (
        <div style={{ marginTop: 10 }}>
          <Text type="secondary">Why:</Text>
          <div>
            <Text type="secondary">{issue.explanation}</Text>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function ScorePill({ label, value }) {
  const v = safeClamp(value, 0, 100);
  const color = v >= 85 ? "green" : v >= 70 ? "orange" : "red";
  return (
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <Text type="secondary">{label}</Text>
      <Tag color={color}>{v}/100</Tag>
    </Space>
  );
}

// UI-only scoring helper: fewer issues => higher score
function scoreFromCategory(issues, category) {
  const count = issues.filter((i) => i.category === category).length;
  const penalty = safeClamp(count * 6, 0, 60);
  return safeClamp(95 - penalty, 35, 95);
}

function capitalize(s = "") {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
