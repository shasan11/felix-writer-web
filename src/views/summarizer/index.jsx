// src/views/summarizer/index.jsx
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
  Tabs,
  Segmented,
  Upload,
  Progress,
  List,
  Empty,
  Tooltip,
} from "antd";
import {
  FileTextOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  SwapOutlined,
  PlusOutlined,
  UploadOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  DownOutlined,
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

const FORMATS = [
  { value: "bullets", label: "Bullet Summary" },
  { value: "abstract", label: "Abstract" },
  { value: "executive", label: "Executive Summary" },
  { value: "tl;dr", label: "TL;DR" },
  { value: "outline", label: "Outline" },
];

const AUDIENCE = [
  { value: "general", label: "General" },
  { value: "student", label: "Student" },
  { value: "researcher", label: "Researcher" },
  { value: "executive", label: "Executive" },
  { value: "engineer", label: "Engineer" },
];

const TONES = [
  { value: "neutral", label: "Neutral" },
  { value: "professional", label: "Professional" },
  { value: "academic", label: "Academic" },
  { value: "simple", label: "Simple" },
  { value: "persuasive", label: "Persuasive" },
];

function countWords(text = "") {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function estimateReadingTime(words) {
  // ~200 wpm
  if (!words) return 0;
  return Math.max(1, Math.round(words / 200));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Expected backend response (recommended):
 * {
 *   summaries: [
 *     {
 *       id: "v1",
 *       title: "Optional",
 *       summary: "Main summary text",
 *       bullets: ["...", "..."],
 *       keyPoints: ["...", "..."],
 *       actionItems: ["...", "..."],
 *       outline: ["I. ...", "II. ..."],
 *       questions: ["Q1 ...", "Q2 ..."],
 *       keywords: ["...", "..."],
 *       citations: ["(Smith, 2020) ..."] // optional
 *     }
 *   ],
 *   meta: {
 *     detectedLanguage: "en",
 *     inputWords: 1200,
 *     compressionRatio: 0.18
 *   }
 * }
 *
 * Minimal accepted:
 * { summary: "..." }  OR { output: "..." }
 */

export default function Summarizer() {
  const { token } = theme.useToken();

  // Results
  const [apiError, setApiError] = useState("");
  const [meta, setMeta] = useState(null);
  const [variants, setVariants] = useState([]); // array of variant objects
  const [activeVariant, setActiveVariant] = useState("v1");
  const [rightTab, setRightTab] = useState("summary"); // summary | keypoints | actions | outline | questions
  const [inputMode, setInputMode] = useState("text"); // text | url | file

  const formik = useFormik({
    initialValues: {
      inputText: "",
      inputUrl: "",
      // file handling (we store file object name only; upload to backend later)
      file: null,

      language: "auto",
      format: "bullets",
      tone: "professional",
      audience: "general",

      length: 40, // 0-100 (short->long)
      includeTitle: true,
      includeKeywords: true,
      includeKeyPoints: true,
      includeActionItems: true,
      includeQuestions: true,
      includeOutline: true,

      preserveFacts: true,
      preserveCitations: true,
      highlightImportant: true,

      focus: "", // keywords / focus area
      maxBullets: 8,
      variantsCount: 3, // 1-5
    },
    validationSchema: Yup.object({
      inputText: Yup.string().when([], {
        is: () => inputMode === "text",
        then: (s) => s.trim().min(10, "Please enter at least 10 characters.").required("Text is required."),
        otherwise: (s) => s,
      }),
      inputUrl: Yup.string().when([], {
        is: () => inputMode === "url",
        then: (s) =>
          s.trim().url("Enter a valid URL (include https://)").required("URL is required."),
        otherwise: (s) => s,
      }),
    }),
    onSubmit: async (values) => {
      setApiError("");
      setVariants([]);
      setMeta(null);
      setActiveVariant("v1");
      setRightTab("summary");

      try {
        /**
         * 🔌 Backend contract (recommended)
         * POST /api/summarize
         * Body:
         * {
         *   input: { type: "text"|"url"|"file", text?, url?, fileName? },
         *   language, format, tone, audience,
         *   length, focus,
         *   features: { includeTitle, includeKeywords, includeKeyPoints, includeActionItems, includeQuestions, includeOutline },
         *   options: { preserveFacts, preserveCitations, highlightImportant, maxBullets },
         *   variantsCount
         * }
         */
        const input =
          inputMode === "text"
            ? { type: "text", text: values.inputText }
            : inputMode === "url"
            ? { type: "url", url: values.inputUrl }
            : { type: "file", fileName: values.file?.name || "" }; // later: multipart upload

        const payload = {
          input,
          language: values.language,
          format: values.format,
          tone: values.tone,
          audience: values.audience,
          length: values.length,
          focus: values.focus,
          features: {
            includeTitle: values.includeTitle,
            includeKeywords: values.includeKeywords,
            includeKeyPoints: values.includeKeyPoints,
            includeActionItems: values.includeActionItems,
            includeQuestions: values.includeQuestions,
            includeOutline: values.includeOutline,
          },
          options: {
            preserveFacts: values.preserveFacts,
            preserveCitations: values.preserveCitations,
            highlightImportant: values.highlightImportant,
            maxBullets: values.maxBullets,
          },
          variantsCount: values.variantsCount,
        };

        const res = await api.post("/api/summarize", payload);

        // Normalize response
        const data = res?.data || {};
        const v = Array.isArray(data.summaries) ? data.summaries : [];

        if (v.length) {
          setVariants(v.map((x, i) => ({ id: x.id || `v${i + 1}`, ...x })));
          setActiveVariant(v[0].id || "v1");
          setMeta(data.meta || null);
          message.success("Summary generated.");
          return;
        }

        // Minimal response fallback
        const minimal = data.summary || data.output || "";
        if (minimal) {
          const single = {
            id: "v1",
            title: data.title || "",
            summary: minimal,
            bullets: data.bullets || [],
            keyPoints: data.keyPoints || [],
            actionItems: data.actionItems || [],
            outline: data.outline || [],
            questions: data.questions || [],
            keywords: data.keywords || [],
          };
          setVariants([single]);
          setActiveVariant("v1");
          setMeta(data.meta || null);
          message.success("Summary generated.");
          return;
        }

        setApiError("Backend returned empty output. Return { summaries: [...] } or at least { summary: '...' }.");
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

  const inputWords = useMemo(() => {
    if (inputMode !== "text") return 0;
    return countWords(formik.values.inputText);
  }, [formik.values.inputText, inputMode]);

  const readMins = useMemo(() => estimateReadingTime(inputWords), [inputWords]);

  const active = useMemo(() => variants.find((x) => x.id === activeVariant) || null, [variants, activeVariant]);

  const summaryText = active?.summary || "";
  const bullets = active?.bullets || [];
  const keyPoints = active?.keyPoints || [];
  const actionItems = active?.actionItems || [];
  const outline = active?.outline || [];
  const questions = active?.questions || [];
  const keywords = active?.keywords || [];

  const copy = async (text) => {
    if (!text?.trim()) return message.warning("Nothing to copy.");
    await navigator.clipboard.writeText(text);
    message.success("Copied.");
  };

  const replaceInputWith = (text) => {
    if (!text?.trim()) return message.warning("Nothing to apply.");
    formik.setFieldValue("inputText", text);
    message.success("Replaced input text.");
  };

  const insertBelow = (text) => {
    if (!text?.trim()) return message.warning("Nothing to insert.");
    const base = formik.values.inputText || "";
    formik.setFieldValue("inputText", `${base}\n\n---\n\n${text}`);
    message.success("Inserted below input.");
  };

  const clearAll = () => {
    formik.resetForm();
    setApiError("");
    setVariants([]);
    setMeta(null);
    setActiveVariant("v1");
    setRightTab("summary");
    message.success("Cleared.");
  };

  const uploadProps = {
    multiple: false,
    accept: ".docx,.pdf,.txt,.md,.html",
    beforeUpload: (file) => {
      formik.setFieldValue("file", file);
      message.success(`Selected: ${file.name}`);
      return false; // prevent auto upload
    },
    onRemove: () => {
      formik.setFieldValue("file", null);
    },
    fileList: formik.values.file ? [formik.values.file] : [],
  };

  const score = useMemo(() => {
    // UI-only "quality" score (replace with backend meta if you want)
    if (!variants.length) return 0;
    let s = 80;
    if (formik.values.preserveFacts) s += 5;
    if (formik.values.includeKeyPoints) s += 3;
    if (formik.values.includeOutline) s += 2;
    return clamp(s, 35, 95);
  }, [variants.length, formik.values.preserveFacts, formik.values.includeKeyPoints, formik.values.includeOutline]);

  const compression = useMemo(() => {
    if (meta?.compressionRatio != null) return Math.round(meta.compressionRatio * 100);
    if (!inputWords || !summaryText) return null;
    const outWords = countWords(summaryText);
    const ratio = outWords / inputWords;
    return Math.round(ratio * 100);
  }, [meta, inputWords, summaryText]);

  const variantTabs = useMemo(() => {
    if (!variants.length) return [];
    return variants.map((v, i) => ({
      key: v.id,
      label: `Version ${i + 1}`,
      children: null, // we render body below
    }));
  }, [variants]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Auto Summary
        </Title>
        <Text type="secondary">
          Pro summarizer: multi-format outputs, key points, action items, outline, questions, and multiple versions.
        </Text>
      </Space>

      {/* Controls */}
      <Card style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }} bodyStyle={{ padding: 14 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">Input source</Text>
              <Tooltip title="Text is fastest. URL/file needs backend support.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Segmented
              block
              size="large"
              value={inputMode}
              onChange={(v) => setInputMode(v)}
              options={[
                { label: "Text", value: "text" },
                { label: "URL", value: "url" },
                { label: "File", value: "file" },
              ]}
            />
          </Col>

          <Col xs={24} md={7}>
            <Text type="secondary">Format</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.format}
              options={FORMATS}
              onChange={(v) => formik.setFieldValue("format", v)}
            />
          </Col>

          <Col xs={24} md={7}>
            <Text type="secondary">Tone</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.tone}
              options={TONES}
              onChange={(v) => formik.setFieldValue("tone", v)}
            />
          </Col>

          <Col xs={24} md={7}>
            <Text type="secondary">Audience</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.audience}
              options={AUDIENCE}
              onChange={(v) => formik.setFieldValue("audience", v)}
            />
          </Col>

          <Col xs={24} md={7}>
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
                Length <Tag style={{ marginLeft: 8 }}>{formik.values.length}%</Tag>
              </Text>
              <Tooltip title="Lower = shorter summary. Higher = more detailed.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Slider value={formik.values.length} onChange={(v) => formik.setFieldValue("length", v)} />
          </Col>

          <Col xs={24} md={7}>
            <Text type="secondary">Versions</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.variantsCount}
              onChange={(v) => formik.setFieldValue("variantsCount", v)}
              options={[
                { value: 1, label: "1 version" },
                { value: 2, label: "2 versions" },
                { value: 3, label: "3 versions" },
                { value: 4, label: "4 versions" },
                { value: 5, label: "5 versions" },
              ]}
            />
          </Col>

          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
          </Col>

          {/* Pro Feature Toggles */}
          <Col xs={24} md={16}>
            <Space wrap size={16}>
              <Space>
                <Switch checked={formik.values.includeTitle} onChange={(v) => formik.setFieldValue("includeTitle", v)} />
                <Text>Title</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.includeKeywords} onChange={(v) => formik.setFieldValue("includeKeywords", v)} />
                <Text>Keywords</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.includeKeyPoints} onChange={(v) => formik.setFieldValue("includeKeyPoints", v)} />
                <Text>Key points</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.includeActionItems} onChange={(v) => formik.setFieldValue("includeActionItems", v)} />
                <Text>Action items</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.includeOutline} onChange={(v) => formik.setFieldValue("includeOutline", v)} />
                <Text>Outline</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.includeQuestions} onChange={(v) => formik.setFieldValue("includeQuestions", v)} />
                <Text>Questions</Text>
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space wrap size={14} style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button icon={<DeleteOutlined />} onClick={clearAll}>
                Clear
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                loading={formik.isSubmitting}
                onClick={formik.handleSubmit}
              >
                Summarize
              </Button>
            </Space>
          </Col>

          <Col xs={24} md={16}>
            <Space wrap size={16}>
              <Space>
                <Switch checked={formik.values.preserveFacts} onChange={(v) => formik.setFieldValue("preserveFacts", v)} />
                <Text>Preserve facts</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.preserveCitations} onChange={(v) => formik.setFieldValue("preserveCitations", v)} />
                <Text>Preserve citations</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.highlightImportant} onChange={(v) => formik.setFieldValue("highlightImportant", v)} />
                <Text>Highlight important</Text>
              </Space>
              <Space>
                <Text type="secondary">Max bullets</Text>
                <Select
                  size="middle"
                  value={formik.values.maxBullets}
                  onChange={(v) => formik.setFieldValue("maxBullets", v)}
                  options={[4, 6, 8, 10, 12].map((n) => ({ value: n, label: `${n}` }))}
                  style={{ width: 120 }}
                />
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Text type="secondary">Focus (optional)</Text>
            <Input
              placeholder="e.g., methodology, results, action items, WPS compliance..."
              value={formik.values.focus}
              onChange={(e) => formik.setFieldValue("focus", e.target.value)}
            />
          </Col>

          {apiError ? (
            <Col xs={24}>
              <Alert type="error" showIcon message="Summarizer failed" description={apiError} />
            </Col>
          ) : null}
        </Row>
      </Card>

      {/* Workspace */}
      <Row gutter={[16, 16]}>
        {/* Input panel */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                Input
              </Space>
            }
            extra={
              <Space size={10}>
                {inputMode === "text" ? (
                  <>
                    <Tag>{inputWords} words</Tag>
                    {inputWords ? <Tag>{readMins} min read</Tag> : null}
                  </>
                ) : (
                  <Tag>{inputMode.toUpperCase()}</Tag>
                )}
              </Space>
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            {inputMode === "text" ? (
              <>
                <TextArea
                  value={formik.values.inputText}
                  onChange={(e) => formik.setFieldValue("inputText", e.target.value)}
                  onBlur={formik.handleBlur}
                  placeholder="Paste text to summarize..."
                  autoSize={{ minRows: 14, maxRows: 24 }}
                  style={{ borderRadius: token.borderRadiusLG }}
                />
                {formik.touched.inputText && formik.errors.inputText ? (
                  <Text type="danger" style={{ display: "block", marginTop: 8 }}>
                    {formik.errors.inputText}
                  </Text>
                ) : (
                  <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    Tip: Longer text? Use Outline + Key points for best clarity.
                  </Text>
                )}
              </>
            ) : null}

            {inputMode === "url" ? (
              <>
                <Input
                  size="large"
                  prefix={<LinkOutlined />}
                  placeholder="https://example.com/article"
                  value={formik.values.inputUrl}
                  onChange={(e) => formik.setFieldValue("inputUrl", e.target.value)}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.inputUrl && formik.errors.inputUrl ? (
                  <Text type="danger" style={{ display: "block", marginTop: 8 }}>
                    {formik.errors.inputUrl}
                  </Text>
                ) : (
                  <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    Backend should fetch page content safely (strip ads, nav, etc.).
                  </Text>
                )}
              </>
            ) : null}

            {inputMode === "file" ? (
              <>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />} size="large">
                    Choose file
                  </Button>
                </Upload>
                <Text type="secondary" style={{ display: "block", marginTop: 10 }}>
                  You’ll later upload this file to backend as multipart/form-data.
                </Text>
                {!formik.values.file ? (
                  <Text type="secondary">No file selected.</Text>
                ) : (
                  <Tag style={{ marginTop: 10 }}>{formik.values.file.name}</Tag>
                )}
              </>
            ) : null}

            <Divider style={{ margin: "12px 0" }} />

            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Output quality (UI): <Text strong style={{ color: token.colorPrimary }}>{score}/100</Text>
              </Text>
              <Progress percent={score} showInfo={false} style={{ width: 220, margin: 0 }} />
            </Space>

            {meta ? (
              <>
                <Divider style={{ margin: "12px 0" }} />
                <Space wrap>
                  {meta.detectedLanguage ? <Tag>Detected: {meta.detectedLanguage}</Tag> : null}
                  {meta.inputWords ? <Tag>Input words: {meta.inputWords}</Tag> : null}
                  {meta.compressionRatio != null ? <Tag>Compression: {Math.round(meta.compressionRatio * 100)}%</Tag> : null}
                  {compression != null && meta.compressionRatio == null ? <Tag>Compression: {compression}%</Tag> : null}
                </Space>
              </>
            ) : null}
          </Card>
        </Col>

        {/* Output panel */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                Output
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => copy(summaryText)}
                  disabled={!summaryText}
                >
                  Copy
                </Button>
                <Button
                  icon={<SwapOutlined />}
                  onClick={() => replaceInputWith(summaryText)}
                  disabled={!summaryText || inputMode !== "text"}
                >
                  Replace
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => insertBelow(summaryText)}
                  disabled={!summaryText || inputMode !== "text"}
                >
                  Insert
                </Button>
              </Space>
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            {!variants.length ? (
              <Empty description="Run Summarize to generate output." />
            ) : (
              <>
                {/* Variant tabs */}
                <Tabs
                  activeKey={activeVariant}
                  onChange={setActiveVariant}
                  items={variantTabs}
                  style={{ marginBottom: 8 }}
                />

                {/* Right-side content tabs */}
                <Segmented
                  block
                  value={rightTab}
                  onChange={setRightTab}
                  options={[
                    { label: "Summary", value: "summary" },
                    { label: "Key Points", value: "keypoints" },
                    { label: "Actions", value: "actions" },
                    { label: "Outline", value: "outline" },
                    { label: "Questions", value: "questions" },
                  ]}
                />

                <Divider style={{ margin: "12px 0" }} />

                {active?.title && formik.values.includeTitle ? (
                  <Title level={4} style={{ marginTop: 0 }}>
                    {active.title}
                  </Title>
                ) : null}

                {formik.values.includeKeywords && keywords?.length ? (
                  <Space wrap style={{ marginBottom: 10 }}>
                    {keywords.slice(0, 12).map((k, i) => (
                      <Tag key={i} color="blue">
                        {k}
                      </Tag>
                    ))}
                  </Space>
                ) : null}

                {/* Content */}
                {rightTab === "summary" ? (
                  <TextArea
                    value={summaryText}
                    readOnly
                    placeholder="Summary will appear here..."
                    autoSize={{ minRows: 12, maxRows: 22 }}
                    style={{
                      borderRadius: token.borderRadiusLG,
                      background: token.colorFillAlter,
                    }}
                  />
                ) : null}

                {rightTab === "keypoints" ? (
                  <BlockList
                    title="Key points"
                    items={formik.values.includeKeyPoints ? keyPoints : []}
                    fallback={bullets}
                    token={token}
                  />
                ) : null}

                {rightTab === "actions" ? (
                  <BlockList
                    title="Action items"
                    items={formik.values.includeActionItems ? actionItems : []}
                    fallback={[]}
                    token={token}
                  />
                ) : null}

                {rightTab === "outline" ? (
                  <BlockList
                    title="Outline"
                    items={formik.values.includeOutline ? outline : []}
                    fallback={[]}
                    token={token}
                  />
                ) : null}

                {rightTab === "questions" ? (
                  <BlockList
                    title="Questions to ask"
                    items={formik.values.includeQuestions ? questions : []}
                    fallback={[]}
                    token={token}
                  />
                ) : null}

                <Divider style={{ margin: "12px 0" }} />

                <Space wrap>
                  <Tag color="geekblue">{FORMATS.find((f) => f.value === formik.values.format)?.label}</Tag>
                  <Tag color="blue">{TONES.find((t) => t.value === formik.values.tone)?.label}</Tag>
                  <Tag>{AUDIENCE.find((a) => a.value === formik.values.audience)?.label}</Tag>
                  <Tag>Length {formik.values.length}%</Tag>
                  {formik.values.preserveFacts ? <Tag color="green">Facts preserved</Tag> : <Tag color="orange">Facts flexible</Tag>}
                  {formik.values.preserveCitations ? <Tag color="green">Citations preserved</Tag> : <Tag color="orange">Citations flexible</Tag>}
                </Space>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function BlockList({ title, items, fallback, token }) {
  const finalItems = (items && items.length ? items : fallback) || [];
  if (!finalItems.length) return <Empty description={`No ${title.toLowerCase()} returned.`} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Text strong>{title}</Text>
      <List
        size="small"
        dataSource={finalItems}
        renderItem={(x, idx) => (
          <List.Item
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              padding: "10px 12px",
              background: token.colorFillAlter,
            }}
          >
            <Text>
              <Text type="secondary">{idx + 1}. </Text>
              {x}
            </Text>
          </List.Item>
        )}
      />
    </div>
  );
}
