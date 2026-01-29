// src/views/profile/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Tabs,
  Input,
  Button,
  Switch,
  Tag,
  Divider,
  Alert,
  message,
  theme,
  Avatar,
  Upload,
  Select,
  List,
  Modal,
  Form,
  Skeleton,
  Descriptions,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  SettingOutlined,
  CreditCardOutlined,
  SafetyOutlined,
  BellOutlined,
  CloudOutlined,
  KeyOutlined,
  DeleteOutlined,
  UploadOutlined,
  CopyOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import * as Yup from "yup";

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

const { Title, Text } = Typography;

const TIMEZONES = [
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu (Nepal)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UAE)" },
  { value: "UTC", label: "UTC" },
];

const LANGS = [
  { value: "en", label: "English" },
  { value: "ne", label: "Nepali" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
];

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const PLANS = [
  { key: "free", name: "Free", price: "$0", badge: "default" },
  { key: "plus", name: "Plus", price: "$12/mo", badge: "blue" },
  { key: "pro", name: "Pro", price: "$25/mo", badge: "purple" },
  { key: "team", name: "Team", price: "$49/mo", badge: "gold" },
];

function safeParseJson(v, fallback) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function formatDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

export default function Profile() {
  const { token } = theme.useToken();

  // UI state
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [tab, setTab] = useState("account"); // account | settings | subscription | security | data
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(null); // "logout" | "delete"

  // “Server” user mock (replace with backend later)
  const [user, setUser] = useState(() => {
    // allow quick boot without backend
    const cached = safeParseJson(localStorage.getItem("felix_user_profile") || "null", null);
    return (
      cached || {
        id: "u_001",
        name: "Shasan Dhakal",
        email: "shasan@example.com",
        avatarUrl: "",
        createdAt: new Date().toISOString(),
        role: "Owner",
        plan: "free",
        planStatus: "active",
        renewsAt: null,
        billingEmail: "shasan@example.com",
        organization: "Cortifox Systems",
      }
    );
  });

  const [prefs, setPrefs] = useState(() => {
    const cached = safeParseJson(localStorage.getItem("felix_user_prefs") || "null", null);
    return (
      cached || {
        language: "en",
        timezone: "Asia/Kathmandu",
        theme: "system",
        compactMode: false,

        emailNotifications: true,
        productUpdates: true,
        securityAlerts: true,

        autosave: true,
        noSaveMode: false,
        analytics: true,
      }
    );
  });

  const persist = (nextUser, nextPrefs) => {
    localStorage.setItem("felix_user_profile", JSON.stringify(nextUser));
    localStorage.setItem("felix_user_prefs", JSON.stringify(nextPrefs));
  };

  // Simulate loading or fetch from backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setApiError("");
      try {
        /**
         * Optional backend:
         * GET /api/me
         * GET /api/me/preferences
         * GET /api/billing/subscription
         */
        // const res = await api.get("/api/me");
        // setUser(res.data);
        // const pref = await api.get("/api/me/preferences");
        // setPrefs(pref.data);

        // For now: small delay for nicer UX
        await new Promise((r) => setTimeout(r, 300));
        if (mounted) setLoading(false);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load profile.";
        if (mounted) {
          setApiError(msg);
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Forms
  const accountFormik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: user?.name || "",
      email: user?.email || "",
      organization: user?.organization || "",
    },
    validationSchema: Yup.object({
      name: Yup.string().trim().min(2, "Too short").required("Required"),
      email: Yup.string().trim().email("Invalid email").required("Required"),
      organization: Yup.string().trim().max(80, "Too long"),
    }),
    onSubmit: async (values) => {
      setApiError("");
      try {
        /**
         * PUT /api/me
         */
        // await api.put("/api/me", values);

        const next = { ...user, ...values };
        setUser(next);
        persist(next, prefs);
        message.success("Account updated.");
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to update account.";
        setApiError(msg);
      }
    },
  });

  const securityFormik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().min(6, "Too short").required("Required"),
      newPassword: Yup.string()
        .min(8, "Min 8 chars")
        .matches(/[A-Z]/, "Add one uppercase letter")
        .matches(/[0-9]/, "Add one number")
        .required("Required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords don't match")
        .required("Required"),
    }),
    onSubmit: async (values, { resetForm }) => {
      setApiError("");
      try {
        /**
         * POST /api/me/change-password
         */
        // await api.post("/api/me/change-password", {
        //   currentPassword: values.currentPassword,
        //   newPassword: values.newPassword,
        // });

        resetForm();
        message.success("Password updated.");
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to update password.";
        setApiError(msg);
      }
    },
  });

  const subscription = useMemo(() => {
    const plan = PLANS.find((p) => p.key === user.plan) || PLANS[0];
    return {
      ...plan,
      status: user.planStatus || "active",
      renewsAt: user.renewsAt,
    };
  }, [user.plan, user.planStatus, user.renewsAt]);

  // Actions
  const setPref = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    persist(user, next);
  };

  const copyText = async (t) => {
    if (!t) return;
    await navigator.clipboard.writeText(t);
    message.success("Copied.");
  };

  const selectPlan = async (planKey) => {
    setApiError("");
    try {
      /**
       * POST /api/billing/subscribe
       * { plan: planKey }
       */
      // await api.post("/api/billing/subscribe", { plan: planKey });

      const next = { ...user, plan: planKey, planStatus: "active", renewsAt: planKey === "free" ? null : futureDate(30) };
      setUser(next);
      persist(next, prefs);
      message.success(`Switched to ${planKey.toUpperCase()}.`);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to change plan.";
      setApiError(msg);
    }
  };

  const openConfirm = (mode) => {
    setConfirmMode(mode);
    setConfirmOpen(true);
  };

  const doConfirm = async () => {
    setConfirmOpen(false);
    if (confirmMode === "logout") {
      // Typical logout
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      message.success("Logged out.");
      // navigate later if you want
      return;
    }
    if (confirmMode === "delete") {
      setApiError("");
      try {
        /**
         * DELETE /api/me
         */
        // await api.delete("/api/me");

        // wipe local
        localStorage.removeItem("felix_user_profile");
        localStorage.removeItem("felix_user_prefs");
        localStorage.removeItem("access_token");
        message.success("Account deleted (local mock).");
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to delete account.";
        setApiError(msg);
      }
    }
  };

  const exportData = async () => {
    const payload = {
      profile: user,
      preferences: prefs,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "felix_profile_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const avatarUploadProps = {
    multiple: false,
    accept: "image/*",
    beforeUpload: async (file) => {
      setApiError("");
      try {
        /**
         * POST /api/me/avatar (multipart)
         */
        // const form = new FormData();
        // form.append("avatar", file);
        // const res = await api.post("/api/me/avatar", form);
        // const avatarUrl = res.data.avatarUrl;

        // mock: use local object url
        const avatarUrl = URL.createObjectURL(file);
        const next = { ...user, avatarUrl };
        setUser(next);
        persist(next, prefs);
        message.success("Avatar updated.");
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to upload avatar.";
        setApiError(msg);
      }
      return false; // prevent auto upload
    },
    showUploadList: false,
  };

  const tabs = useMemo(
    () => [
      {
        key: "account",
        label: (
          <Space>
            <UserOutlined /> Account
          </Space>
        ),
        children: (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card style={cardStyle(token)} bodyStyle={{ padding: 16 }}>
                <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                  <Space align="start">
                    <Avatar size={56} src={user.avatarUrl || undefined} icon={<UserOutlined />} />
                    <div>
                      <Text strong style={{ fontSize: 16 }}>
                        {user.name}
                      </Text>
                      <div>
                        <Text type="secondary">{user.email}</Text>
                      </div>
                      <Space style={{ marginTop: 6 }}>
                        <Tag color="blue">{user.role}</Tag>
                        <Tag color={planBadge(user.plan)}>{user.plan.toUpperCase()}</Tag>
                      </Space>
                    </div>
                  </Space>

                  <Upload {...avatarUploadProps}>
                    <Tooltip title="Change avatar">
                      <Button icon={<UploadOutlined />}>Upload</Button>
                    </Tooltip>
                  </Upload>
                </Space>

                <Divider style={{ margin: "14px 0" }} />

                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="Member since">{formatDate(user.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="Organization">{user.organization || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Billing email">{user.billingEmail || "—"}</Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: "14px 0" }} />

                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Button danger icon={<LogoutOutlined />} onClick={() => openConfirm("logout")}>
                    Log out
                  </Button>
                  <Button danger type="primary" icon={<DeleteOutlined />} onClick={() => openConfirm("delete")}>
                    Delete account
                  </Button>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={14}>
              <Card
                title={
                  <Space>
                    <SettingOutlined /> Profile details
                  </Space>
                }
                style={cardStyle(token)}
                bodyStyle={{ padding: 16 }}
                extra={
                  <Button type="primary" onClick={accountFormik.handleSubmit}>
                    Save
                  </Button>
                }
              >
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <Text type="secondary">Name</Text>
                    <Input
                      size="large"
                      value={accountFormik.values.name}
                      onChange={(e) => accountFormik.setFieldValue("name", e.target.value)}
                      onBlur={accountFormik.handleBlur}
                      status={accountFormik.touched.name && accountFormik.errors.name ? "error" : ""}
                    />
                    {accountFormik.touched.name && accountFormik.errors.name ? (
                      <Text type="danger">{accountFormik.errors.name}</Text>
                    ) : null}
                  </Col>

                  <Col xs={24} md={12}>
                    <Text type="secondary">Email</Text>
                    <Input
                      size="large"
                      value={accountFormik.values.email}
                      onChange={(e) => accountFormik.setFieldValue("email", e.target.value)}
                      onBlur={accountFormik.handleBlur}
                      status={accountFormik.touched.email && accountFormik.errors.email ? "error" : ""}
                    />
                    {accountFormik.touched.email && accountFormik.errors.email ? (
                      <Text type="danger">{accountFormik.errors.email}</Text>
                    ) : null}
                  </Col>

                  <Col xs={24}>
                    <Text type="secondary">Organization</Text>
                    <Input
                      size="large"
                      value={accountFormik.values.organization}
                      onChange={(e) => accountFormik.setFieldValue("organization", e.target.value)}
                      onBlur={accountFormik.handleBlur}
                      status={accountFormik.touched.organization && accountFormik.errors.organization ? "error" : ""}
                    />
                    {accountFormik.touched.organization && accountFormik.errors.organization ? (
                      <Text type="danger">{accountFormik.errors.organization}</Text>
                    ) : null}
                  </Col>
                </Row>

                <Divider style={{ margin: "14px 0" }} />

                 
              </Card>
            </Col>
          </Row>
        ),
      },

      {
        key: "settings",
        label: (
          <Space>
            <SettingOutlined /> Preferences
          </Space>
        ),
        children: (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="General" style={cardStyle(token)} bodyStyle={{ padding: 16 }}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <Text type="secondary">Language</Text>
                    <Select
                      size="large"
                      style={{ width: "100%" }}
                      value={prefs.language}
                      options={LANGS}
                      onChange={(v) => setPref({ language: v })}
                    />
                  </Col>

                  <Col xs={24} md={12}>
                    <Text type="secondary">Time zone</Text>
                    <Select
                      size="large"
                      style={{ width: "100%" }}
                      value={prefs.timezone}
                      options={TIMEZONES}
                      onChange={(v) => setPref({ timezone: v })}
                    />
                  </Col>

                  <Col xs={24} md={12}>
                    <Text type="secondary">Theme</Text>
                    <Select
                      size="large"
                      style={{ width: "100%" }}
                      value={prefs.theme}
                      options={THEMES}
                      onChange={(v) => setPref({ theme: v })}
                    />
                    <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                      Tip: If you’re using your ThemeProvider, map this value to your global theme.
                    </Text>
                  </Col>

                  <Col xs={24} md={12}>
                    <Text type="secondary">Compact mode</Text>
                    <div style={{ marginTop: 8 }}>
                      <Switch checked={prefs.compactMode} onChange={(v) => setPref({ compactMode: v })} />
                      <Text style={{ marginLeft: 10 }}>{prefs.compactMode ? "On" : "Off"}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Notifications" style={cardStyle(token)} bodyStyle={{ padding: 16 }}>
                <SettingRow
                  icon={<BellOutlined />}
                  title="Email notifications"
                  desc="Receive updates about your documents, teams, and billing."
                  value={prefs.emailNotifications}
                  onChange={(v) => setPref({ emailNotifications: v })}
                />
                <Divider style={{ margin: "12px 0" }} />
                <SettingRow
                  icon={<InfoCircleOutlined />}
                  title="Product updates"
                  desc="New tools, new modes, new features."
                  value={prefs.productUpdates}
                  onChange={(v) => setPref({ productUpdates: v })}
                />
                <Divider style={{ margin: "12px 0" }} />
                <SettingRow
                  icon={<SafetyOutlined />}
                  title="Security alerts"
                  desc="Login from new device, password change, billing changes."
                  value={prefs.securityAlerts}
                  onChange={(v) => setPref({ securityAlerts: v })}
                />
              </Card>
            </Col>
          </Row>
        ),
      },

      {
        key: "subscription",
        label: (
          <Space>
            <CreditCardOutlined /> Subscription
          </Space>
        ),
        children: (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card style={cardStyle(token)} bodyStyle={{ padding: 16 }}>
                <Title level={4} style={{ marginTop: 0 }}>
                  Current plan
                </Title>

                <Space wrap>
                  <Tag color={planBadge(subscription.key)} style={{ fontSize: 13 }}>
                    {subscription.name}
                  </Tag>
                  <Tag>{subscription.price}</Tag>
                  <Tag color="green">{subscription.status}</Tag>
                  {subscription.renewsAt ? <Tag>Renews: {formatDate(subscription.renewsAt)}</Tag> : <Tag>No renewal</Tag>}
                </Space>

                <Divider style={{ margin: "14px 0" }} />

                <Text strong>Billing email</Text>
                <Input
                  value={user.billingEmail || ""}
                  onChange={(e) => {
                    const next = { ...user, billingEmail: e.target.value };
                    setUser(next);
                    persist(next, prefs);
                  }}
                  style={{ marginTop: 8 }}
                  size="large"
                />

                <Divider style={{ margin: "14px 0" }} />

                
              </Card>
            </Col>

            <Col xs={24} lg={14}>
              <Card
                title="Plans"
                style={cardStyle(token)}
                bodyStyle={{ padding: 16 }}
                extra={<Text type="secondary">Click to switch</Text>}
              >
                <Row gutter={[12, 12]}>
                  {PLANS.map((p) => (
                    <Col xs={24} md={12} key={p.key}>
                      <Card
                        hoverable
                        style={{
                          borderRadius: token.borderRadiusLG,
                          border: p.key === user.plan ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
                        }}
                        bodyStyle={{ padding: 14 }}
                        onClick={() => selectPlan(p.key)}
                      >
                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                          <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <Text strong style={{ fontSize: 16 }}>
                              {p.name}
                            </Text>
                            <Tag color={p.badge}>{p.price}</Tag>
                          </Space>

                          <Text type="secondary">
                            {p.key === "free" && "Basics: paraphrase + limited tools."}
                            {p.key === "plus" && "More modes, faster speed, larger limits."}
                            {p.key === "pro" && "All tools + pro checks + best quality."}
                            {p.key === "team" && "Team workspace, roles, shared docs."}
                          </Text>

                          {p.key === user.plan ? (
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                              Active
                            </Tag>
                          ) : (
                            <Tag>Switch</Tag>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>
        ),
      },

      {
        key: "security",
        label: (
          <Space>
            <SafetyOutlined /> Security
          </Space>
        ),
        children: (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <KeyOutlined /> Change password
                  </Space>
                }
                style={cardStyle(token)}
                bodyStyle={{ padding: 16 }}
                extra={
                  <Button type="primary" onClick={securityFormik.handleSubmit}>
                    Update
                  </Button>
                }
              >
                <Row gutter={[12, 12]}>
                  <Col xs={24}>
                    <Text type="secondary">Current password</Text>
                    <Input.Password
                      size="large"
                      value={securityFormik.values.currentPassword}
                      onChange={(e) => securityFormik.setFieldValue("currentPassword", e.target.value)}
                      onBlur={securityFormik.handleBlur}
                      status={securityFormik.touched.currentPassword && securityFormik.errors.currentPassword ? "error" : ""}
                    />
                    {securityFormik.touched.currentPassword && securityFormik.errors.currentPassword ? (
                      <Text type="danger">{securityFormik.errors.currentPassword}</Text>
                    ) : null}
                  </Col>

                  <Col xs={24}>
                    <Text type="secondary">New password</Text>
                    <Input.Password
                      size="large"
                      value={securityFormik.values.newPassword}
                      onChange={(e) => securityFormik.setFieldValue("newPassword", e.target.value)}
                      onBlur={securityFormik.handleBlur}
                      status={securityFormik.touched.newPassword && securityFormik.errors.newPassword ? "error" : ""}
                    />
                    {securityFormik.touched.newPassword && securityFormik.errors.newPassword ? (
                      <Text type="danger">{securityFormik.errors.newPassword}</Text>
                    ) : (
                      <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                        Must include uppercase + number (basic pro-level rule).
                      </Text>
                    )}
                  </Col>

                  <Col xs={24}>
                    <Text type="secondary">Confirm new password</Text>
                    <Input.Password
                      size="large"
                      value={securityFormik.values.confirmPassword}
                      onChange={(e) => securityFormik.setFieldValue("confirmPassword", e.target.value)}
                      onBlur={securityFormik.handleBlur}
                      status={securityFormik.touched.confirmPassword && securityFormik.errors.confirmPassword ? "error" : ""}
                    />
                    {securityFormik.touched.confirmPassword && securityFormik.errors.confirmPassword ? (
                      <Text type="danger">{securityFormik.errors.confirmPassword}</Text>
                    ) : null}
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <SafetyOutlined /> Sessions & API
                  </Space>
                }
                style={cardStyle(token)}
                bodyStyle={{ padding: 16 }}
              >
                <SettingRow
                  icon={<SafetyOutlined />}
                  title="Two-factor authentication (2FA)"
                  desc="Backend feature — keep the toggle now, wire it later."
                  value={false}
                  onChange={() => message.info("Wire this to backend later.")}
                />

                <Divider style={{ margin: "12px 0" }} />

                <Text strong>API key (mock)</Text>
                <Text type="secondary" style={{ display: "block" }}>
                  Show/copy an API key like ChatGPT.
                </Text>

                <Space style={{ width: "100%", marginTop: 10 }}>
                  <Input value={"fw_live_" + user.id + "_xxxxxxxx"} readOnly />
                  <Button icon={<CopyOutlined />} onClick={() => copyText("fw_live_" + user.id + "_xxxxxxxx")} />
                </Space>

                <Divider style={{ margin: "12px 0" }} />

                <Button danger icon={<DeleteOutlined />} onClick={() => message.info("Add revoke endpoint later.")}>
                  Revoke API keys
                </Button>
              </Card>
            </Col>
          </Row>
        ),
      },

      {
        key: "data",
        label: (
          <Space>
            <CloudOutlined /> Data controls
          </Space>
        ),
        children: (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Privacy" style={cardStyle(token)} bodyStyle={{ padding: 16 }}>
                <SettingRow
                  icon={<CloudOutlined />}
                  title="Autosave"
                  desc="Save documents automatically."
                  value={prefs.autosave}
                  onChange={(v) => setPref({ autosave: v })}
                />
                <Divider style={{ margin: "12px 0" }} />
                <SettingRow
                  icon={<SafetyOutlined />}
                  title="No Save mode"
                  desc="Don’t store content on server (requires backend support)."
                  value={prefs.noSaveMode}
                  onChange={(v) => setPref({ noSaveMode: v })}
                />
                <Divider style={{ margin: "12px 0" }} />
                <SettingRow
                  icon={<InfoCircleOutlined />}
                  title="Analytics"
                  desc="Help improve the product with usage stats."
                  value={prefs.analytics}
                  onChange={(v) => setPref({ analytics: v })}
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Export" style={cardStyle(token)} bodyStyle={{ padding: 16 }}>
                <Text type="secondary">
                  Download your profile + preferences. Later you’ll add documents, projects, history, etc.
                </Text>

                <Divider style={{ margin: "14px 0" }} />

                <Button type="primary" icon={<ExportOutlined />} onClick={exportData}>
                  Export my data
                </Button>

                <Divider style={{ margin: "14px 0" }} />

                 
              </Card>
            </Col>
          </Row>
        ),
      },
    ],
    [token, user, prefs, subscription]
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Profile
        </Title>
        <Text type="secondary">Manage account, preferences, subscription, security, and data.</Text>
      </Space>

      {apiError ? (
        <Alert type="error" showIcon message="Something went wrong" description={apiError} style={{ marginBottom: 12 }} />
      ) : null}

      <Card style={cardStyle(token)} bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <Tabs
          size="large"
          type="card"
            activeKey={tab}
            onChange={setTab}
            items={tabs}
            tabBarStyle={{ padding: "0 16px" }}
          />
        )}
      </Card>

      <Modal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={doConfirm}
        okButtonProps={{ danger: confirmMode === "delete" }}
        okText={confirmMode === "delete" ? "Delete" : "Confirm"}
        title={confirmMode === "delete" ? "Delete account?" : "Log out?"}
      >
        {confirmMode === "delete" ? (
          <Text>
            This will permanently delete your account (once your backend is connected). This action is not reversible.
          </Text>
        ) : (
          <Text>You’ll be logged out from this device.</Text>
        )}
      </Modal>
    </div>
  );
}

function SettingRow({ icon, title, desc, value, onChange }) {
  return (
    <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
      <Space align="start">
        <div style={{ marginTop: 2 }}>{icon}</div>
        <div>
          <Text strong>{title}</Text>
          <div>
            <Text type="secondary">{desc}</Text>
          </div>
        </div>
      </Space>
      <Switch checked={!!value} onChange={onChange} />
    </Space>
  );
}

function cardStyle(token) {
  return { borderRadius: token.borderRadiusLG };
}

function planBadge(planKey) {
  if (planKey === "plus") return "blue";
  if (planKey === "pro") return "purple";
  if (planKey === "team") return "gold";
  return "default";
}

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
