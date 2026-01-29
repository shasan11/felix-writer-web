// src/views/humanizer/index.jsx
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
} from "antd";
import {
  SmileOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  SwapOutlined,
  PlusOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import * as Yup from "yup";

const { Title, Text } = Typography;
const { TextArea } = Input;

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "empathetic", label: "Empathetic" },
  { value: "persuasive", label: "Persuasive" },
  { value: "confident", label: "Confident" },
  { value: "friendly", label: "Friendly" },
];

const LANGS = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "ne", label: "Nepali" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
];

function countWords(text = "") {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/**
 * ✅ API is inside the same file (as you asked)
 * Change VITE_API_BASE_URL in your .env later.
 * Example: VITE_API_BASE_URL=http://localhost:8000
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  // Optional token support (won't break if token doesn't exist)
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function Humanizer() {
  const { token } = theme.useToken();

  const [output, setOutput] = useState("");
  const [apiError, setApiError] = useState("");

  const formik = useFormik({
    initialValues: {
      inputText: "",
      tone: "professional",
      language: "auto",
      intensity: 55, // 0-100
      keepMeaning: true,
      keepCitations: true,
      reduceRepetition: true,
      keepFormatting: true,
    },
    validationSchema: Yup.object({
      inputText: Yup.string()
        .trim()
        .min(10, "Please enter at least 10 characters.")
        .required("Input text is required."),
      tone: Yup.string().required("Tone is required"),
      language: Yup.string().required("Language is required"),
      intensity: Yup.number().min(0).max(100).required("Intensity is required"),
    }),
    onSubmit: async (values) => {
      setApiError("");
      setOutput("");

      try {
        /**
         * 🔌 Backend contract (recommended)
         * POST /api/humanize
         * Body:
         * {
         *   text: string,
         *   tone: string,
         *   language: string,
         *   intensity: number,
         *   options: { keepMeaning, keepCitations, reduceRepetition, keepFormatting }
         * }
         * Response:
         * { output: string }
         */
        const payload = {
          text: values.inputText,
          tone: values.tone,
          language: values.language,
          intensity: values.intensity,
          options: {
            keepMeaning: values.keepMeaning,
            keepCitations: values.keepCitations,
            reduceRepetition: values.reduceRepetition,
            keepFormatting: values.keepFormatting,
          },
        };

        const res = await api.post("/api/humanize", payload);

        const out = res?.data?.output ?? "";
        if (!out) {
          setApiError("Backend returned empty output. Make sure response is { output: '...' }");
          return;
        }

        setOutput(out);
        message.success("Humanized successfully.");
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

  const copyOutput = async () => {
    if (!output.trim()) return message.warning("Nothing to copy yet.");
    await navigator.clipboard.writeText(output);
    message.success("Copied to clipboard.");
  };

  const replaceInput = () => {
    if (!output.trim()) return message.warning("Nothing to apply yet.");
    formik.setFieldValue("inputText", output);
    message.success("Replaced input with output.");
  };

  const insertBelow = () => {
    if (!output.trim()) return message.warning("Nothing to insert yet.");
    formik.setFieldValue("inputText", `${formik.values.inputText}\n\n---\n\n${output}`);
    message.success("Inserted output below input.");
  };

  const clearAll = () => {
    formik.resetForm();
    setOutput("");
    setApiError("");
    message.success("Cleared.");
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Humanizer
        </Title>
        <Text type="secondary">
          Make text sound natural and human — control tone, intensity, and meaning.
        </Text>
      </Space>

      {/* Controls */}
      <Card style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }} bodyStyle={{ padding: 14 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Text type="secondary">Tone</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.tone}
              options={TONES}
              onChange={(v) => formik.setFieldValue("tone", v)}
            />
          </Col>

          <Col xs={24} md={8}>
            <Text type="secondary">Language</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.language}
              options={LANGS}
              onChange={(v) => formik.setFieldValue("language", v)}
            />
          </Col>

          <Col xs={24} md={8}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Intensity <Tag style={{ marginLeft: 8 }}>{formik.values.intensity}%</Tag>
              </Text>
              <span title="Higher intensity rewrites more aggressively, making it sound more human.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </span>
            </Space>

            <Slider value={formik.values.intensity} onChange={(v) => formik.setFieldValue("intensity", v)} />
          </Col>

          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
          </Col>

          <Col xs={24} md={16}>
            <Space wrap size={18}>
              <Space>
                <Switch
                  checked={formik.values.keepMeaning}
                  onChange={(v) => formik.setFieldValue("keepMeaning", v)}
                />
                <Text>Keep meaning</Text>
              </Space>

              <Space>
                <Switch
                  checked={formik.values.reduceRepetition}
                  onChange={(v) => formik.setFieldValue("reduceRepetition", v)}
                />
                <Text>Reduce repetition</Text>
              </Space>

              <Space>
                <Switch
                  checked={formik.values.keepCitations}
                  onChange={(v) => formik.setFieldValue("keepCitations", v)}
                />
                <Text>Preserve citations</Text>
              </Space>

              <Space>
                <Switch
                  checked={formik.values.keepFormatting}
                  onChange={(v) => formik.setFieldValue("keepFormatting", v)}
                />
                <Text>Keep formatting</Text>
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={clearAll}>Clear</Button>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                loading={formik.isSubmitting}
                onClick={formik.handleSubmit}
              >
                Humanize
              </Button>
            </Space>
          </Col>

          {apiError ? (
            <Col xs={24}>
              <Alert type="error" showIcon message="Humanizer failed" description={apiError} />
            </Col>
          ) : null}
        </Row>
      </Card>

      {/* Responsive workspace */}
      <Row gutter={[16, 16]}>
        {/* Input */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SmileOutlined />
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
              placeholder="Paste or type text to humanize..."
              autoSize={{ minRows: 14, maxRows: 24 }}
              style={{ borderRadius: token.borderRadiusLG }}
            />

            {formik.touched.inputText && formik.errors.inputText ? (
              <Text type="danger" style={{ display: "block", marginTop: 8 }}>
                {formik.errors.inputText}
              </Text>
            ) : (
              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                Tip: Lower intensity keeps structure; higher intensity rewrites more.
              </Text>
            )}
          </Card>
        </Col>

        {/* Output */}
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
                <Button icon={<CopyOutlined />} onClick={copyOutput}>
                  Copy
                </Button>
                <Button icon={<SwapOutlined />} onClick={replaceInput}>
                  Replace
                </Button>
                <Button icon={<PlusOutlined />} onClick={insertBelow}>
                  Insert
                </Button>
              </Space>
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            <TextArea
              value={output}
              readOnly
              placeholder="Your humanized output will appear here..."
              autoSize={{ minRows: 14, maxRows: 24 }}
              style={{
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
              }}
            />

            <Divider style={{ margin: "12px 0" }} />

            <Space wrap>
              <Tag color="blue">{TONES.find((t) => t.value === formik.values.tone)?.label}</Tag>
              <Tag>{LANGS.find((l) => l.value === formik.values.language)?.label}</Tag>
              <Tag>Intensity {formik.values.intensity}%</Tag>

              {formik.values.keepMeaning ? <Tag color="green">Meaning preserved</Tag> : <Tag color="orange">Meaning flexible</Tag>}
              {formik.values.reduceRepetition ? <Tag color="green">Less repetition</Tag> : <Tag color="orange">Repetition allowed</Tag>}
              {formik.values.keepCitations ? <Tag color="green">Citations kept</Tag> : <Tag color="orange">Citations flexible</Tag>}
              {formik.values.keepFormatting ? <Tag color="green">Formatting kept</Tag> : <Tag color="orange">Formatting flexible</Tag>}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
