import React, { useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Input,
  Button,
  Select,
  Segmented,
  Slider,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Divider,
  Progress,
  Upload,
  message,
  theme,
  Dropdown,
} from "antd";
import {
  ThunderboltOutlined,
  CopyOutlined,
  DeleteOutlined,
  UploadOutlined,
  SwapOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  DownOutlined,
  CompressOutlined,
  ExpandOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

const MODES = [
  { value: "standard", label: "Standard" },
  { value: "fluency", label: "Fluency" },
  { value: "creative", label: "Creative" },
  { value: "academic", label: "Academic" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "seo", label: "SEO" },
  { value: "shorten", label: "Shorten" },
  { value: "expand", label: "Expand" },
];

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

function readingTimeMinutes(words) {
  // ~200 wpm
  return Math.max(1, Math.round(words / 200));
}

export default function Paraphraser() {
  const { token } = theme.useToken();

  const [inputText, setInputText] = useState(
    "Paste your text here…\n\nTip: Choose Academic + Professional for research writing. Use SEO mode if you want keyword alignment."
  );

  const [mode, setMode] = useState("academic");
  const [tone, setTone] = useState("professional");
  const [scope, setScope] = useState("paragraph"); // sentence/paragraph/document
  const [lang, setLang] = useState("auto");

  const [creativity, setCreativity] = useState(45);
  const [keepMeaning, setKeepMeaning] = useState(true);
  const [avoidRepeat, setAvoidRepeat] = useState(true);
  const [preserveCitations, setPreserveCitations] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [readingLevel, setReadingLevel] = useState("balanced"); // simple/balanced/advanced

  const [loading, setLoading] = useState(false);
  const [activeVariant, setActiveVariant] = useState("v1");

  // Demo variants (you’ll replace with API results)
  const [variants, setVariants] = useState([
    { key: "v1", title: "Version 1", text: "" },
    { key: "v2", title: "Version 2", text: "" },
    { key: "v3", title: "Version 3", text: "" },
  ]);

  const words = useMemo(() => countWords(inputText), [inputText]);
  const chars = useMemo(() => inputText.length, [inputText]);
  const minutes = useMemo(() => (words ? readingTimeMinutes(words) : 0), [words]);

  const outputText = useMemo(() => {
    return variants.find((v) => v.key === activeVariant)?.text || "";
  }, [variants, activeVariant]);

  const qualityScore = useMemo(() => {
    // fake score for UI (replace with real metrics)
    let score = 72;
    if (mode === "academic") score += 6;
    if (tone === "professional") score += 4;
    if (avoidRepeat) score += 3;
    if (!inputText.trim()) score = 0;
    return Math.min(95, score);
  }, [mode, tone, avoidRepeat, inputText]);

  const uploadProps = {
    multiple: false,
    accept: ".docx,.pdf,.txt,.md,.html",
    beforeUpload: (file) => {
      message.success(`Selected: ${file.name}`);
      return false;
    },
  };

  const generate = async () => {
    const cleaned = inputText.trim();
    if (!cleaned) {
      message.warning("Paste some text first.");
      return;
    }

    setLoading(true);

    // Fake generation (replace with API call)
    setTimeout(() => {
      const base = cleaned
        .replace(/\s+/g, " ")
        .replace(/(\. )/g, ".\n");

      const makeVariant = (i) => {
        const modeLabel = MODES.find((m) => m.value === mode)?.label;
        const toneLabel = TONES.find((t) => t.value === tone)?.label;

        // NOTE: this is just placeholder text generation for UI
        // You will replace with real LLM output.
        return (
          `(${modeLabel} • ${toneLabel} • ${scope} • ${lang})\n\n` +
          base +
          (keyword ? `\n\n[Keyword focus: ${keyword}]` : "") +
          (keepMeaning ? "\n\n✅ Meaning preserved." : "\n\n⚠️ More aggressive rewrite.") +
          (preserveCitations ? "\n✅ Citations kept." : "\n⚠️ Citations may change.") +
          `\n\n— Variation ${i}`
        );
      };

      setVariants([
        { key: "v1", title: "Version 1", text: makeVariant(1) },
        { key: "v2", title: "Version 2", text: makeVariant(2) },
        { key: "v3", title: "Version 3", text: makeVariant(3) },
      ]);

      setActiveVariant("v1");
      setLoading(false);
      message.success("Paraphrase generated.");
    }, 900);
  };

  const copyOutput = async () => {
    if (!outputText.trim()) return message.warning("Nothing to copy yet.");
    await navigator.clipboard.writeText(outputText);
    message.success("Copied to clipboard.");
  };

  const replaceInputWithOutput = () => {
    if (!outputText.trim()) return message.warning("Nothing to apply yet.");
    setInputText(outputText);
    message.success("Replaced input with selected version.");
  };

  const insertBelow = () => {
    if (!outputText.trim()) return message.warning("Nothing to insert yet.");
    setInputText((prev) => `${prev}\n\n---\n\n${outputText}`);
    message.success("Inserted output below input.");
  };

  const clearAll = () => {
    setInputText("");
    setVariants((prev) => prev.map((v) => ({ ...v, text: "" })));
    message.success("Cleared.");
  };

  const moreMenu = {
    items: [
      { key: "v4", label: "Add Version 4" },
      { key: "v5", label: "Add Version 5" },
    ],
    onClick: ({ key }) => {
      const nextIndex = Number(key.replace("v", ""));
      setVariants((prev) => [
        ...prev,
        { key, title: `Version ${nextIndex}`, text: "" },
      ]);
      setActiveVariant(key);
      message.info(`Added ${key.toUpperCase()} (generate to fill it).`);
    },
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Page header */}
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Paraphraser
        </Title>
        <Text type="secondary">
          Rewrite with control: mode, tone, scope, and keyword alignment — without losing meaning.
        </Text>
      </Space>

      {/* Controls */}
      <Card
        style={{
          borderRadius: token.borderRadiusLG,
          marginBottom: 16,
        }}
        bodyStyle={{ padding: 14 }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Text type="secondary">Mode</Text>
            <Select
              style={{ width: "100%" }}
              size="large"
              value={mode}
              onChange={setMode}
              options={MODES}
            />
          </Col>

          <Col xs={24} md={8}>
            <Text type="secondary">Tone</Text>
            <Select
              style={{ width: "100%" }}
              size="large"
              value={tone}
              onChange={setTone}
              options={TONES}
            />
          </Col>

           

          <Col xs={24} md={8}>
            <Text type="secondary">Language</Text>
            <Select
              style={{ width: "100%" }}
              size="large"
              value={lang}
              onChange={setLang}
              options={LANGS}
            />
          </Col>
          <Col xs={24} md={24}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">Scope</Text>
              <Tooltip title="Sentence rewrites smaller chunks; Document rewrites everything with consistency.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Segmented
              block
              size="large"
              value={scope}
              onChange={setScope}
              options={[
                { label: "Sentence", value: "sentence" },
                { label: "Paragraph", value: "paragraph" },
                { label: "Document", value: "document" },
              ]}
            />
          </Col>

          <Col xs={24} md={12}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Creativity <Tag style={{ marginLeft: 8 }}>{creativity}%</Tag>
              </Text>
              <Tooltip title="Higher creativity rewrites more aggressively.">
                <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              </Tooltip>
            </Space>
            <Slider value={creativity} onChange={setCreativity} />
          </Col>

          <Col xs={24} md={12}>
            <Space wrap size={12} style={{ width: "100%", justifyContent: "flex-end" }}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>Upload</Button>
              </Upload>

              <Button icon={<DeleteOutlined />} onClick={clearAll}>
                Clear
              </Button>

              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                loading={loading}
                onClick={generate}
              >
                Generate
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: "14px 0" }} />

        {/* Advanced settings */}
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={7}>
            <Text type="secondary">Keyword / Topic (optional)</Text>
            <Input
              size="large"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., WPS compliance, research methodology..."
            />
          </Col>

          <Col xs={24} md={5}>
            <Text type="secondary">Reading level</Text>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={readingLevel}
              onChange={setReadingLevel}
              options={[
                { value: "simple", label: "Simple" },
                { value: "balanced", label: "Balanced" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
          </Col>

          <Col xs={24} md={12}>
            <Space wrap size={18} style={{ width: "100%", justifyContent: "flex-end" }}>
              <Space>
                <Switch checked={keepMeaning} onChange={setKeepMeaning} />
                <Text>Keep meaning</Text>
              </Space>
              <Space>
                <Switch checked={avoidRepeat} onChange={setAvoidRepeat} />
                <Text>Avoid repetition</Text>
              </Space>
              <Space>
                <Switch checked={preserveCitations} onChange={setPreserveCitations} />
                <Text>Preserve citations</Text>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main area */}
      <Row gutter={[16, 16]}>
        {/* Input */}
        <Col xs={24} lg={24}>
          <Card
            title={
              <Space>
                <CompressOutlined />
                Input
              </Space>
            }
            extra={
              <Space size={10}>
                <Tag>{words} words</Tag>
                <Tag>{chars} chars</Tag>
                {words ? <Tag>{minutes} min read</Tag> : null}
              </Space>
            }
            style={{ borderRadius: token.borderRadiusLG, height: "100%" }}
            bodyStyle={{ padding: 14 }}
          >
            <TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type your content..."
              autoSize={{ minRows: 14, maxRows: 22 }}
              style={{
                fontSize: token.fontSize,
                lineHeight: token.lineHeight,
                borderRadius: token.borderRadiusLG,
              }}
            />

            <Divider style={{ margin: "12px 0" }} />

            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Text type="secondary">
                Output quality (demo):{" "}
                <Text strong style={{ color: token.colorPrimary }}>
                  {qualityScore}/100
                </Text>
              </Text>

              <Progress
                percent={qualityScore}
                showInfo={false}
                style={{ width: 220, margin: 0 }}
              />
            </Space>
          </Card>
        </Col>

        {/* Output */}
        <Col xs={24} lg={24}>
          <Card
            title={
              <Space>
                <ExpandOutlined />
                Output
              </Space>
            }
            extra={
              <Space size={10}>
                <Button icon={<CopyOutlined />} onClick={copyOutput}>
                  Copy
                </Button>
                <Button icon={<SwapOutlined />} onClick={replaceInputWithOutput}>
                  Replace
                </Button>
                <Button icon={<PlusOutlined />} onClick={insertBelow}>
                  Insert
                </Button>

                <Dropdown menu={moreMenu} trigger={["click"]}>
                  <Button>
                    More <DownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            }
            style={{ borderRadius: token.borderRadiusLG, height: "100%" }}
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              activeKey={activeVariant}
              type="card"
              size="large"
              onChange={setActiveVariant}
              items={variants.map((v) => ({
                key: v.key,
                label: v.title,
                children: (
                  <div style={{ padding: 14 }}>
                    <TextArea
                      value={v.text}
                      readOnly
                      placeholder="Generate to see output here..."
                      autoSize={{ minRows: 16, maxRows: 24 }}
                      style={{
                        background: token.colorFillAlter,
                        borderRadius: token.borderRadiusLG,
                        fontSize: token.fontSize,
                        lineHeight: token.lineHeight,
                      }}
                    />

                    <Divider style={{ margin: "12px 0" }} />

                    <Space wrap>
                      <Tag color="blue">{MODES.find((m) => m.value === mode)?.label}</Tag>
                      <Tag color="geekblue">{TONES.find((t) => t.value === tone)?.label}</Tag>
                      <Tag>{scope}</Tag>
                      <Tag>{LANGS.find((l) => l.value === lang)?.label}</Tag>
                      {keyword ? <Tag color="purple">Keyword: {keyword}</Tag> : null}
                      {keepMeaning ? <Tag color="green">Meaning preserved</Tag> : <Tag color="orange">Aggressive rewrite</Tag>}
                      {preserveCitations ? <Tag color="green">Citations kept</Tag> : <Tag color="orange">Citations flexible</Tag>}
                    </Space>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
