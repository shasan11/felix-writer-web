// src/views/plagiarism/index.jsx
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
  Modal,
} from "antd";
import {
  SearchOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  SwapOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  LinkOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import * as Yup from "yup";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * ✅ API in same file (as you asked)
 * .env later:
 * VITE_API_BASE_URL=http://localhost:8000
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 45000,
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

const REPORT_LEVEL = [
  { value: "summary", label: "Summary" },
  { value: "detailed", label: "Detailed" },
  { value: "forensics", label: "Forensics (Pro)" },
];

const EXCLUSIONS = [
  { value: "none", label: "No exclusions" },
  { value: "quotes", label: "Ignore quotes" },
  { value: "bibliography", label: "Ignore bibliography" },
  { value: "quotes_bib", label: "Ignore quotes + bibliography" },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function countWords(text = "") {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/**
 * Expected backend response (recommended):
 * {
 *  score: number,               // 0-100 similarity
 *  unique: number,              // 0-100 unique
 *  matchedWords: number,
 *  totalWords: number,
 *  sources: [
 *    { id, title, url, domain, similarity: number, matchedPercent: number, matchedWords: number }
 *  ],
 *  matches: [
 *    {
 *      id,
 *      start, end,              // char offsets in input
 *      text,                    // matched snippet (optional)
 *      similarity: number,      // 0-100
 *      sourceId,                // references sources[].id
 *      sourceUrl,
 *      sourceTitle,
 *      reason: "exact"|"near"|"common_phrase"|"citation_missing"
 *    }
 *  ],
 *  suggestions: [
 *    { id, title, detail, action: "cite"|"paraphrase"|"quote", severity: "low"|"medium"|"high" }
 *  ],
 *  rewrittenText?: string       // optional if autoRewrite enabled
 * }
 *
 * Minimal accepted:
 * { score: number } OR { similarity: number }
 */

function riskBadge(similarity) {
  const s = clamp(similarity ?? 0, 0, 100);
  if (s >= 40) return { label: "High", color: "red", icon: <ExclamationCircleOutlined /> };
  if (s >= 15) return { label: "Medium", color: "orange", icon: <SafetyOutlined /> };
  return { label: "Low", color: "green", icon: <CheckCircleOutlined /> };
}

function reasonLabel(r) {
  if (r === "exact") return { text: "Exact match", color: "red" };
  if (r === "near") return { text: "Near match", color: "orange" };
  if (r === "common_phrase") return { text: "Common phrase", color: "blue" };
  if (r === "citation_missing") return { text: "Citation missing", color: "purple" };
  return { text: "Match", color: "default" };
}

export default function PlagiarismChecker() {
  const { token } = theme.useToken();

  // Results
  const [apiError, setApiError] = useState("");
  const [score, setScore] = useState(null); // similarity %
  const [sources, setSources] = useState([]);
  const [matches, setMatches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [rewrittenText, setRewrittenText] = useState("");
  const [view, setView] = useState("overview"); // overview | sources | matches | rewrite
  const [selectedMatch, setSelectedMatch] = useState(null);

  const formik = useFormik({
    initialValues: {
      inputText: "",
      language: "auto",
      reportLevel: "detailed",
      exclusions: "quotes_bib",
      sensitivity: 60, // 0-100

      // Pro toggles
      showInlineHighlights: true,
      checkWeb: true,
      checkInternalLibrary: false,
      detectParaphrased: true,
      detectTranslated: false,
      includeSources: true,

      // Rewrite options (optional)
      autoRewrite: false,
      rewriteStrength: 55,
      preserveMeaning: true,
      keepCitations: true,
    },
    validationSchema: Yup.object({
      inputText: Yup.string()
        .trim()
        .min(30, "Please enter at least 30 characters for a meaningful check.")
        .required("Input text is required."),
    }),
    onSubmit: async (values) => {
      setApiError("");
      setScore(null);
      setSources([]);
      setMatches([]);
      setSuggestions([]);
      setRewrittenText("");
      setSelectedMatch(null);

      try {
        /**
         * 🔌 Backend contract (recommended)
         * POST /api/plagiarism-check
         * Body:
         * {
         *   text, language, reportLevel, exclusions, sensitivity,
         *   options: {
         *     checkWeb, checkInternalLibrary,
         *     detectParaphrased, detectTranslated,
         *     includeSources
         *   },
         *   rewrite: {
         *     enabled, strength, preserveMeaning, keepCitations
         *   }
         * }
         * Response: described above
         */
        const payload = {
          text: values.inputText,
          language: values.language,
          reportLevel: values.reportLevel,
          exclusions: values.exclusions,
          sensitivity: values.sensitivity,
          options: {
            checkWeb: values.checkWeb,
            checkInternalLibrary: values.checkInternalLibrary,
            detectParaphrased: values.detectParaphrased,
            detectTranslated: values.detectTranslated,
            includeSources: values.includeSources,
          },
          rewrite: {
            enabled: values.autoRewrite,
            strength: values.rewriteStrength,
            preserveMeaning: values.preserveMeaning,
            keepCitations: values.keepCitations,
          },
        };

        const res = await api.post("/api/plagiarism-check", payload);
        const data = res?.data || {};

        const sc = data.score ?? data.similarity;
        if (sc == null && !data.sources && !data.matches) {
          setApiError("Backend returned empty results. Return at least { score }.");
          return;
        }

        const normalizedScore = sc != null ? clamp(Number(sc), 0, 100) : null;
        setScore(normalizedScore);

        setSources(Array.isArray(data.sources) ? data.sources : []);
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setRewrittenText(data.rewrittenText || "");

        message.success("Plagiarism check completed.");

        if (values.autoRewrite && data.rewrittenText) setView("rewrite");
        else setView("overview");
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

  const badge = useMemo(() => {
    if (score == null) return null;
    return riskBadge(score);
  }, [score]);

  const unique = useMemo(() => {
    if (score == null) return null;
    return clamp(100 - score, 0, 100);
  }, [score]);

  const highlightHTML = useMemo(() => {
    if (!formik.values.showInlineHighlights) return null;
    if (!matches?.length) return escapeHtml(formik.values.inputText || "");
    return buildHighlightedHTML(formik.values.inputText || "", matches);
  }, [formik.values.inputText, matches, formik.values.showInlineHighlights]);

  const run = () => formik.handleSubmit();

  const clearAll = () => {
    formik.resetForm();
    setApiError("");
    setScore(null);
    setSources([]);
    setMatches([]);
    setSuggestions([]);
    setRewrittenText("");
    setSelectedMatch(null);
    setView("overview");
    message.success("Cleared.");
  };

  const copyText = async (t) => {
    if (!t?.trim()) return message.warning("Nothing to copy.");
    await navigator.clipboard.writeText(t);
    message.success("Copied.");
  };

  const replaceInput = (t) => {
    if (!t?.trim()) return message.warning("Nothing to apply.");
    formik.setFieldValue("inputText", t);
    message.success("Replaced input.");
  };

  const insertBelow = (t) => {
    if (!t?.trim()) return message.warning("Nothing to insert.");
    formik.setFieldValue("inputText", `${formik.values.inputText}\n\n---\n\n${t}`);
    message.success("Inserted below.");
  };

  const selectedSource = useMemo(() => {
    if (!selectedMatch?.sourceId) return null;
    return sources.find((s) => s.id === selectedMatch.sourceId) || null;
  }, [selectedMatch, sources]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Plagiarism Checker
        </Title>
        <Text type="secondary">
          Pro report: similarity score, sources, inline matches, exclusions, and optional rewrite suggestions.
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
            <Text type="secondary">Report level</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.reportLevel}
              options={REPORT_LEVEL}
              onChange={(v) => formik.setFieldValue("reportLevel", v)}
            />
          </Col>

          <Col xs={24} md={6}>
            <Text type="secondary">Exclusions</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.exclusions}
              options={EXCLUSIONS}
              onChange={(v) => formik.setFieldValue("exclusions", v)}
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
                icon={<SearchOutlined />}
                loading={formik.isSubmitting}
                onClick={run}
              >
                Check
              </Button>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Sensitivity <Tag style={{ marginLeft: 8 }}>{formik.values.sensitivity}%</Tag>
              </Text>
              <Tooltip title="Higher sensitivity flags more paraphrased or similar text.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Slider value={formik.values.sensitivity} onChange={(v) => formik.setFieldValue("sensitivity", v)} />
          </Col>

          <Col xs={24} md={12}>
            <Space wrap size={16} style={{ width: "100%", justifyContent: "flex-end" }}>
              <Space>
                <Switch checked={formik.values.checkWeb} onChange={(v) => formik.setFieldValue("checkWeb", v)} />
                <Text>Web</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.checkInternalLibrary}
                  onChange={(v) => formik.setFieldValue("checkInternalLibrary", v)}
                />
                <Text>Internal Library</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.detectParaphrased}
                  onChange={(v) => formik.setFieldValue("detectParaphrased", v)}
                />
                <Text>Paraphrase</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.detectTranslated}
                  onChange={(v) => formik.setFieldValue("detectTranslated", v)}
                />
                <Text>Translated</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.showInlineHighlights}
                  onChange={(v) => formik.setFieldValue("showInlineHighlights", v)}
                />
                <Text>Highlights</Text>
              </Space>
            </Space>
          </Col>

          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
          </Col>

          {/* Rewrite options */}
          <Col xs={24} md={5}>
            <Space>
              <Switch checked={formik.values.autoRewrite} onChange={(v) => formik.setFieldValue("autoRewrite", v)} />
              <Text>Auto rewrite</Text>
            </Space>
          </Col>

          <Col xs={24} md={7}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Rewrite strength <Tag style={{ marginLeft: 8 }}>{formik.values.rewriteStrength}%</Tag>
              </Text>
              <Tooltip title="Higher = more changes. Lower = safer, closer to original.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Slider
              value={formik.values.rewriteStrength}
              onChange={(v) => formik.setFieldValue("rewriteStrength", v)}
              disabled={!formik.values.autoRewrite}
            />
          </Col>

          <Col xs={24} md={12}>
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
                  checked={formik.values.keepCitations}
                  onChange={(v) => formik.setFieldValue("keepCitations", v)}
                  disabled={!formik.values.autoRewrite}
                />
                <Text>Keep citations</Text>
              </Space>
            </Space>
          </Col>

          {apiError ? (
            <Col xs={24}>
              <Alert type="error" showIcon message="Plagiarism check failed" description={apiError} />
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
                <FileTextOutlined />
                Document
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
              placeholder="Paste your document text here..."
              autoSize={{ minRows: 14, maxRows: 24 }}
              style={{ borderRadius: token.borderRadiusLG }}
            />

            {formik.touched.inputText && formik.errors.inputText ? (
              <Text type="danger" style={{ display: "block", marginTop: 8 }}>
                {formik.errors.inputText}
              </Text>
            ) : (
              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                Tip: Turn on “Ignore quotes + bibliography” to avoid false positives.
              </Text>
            )}

            {formik.values.showInlineHighlights ? (
              <>
                <Divider style={{ margin: "12px 0" }} />
                <Text type="secondary">Inline view (click a highlight from Matches list)</Text>
                <div
                  style={{
                    minHeight: 180,
                    maxHeight: 260,
                    overflow: "auto",
                    padding: 12,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.65,
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightHTML }}
                />
              </>
            ) : null}
          </Card>
        </Col>

        {/* Results */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                Report
              </Space>
            }
            extra={
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { label: "Overview", value: "overview" },
                  { label: "Sources", value: "sources" },
                  { label: "Matches", value: "matches" },
                  { label: "Rewrite", value: "rewrite" },
                ]}
              />
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            {/* Overview */}
            {view === "overview" ? (
              <>
                {score == null ? (
                  <Empty description="Run Check to generate plagiarism report." />
                ) : (
                  <>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      <Space>
                        {badge?.icon}
                        <Text strong>{badge?.label} similarity</Text>
                        <Tag color={badge?.color}>{score}%</Tag>
                      </Space>
                      <Tag color="green">{unique}% unique</Tag>
                    </Space>

                    <Divider style={{ margin: "12px 0" }} />

                    <Progress percent={score} showInfo strokeLinecap="round" />

                    <Divider style={{ margin: "12px 0" }} />

                    <Row gutter={[12, 12]}>
                      <Col span={12}>
                        <MiniStat label="Sources found" value={sources.length} />
                      </Col>
                      <Col span={12}>
                        <MiniStat label="Matches" value={matches.length} />
                      </Col>
                      <Col span={12}>
                        <MiniStat label="Mode" value={formik.values.reportLevel} />
                      </Col>
                      <Col span={12}>
                        <MiniStat label="Sensitivity" value={`${formik.values.sensitivity}%`} />
                      </Col>
                    </Row>

                    <Divider style={{ margin: "12px 0" }} />

                    <Text strong>Recommendations</Text>
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
                                  <Tag color={sevColor(s.severity)}>{s.severity || "medium"}</Tag>
                                </Space>
                                <Text type="secondary">{s.detail || "—"}</Text>
                                {s.action ? <Tag>{s.action}</Tag> : null}
                              </Space>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Text type="secondary">No recommendations returned by backend.</Text>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : null}

            {/* Sources */}
            {view === "sources" ? (
              <>
                {!sources?.length ? (
                  <Empty description="No sources returned." />
                ) : (
                  <List
                    itemLayout="vertical"
                    dataSource={sources}
                    renderItem={(src) => (
                      <List.Item
                        style={{
                          border: `1px solid ${token.colorBorderSecondary}`,
                          borderRadius: token.borderRadiusLG,
                          padding: 12,
                          marginBottom: 10,
                          background: token.colorFillAlter,
                        }}
                        extra={<Tag color={riskBadge(src.similarity ?? src.matchedPercent ?? 0).color}>{(src.similarity ?? src.matchedPercent ?? 0) + "%"}</Tag>}
                      >
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                          <Text strong>{src.title || src.domain || "Source"}</Text>
                          <Text type="secondary">{src.domain || ""}</Text>
                          {src.url ? (
                            <Space>
                              <LinkOutlined />
                              <a href={src.url} target="_blank" rel="noreferrer">
                                Open source
                              </a>
                            </Space>
                          ) : null}
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </>
            ) : null}

            {/* Matches */}
            {view === "matches" ? (
              <>
                {!matches?.length ? (
                  <Empty description="No matched segments returned." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {matches.map((m) => {
                      const r = reasonLabel(m.reason);
                      const b = riskBadge(m.similarity);
                      return (
                        <Card
                          key={m.id}
                          size="small"
                          hoverable
                          style={{
                            borderRadius: token.borderRadiusLG,
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                          bodyStyle={{ padding: 12 }}
                          onClick={() => setSelectedMatch(m)}
                        >
                          <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <Space>
                              <Tag color={b.color}>{b.label}</Tag>
                              <Tag color={r.color}>{r.text}</Tag>
                              <Tag>{m.similarity ?? 0}%</Tag>
                            </Space>
                            <Text type="secondary">
                              {m.start}-{m.end}
                            </Text>
                          </Space>

                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary">Matched text:</Text>{" "}
                            <Tag style={{ maxWidth: "100%" }}>
                              {(m.text || formik.values.inputText.slice(m.start, m.end) || "").slice(0, 160)}
                              {(m.text || "").length > 160 ? "..." : ""}
                            </Tag>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary">Source:</Text>{" "}
                            <Text>
                              {m.sourceTitle || selectedSourceTitle(sources, m.sourceId) || "—"}
                            </Text>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Match details modal */}
                <Modal
                  open={!!selectedMatch}
                  onCancel={() => setSelectedMatch(null)}
                  title="Match details"
                  footer={[
                    <Button key="close" onClick={() => setSelectedMatch(null)}>
                      Close
                    </Button>,
                  ]}
                >
                  {selectedMatch ? (
                    <Space direction="vertical" style={{ width: "100%" }} size={10}>
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Tag color={riskBadge(selectedMatch.similarity).color}>
                          Similarity {selectedMatch.similarity ?? 0}%
                        </Tag>
                        <Tag color={reasonLabel(selectedMatch.reason).color}>
                          {reasonLabel(selectedMatch.reason).text}
                        </Tag>
                      </Space>

                      <div>
                        <Text strong>Matched segment</Text>
                        <div style={{ marginTop: 6 }}>
                          <TextArea
                            readOnly
                            value={
                              selectedMatch.text ||
                              (formik.values.inputText || "").slice(selectedMatch.start, selectedMatch.end)
                            }
                            autoSize={{ minRows: 4, maxRows: 10 }}
                          />
                        </div>
                      </div>

                      <div>
                        <Text strong>Source</Text>
                        <div style={{ marginTop: 6 }}>
                          <Text>
                            {selectedMatch.sourceTitle || selectedSource?.title || "—"}
                          </Text>
                          {selectedMatch.sourceUrl || selectedSource?.url ? (
                            <div style={{ marginTop: 6 }}>
                              <LinkOutlined />{" "}
                              <a
                                href={selectedMatch.sourceUrl || selectedSource?.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open source
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <Alert
                        type="info"
                        showIcon
                        icon={<BulbOutlined />}
                        message="What to do"
                        description="If this is required text, add citation or quote it. Otherwise paraphrase and re-check."
                      />
                    </Space>
                  ) : null}
                </Modal>
              </>
            ) : null}

            {/* Rewrite */}
            {view === "rewrite" ? (
              <>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Text strong>Rewrite output</Text>
                  <Space>
                    <Button icon={<CopyOutlined />} onClick={() => copyText(rewrittenText)} disabled={!rewrittenText}>
                      Copy
                    </Button>
                    <Button icon={<SwapOutlined />} onClick={() => replaceInput(rewrittenText)} disabled={!rewrittenText}>
                      Replace
                    </Button>
                    <Button icon={<PlusOutlined />} onClick={() => insertBelow(rewrittenText)} disabled={!rewrittenText}>
                      Insert
                    </Button>
                  </Space>
                </Space>

                <Divider style={{ margin: "12px 0" }} />

                <TextArea
                  value={rewrittenText}
                  readOnly
                  placeholder="Enable Auto rewrite and run Check to generate rewritten text here..."
                  autoSize={{ minRows: 14, maxRows: 24 }}
                  style={{
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillAlter,
                  }}
                />
              </>
            ) : null}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/** ---------- Helpers ---------- */

function MiniStat({ label, value }) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 12,
        background: token.colorFillAlter,
      }}
    >
      <Text type="secondary">{label}</Text>
      <div>
        <Text strong style={{ fontSize: 18 }}>
          {value}
        </Text>
      </div>
    </div>
  );
}

function sevColor(sev) {
  if (sev === "high") return "red";
  if (sev === "medium") return "orange";
  return "green";
}

function selectedSourceTitle(sources, id) {
  if (!id) return "";
  const s = sources.find((x) => x.id === id);
  return s?.title || s?.domain || "";
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHighlightedHTML(text, matches) {
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;

  for (const m of sorted) {
    const s = clamp(m.start ?? 0, 0, text.length);
    const e = clamp(m.end ?? 0, s, text.length);
    if (s < cursor) continue;

    out += escapeHtml(text.slice(cursor, s));

    const color =
      (m.similarity ?? 0) >= 40
        ? "rgba(255,77,79,0.22)"
        : (m.similarity ?? 0) >= 15
        ? "rgba(250,173,20,0.22)"
        : "rgba(82,196,26,0.18)";

    out += `<mark style="background:${color}; padding:1px 2px; border-radius:4px;">${escapeHtml(
      text.slice(s, e)
    )}</mark>`;

    cursor = e;
  }

  out += escapeHtml(text.slice(cursor));
  return out;
}
