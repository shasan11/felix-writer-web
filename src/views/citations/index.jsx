// src/views/citations/index.jsx
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
  Switch,
  Tag,
  Divider,
  Alert,
  message,
  theme,
  Tabs,
  Segmented,
  List,
  Empty,
  Tooltip,
  Modal,
  Form,
} from "antd";
import {
  BookOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  PlusOutlined,
  LinkOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
  ExportOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import * as Yup from "yup";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * ✅ API in same file
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

const STYLES = [
  { value: "apa7", label: "APA 7" },
  { value: "mla9", label: "MLA 9" },
  { value: "chicago", label: "Chicago" },
  { value: "harvard", label: "Harvard" },
  { value: "ieee", label: "IEEE" },
];

const SOURCE_TYPES = [
  { value: "auto", label: "Auto (best effort)" },
  { value: "website", label: "Website" },
  { value: "journal", label: "Journal Article" },
  { value: "book", label: "Book" },
  { value: "conference", label: "Conference Paper" },
  { value: "thesis", label: "Thesis / Dissertation" },
  { value: "report", label: "Report" },
];

const OUTPUT_FORMAT = [
  { value: "bibliography", label: "Bibliography" },
  { value: "intext", label: "In-text citations" },
  { value: "both", label: "Both" },
];

const SORTING = [
  { value: "style_default", label: "Style default" },
  { value: "author", label: "Author (A–Z)" },
  { value: "year", label: "Year (new → old)" },
  { value: "title", label: "Title (A–Z)" },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function cleanUrl(u) {
  return (u || "").trim();
}

function isProbablyUrl(s) {
  const v = (s || "").trim();
  return /^https?:\/\//i.test(v) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(v);
}

/**
 * Expected backend response (recommended):
 * POST /api/citations
 * body:
 * {
 *   inputs: [{ id, type:"url"|"doi"|"isbn"|"text"|"manual", value, sourceType }],
 *   style, output, language,
 *   options: { fetchMetadata, deDuplicate, verifyLinks, includeAccessedDate, autoCapitalizeTitles, sentenceCaseAPA },
 *   sorting,
 * }
 * response:
 * {
 *   items: [
 *     {
 *       id,
 *       sourceType,
 *       title, authors:[...], year, publisher, journal, volume, issue, pages, url, doi, isbn,
 *       inText: "(Smith, 2020)",
 *       bibliography: "Smith, J. (2020). Title. ...",
 *       confidence: 0-100,
 *       warnings: ["Missing author", ...],
 *       metadata: { ... } // optional
 *     }
 *   ],
 *   bibliographyText: "...\n...",
 *   inTextExamples: ["...", "..."],
 *   dedupe: { removed: 2 } // optional
 * }
 */

export default function CitationGenerator() {
  const { token } = theme.useToken();

  // Result state
  const [apiError, setApiError] = useState("");
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("items"); // items | bibliography | intext
  const [selectedItem, setSelectedItem] = useState(null);

  // Saved library (local only for now)
  const [library, setLibrary] = useState(() => {
    try {
      const raw = localStorage.getItem("felix_citation_library");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persistLibrary = (next) => {
    setLibrary(next);
    localStorage.setItem("felix_citation_library", JSON.stringify(next));
  };

  const formik = useFormik({
    initialValues: {
      style: "apa7",
      output: "both",
      sorting: "style_default",
      sourceType: "auto",
      language: "en",

      fetchMetadata: true,
      deDuplicate: true,
      verifyLinks: true,
      includeAccessedDate: true,
      autoCapitalizeTitles: true,
      sentenceCaseAPA: true,

      // multi-input
      input: "",
      inputs: [],
    },
    validationSchema: Yup.object({
      input: Yup.string().test("has-any", "Add at least one URL/DOI/ISBN/text.", function (val) {
        const inputs = this.parent.inputs || [];
        if (inputs.length > 0) return true;
        return (val || "").trim().length > 0;
      }),
    }),
    onSubmit: async (values) => {
      setApiError("");
      setItems([]);
      setActiveTab("items");

      try {
        const draft = [...(values.inputs || [])];

        // If user typed but didn't click Add, auto-add it
        if ((values.input || "").trim()) {
          draft.push(makeInput(values.input, values.sourceType));
        }

        if (!draft.length) {
          setApiError("No inputs provided.");
          return;
        }

        const payload = {
          inputs: draft.map((x) => ({
            id: x.id,
            type: x.type, // url|doi|isbn|text|manual
            value: x.value,
            sourceType: x.sourceType || values.sourceType,
          })),
          style: values.style,
          output: values.output,
          sorting: values.sorting,
          language: values.language,
          options: {
            fetchMetadata: values.fetchMetadata,
            deDuplicate: values.deDuplicate,
            verifyLinks: values.verifyLinks,
            includeAccessedDate: values.includeAccessedDate,
            autoCapitalizeTitles: values.autoCapitalizeTitles,
            sentenceCaseAPA: values.sentenceCaseAPA,
          },
        };

        const res = await api.post("/api/citations", payload);
        const data = res?.data || {};

        const outItems = Array.isArray(data.items) ? data.items : [];
        if (!outItems.length) {
          setApiError("Backend returned no citation items. Return { items: [...] }.");
          return;
        }

        setItems(outItems);
        message.success("Citations generated.");
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

  const addInput = () => {
    const raw = (formik.values.input || "").trim();
    if (!raw) return;

    const next = [...formik.values.inputs, makeInput(raw, formik.values.sourceType)];
    formik.setFieldValue("inputs", next);
    formik.setFieldValue("input", "");
    message.success("Added.");
  };

  const removeInput = (id) => {
    const next = (formik.values.inputs || []).filter((x) => x.id !== id);
    formik.setFieldValue("inputs", next);
  };

  const clearAll = () => {
    formik.resetForm();
    setApiError("");
    setItems([]);
    setSelectedItem(null);
    message.success("Cleared.");
  };

  const bibliographyText = useMemo(() => {
    if (!items.length) return "";
    // backend may return full combined text; but we build it here too
    const bibs = items
      .map((it) => it.bibliography)
      .filter(Boolean)
      .join("\n");
    return bibs;
  }, [items]);

  const inTextText = useMemo(() => {
    if (!items.length) return "";
    const lines = items
      .map((it) => it.inText)
      .filter(Boolean)
      .join("\n");
    return lines;
  }, [items]);

  const copy = async (text) => {
    if (!text?.trim()) return message.warning("Nothing to copy.");
    await navigator.clipboard.writeText(text);
    message.success("Copied.");
  };

  const saveToLibrary = (item) => {
    if (!item) return;
    const exists = library.some((x) => x.id === item.id);
    const next = exists ? library : [item, ...library];
    persistLibrary(next);
    message.success("Saved to library.");
  };

  const removeFromLibrary = (id) => {
    const next = library.filter((x) => x.id !== id);
    persistLibrary(next);
    message.success("Removed.");
  };

  const exportLibraryJson = async () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "felix_citations_library.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Citation Generator
        </Title>
        <Text type="secondary">
          Pro workflow: batch URLs/DOIs/ISBNs, metadata fetching, de-duplication, in-text + bibliography, and a saved library.
        </Text>
      </Space>

      {/* Controls */}
      <Card style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }} bodyStyle={{ padding: 14 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Text type="secondary">Style</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.style}
              options={STYLES}
              onChange={(v) => formik.setFieldValue("style", v)}
            />
          </Col>

          <Col xs={24} md={6}>
            <Text type="secondary">Output</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.output}
              options={OUTPUT_FORMAT}
              onChange={(v) => formik.setFieldValue("output", v)}
            />
          </Col>

          <Col xs={24} md={6}>
            <Text type="secondary">Sort</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.sorting}
              options={SORTING}
              onChange={(v) => formik.setFieldValue("sorting", v)}
            />
          </Col>

          <Col xs={24} md={6}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
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
                Generate
              </Button>
            </Space>
          </Col>

          <Col xs={24}>
            <Divider style={{ margin: "10px 0" }} />
          </Col>

          {/* Pro toggles */}
          <Col xs={24} md={16}>
            <Space wrap size={16}>
              <Space>
                <Switch checked={formik.values.fetchMetadata} onChange={(v) => formik.setFieldValue("fetchMetadata", v)} />
                <Text>Fetch metadata</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.deDuplicate} onChange={(v) => formik.setFieldValue("deDuplicate", v)} />
                <Text>De-duplicate</Text>
              </Space>
              <Space>
                <Switch checked={formik.values.verifyLinks} onChange={(v) => formik.setFieldValue("verifyLinks", v)} />
                <Text>Verify links</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.includeAccessedDate}
                  onChange={(v) => formik.setFieldValue("includeAccessedDate", v)}
                />
                <Text>Accessed date</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.autoCapitalizeTitles}
                  onChange={(v) => formik.setFieldValue("autoCapitalizeTitles", v)}
                />
                <Text>Auto title case</Text>
              </Space>
              <Space>
                <Switch
                  checked={formik.values.sentenceCaseAPA}
                  onChange={(v) => formik.setFieldValue("sentenceCaseAPA", v)}
                />
                <Text>APA sentence case</Text>
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Text type="secondary">Source type (hint)</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={formik.values.sourceType}
              options={SOURCE_TYPES}
              onChange={(v) => formik.setFieldValue("sourceType", v)}
            />
          </Col>

          {/* Input adder */}
          <Col xs={24} md={18}>
            <Text type="secondary">Add URL / DOI / ISBN / Paste reference text</Text>
            <Input
              size="large"
              prefix={<LinkOutlined />}
              placeholder="https://...  |  10.1145/...  |  978-...  |  paste citation text"
              value={formik.values.input}
              onChange={(e) => formik.setFieldValue("input", e.target.value)}
              onPressEnter={addInput}
            />
            {formik.touched.input && formik.errors.input ? (
              <Text type="danger" style={{ display: "block", marginTop: 6 }}>
                {formik.errors.input}
              </Text>
            ) : (
              <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                Tip: Paste multiple lines? Add them one by one, or your backend can split lines.
              </Text>
            )}
          </Col>

          <Col xs={24} md={6}>
            <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 22 }}>
              <Button icon={<PlusOutlined />} onClick={addInput} disabled={!formik.values.input.trim()}>
                Add
              </Button>
            </Space>
          </Col>

          {apiError ? (
            <Col xs={24}>
              <Alert type="error" showIcon message="Citation generation failed" description={apiError} />
            </Col>
          ) : null}
        </Row>

        {/* Inputs list */}
        {(formik.values.inputs || []).length ? (
          <>
            <Divider style={{ margin: "12px 0" }} />
            <Text type="secondary">Queue</Text>
            <List
              size="small"
              dataSource={formik.values.inputs}
              renderItem={(it) => (
                <List.Item
                  actions={[
                    <Button key="rm" type="text" danger onClick={() => removeInput(it.id)}>
                      Remove
                    </Button>,
                  ]}
                >
                  <Space direction="vertical" size={0} style={{ width: "100%" }}>
                    <Space wrap>
                      <Tag color="blue">{it.type.toUpperCase()}</Tag>
                      <Tag>{it.sourceType}</Tag>
                    </Space>
                    <Text>{it.value}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </>
        ) : null}
      </Card>

      {/* Output */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <BookOutlined />
                Output
              </Space>
            }
            extra={
              <Segmented
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { label: "Items", value: "items" },
                  { label: "Bibliography", value: "bibliography" },
                  { label: "In-text", value: "intext" },
                ]}
              />
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            {!items.length ? (
              <Empty description="Generate citations to see results here." />
            ) : (
              <>
                {activeTab === "items" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {items.map((it) => (
                      <Card
                        key={it.id}
                        size="small"
                        hoverable
                        style={{
                          borderRadius: token.borderRadiusLG,
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                        bodyStyle={{ padding: 12 }}
                        onClick={() => setSelectedItem(it)}
                      >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <Space>
                            <Tag color="blue">{(it.sourceType || "source").toUpperCase()}</Tag>
                            {it.confidence != null ? (
                              <Tag color={it.confidence >= 80 ? "green" : it.confidence >= 55 ? "orange" : "red"}>
                                {it.confidence}% confidence
                              </Tag>
                            ) : (
                              <Tag>confidence —</Tag>
                            )}
                          </Space>
                          <Space>
                            <Button type="text" onClick={(e) => (e.stopPropagation(), saveToLibrary(it))}>
                              Save
                            </Button>
                          </Space>
                        </Space>

                        <div style={{ marginTop: 8 }}>
                          <Text strong>{it.title || "Untitled"}</Text>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          <Text type="secondary">In-text:</Text>{" "}
                          <Tag>{it.inText || "—"}</Tag>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          <Text type="secondary">Bibliography:</Text>{" "}
                          <Text>{(it.bibliography || "—").slice(0, 140)}{(it.bibliography || "").length > 140 ? "..." : ""}</Text>
                        </div>

                        {Array.isArray(it.warnings) && it.warnings.length ? (
                          <div style={{ marginTop: 8 }}>
                            <Tag color="orange" icon={<WarningOutlined />}>
                              {it.warnings.length} warning(s)
                            </Tag>
                          </div>
                        ) : (
                          <div style={{ marginTop: 8 }}>
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                              Looks good
                            </Tag>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : null}

                {activeTab === "bibliography" ? (
                  <>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      <Text strong>Bibliography</Text>
                      <Button icon={<CopyOutlined />} onClick={() => copy(bibliographyText)}>
                        Copy
                      </Button>
                    </Space>
                    <Divider style={{ margin: "12px 0" }} />
                    <TextArea
                      value={bibliographyText}
                      readOnly
                      autoSize={{ minRows: 12, maxRows: 22 }}
                      style={{ borderRadius: token.borderRadiusLG, background: token.colorFillAlter }}
                    />
                  </>
                ) : null}

                {activeTab === "intext" ? (
                  <>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      <Text strong>In-text citations</Text>
                      <Button icon={<CopyOutlined />} onClick={() => copy(inTextText)}>
                        Copy
                      </Button>
                    </Space>
                    <Divider style={{ margin: "12px 0" }} />
                    <TextArea
                      value={inTextText}
                      readOnly
                      autoSize={{ minRows: 12, maxRows: 22 }}
                      style={{ borderRadius: token.borderRadiusLG, background: token.colorFillAlter }}
                    />
                  </>
                ) : null}
              </>
            )}
          </Card>
        </Col>

        {/* Library */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                Saved Library
              </Space>
            }
            extra={
              <Button icon={<ExportOutlined />} onClick={exportLibraryJson} disabled={!library.length}>
                Export
              </Button>
            }
            style={{ borderRadius: token.borderRadiusLG }}
            bodyStyle={{ padding: 14 }}
          >
            {!library.length ? (
              <Empty description="Save items to build your citation library." />
            ) : (
              <List
                size="small"
                dataSource={library}
                renderItem={(it) => (
                  <List.Item
                    actions={[
                      <Button key="rm" type="text" danger onClick={() => removeFromLibrary(it.id)}>
                        Remove
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size={0} style={{ width: "100%" }}>
                      <Text strong>{it.title || "Untitled"}</Text>
                      <Text type="secondary">{it.inText || ""}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Item modal */}
      <Modal
        open={!!selectedItem}
        onCancel={() => setSelectedItem(null)}
        title="Citation details"
        footer={[
          <Button key="close" onClick={() => setSelectedItem(null)}>
            Close
          </Button>,
        ]}
      >
        {selectedItem ? (
          <Space direction="vertical" style={{ width: "100%" }} size={10}>
            <Space wrap>
              <Tag color="blue">{(selectedItem.sourceType || "source").toUpperCase()}</Tag>
              {selectedItem.year ? <Tag>{selectedItem.year}</Tag> : null}
              {selectedItem.doi ? <Tag>DOI: {selectedItem.doi}</Tag> : null}
              {selectedItem.isbn ? <Tag>ISBN: {selectedItem.isbn}</Tag> : null}
            </Space>

            <div>
              <Text strong>In-text</Text>
              <div style={{ marginTop: 6 }}>
                <TextArea readOnly value={selectedItem.inText || ""} autoSize={{ minRows: 2, maxRows: 4 }} />
                <Space style={{ marginTop: 8 }}>
                  <Button icon={<CopyOutlined />} onClick={() => copy(selectedItem.inText || "")}>
                    Copy
                  </Button>
                </Space>
              </div>
            </div>

            <div>
              <Text strong>Bibliography</Text>
              <div style={{ marginTop: 6 }}>
                <TextArea readOnly value={selectedItem.bibliography || ""} autoSize={{ minRows: 4, maxRows: 10 }} />
                <Space style={{ marginTop: 8 }}>
                  <Button icon={<CopyOutlined />} onClick={() => copy(selectedItem.bibliography || "")}>
                    Copy
                  </Button>
                </Space>
              </div>
            </div>

            {Array.isArray(selectedItem.warnings) && selectedItem.warnings.length ? (
              <Alert
                type="warning"
                showIcon
                message="Warnings"
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selectedItem.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                }
              />
            ) : (
              <Alert type="success" showIcon message="Looks good" description="No warnings returned by backend." />
            )}
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}

/** ---------- helpers ---------- */

function makeId() {
  return `in_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function detectType(value) {
  const v = (value || "").trim();
  if (!v) return "text";
  if (/^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i.test(v)) return "doi";
  if (/^(97(8|9))?\d{9}(\d|X)$/i.test(v.replaceAll("-", ""))) return "isbn";
  if (isProbablyUrl(v)) return "url";
  return "text";
}

function makeInput(raw, sourceType) {
  const value = raw.trim();
  const type = detectType(value);
  // If user typed domain without https, normalize for backend convenience
  const normalized =
    type === "url" && !/^https?:\/\//i.test(value) ? `https://${value}` : value;

  return {
    id: makeId(),
    type,
    value: normalized,
    sourceType: sourceType || "auto",
  };
}
