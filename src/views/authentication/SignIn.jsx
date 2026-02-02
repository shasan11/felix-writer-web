// src/views/auth/SignIn.jsx  (or wherever your file lives)
import React, { useEffect, useMemo, useState } from "react";
import { Button, Divider, Input, Space, Typography, message } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  GoogleOutlined,
  AppleOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import axios from "axios";
import AuthLayout from "../../layout/AuthLayout";
import { signInSchema } from "./authSchemas";

const { Text } = Typography;

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL; // http://localhost:8000
const FRONTEND_URL = import.meta.env.VITE_APP_FRONTEND_URL; // http://localhost:5173
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; // <-- you must set this

// ---- token helpers (simple + practical) ----
const TOKEN_KEYS = {
  access: "fw_access_token",
  refresh: "fw_refresh_token",
};

function saveTokens({ access, refresh }) {
  if (access) localStorage.setItem(TOKEN_KEYS.access, access);
  if (refresh) localStorage.setItem(TOKEN_KEYS.refresh, refresh);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

function setAxiosAuthHeader(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}

export default function SignIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: BACKEND_URL,
      headers: { "Content-Type": "application/json" },
      withCredentials: false,
    });
    return instance;
  }, []);

  // ---- load Google Identity Services (GIS) script ----
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn("VITE_GOOGLE_CLIENT_ID is missing. Google login will not work.");
      return;
    }

    // If already loaded
    if (window.google?.accounts?.oauth2) {
      setGoogleReady(true);
      return;
    }

    const scriptId = "google-identity-services";
    if (document.getElementById(scriptId)) {
      // might still be loading
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          setGoogleReady(true);
        }
      }, 200);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => setGoogleReady(true);
    script.onerror = () => {
      setGoogleReady(false);
      message.error("Failed to load Google sign-in. Check internet or browser blocking.");
    };

    document.body.appendChild(script);
  }, []);

  // ---- EMAIL/PASSWORD LOGIN (Djoser JWT) ----
  async function loginWithEmailPassword(values) {
    // Djoser JWT endpoint
    // POST /auth/jwt/create/  body: { email, password }
    const res = await api.post("/auth/jwt/create/", {
      email: values.email,
      password: values.password,
    });

    // Djoser returns: { access, refresh }
    const { access, refresh } = res.data || {};
    if (!access || !refresh) throw new Error("Token response missing access/refresh");

    saveTokens({ access, refresh });
    setAxiosAuthHeader(access);

    // optional: fetch user profile (requires Djoser /auth/users/me/)
    // const me = await api.get("/auth/users/me/");
    // console.log(me.data);

    return res.data;
  }

  // ---- GOOGLE LOGIN (dj-rest-auth social login) ----
  async function exchangeGoogleAccessToken(googleAccessToken) {
    // You made this endpoint in Django:
    // POST /auth/google/ body: { access_token: "<google_access_token>" }
    const res = await api.post("/auth/google/", { access_token: googleAccessToken });

    // Typical response with REST_USE_JWT=True: { access, refresh, user? }
    const { access, refresh } = res.data || {};
    if (!access) throw new Error("Backend did not return JWT access token");

    saveTokens({ access, refresh });
    setAxiosAuthHeader(access);
    return res.data;
  }

  // Google button handler using OAuth2 token client (access_token)
  async function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID) {
      message.error("Google Client ID missing. Set VITE_GOOGLE_CLIENT_ID in frontend .env");
      return;
    }
    if (!googleReady || !window.google?.accounts?.oauth2) {
      message.error("Google sign-in not ready yet.");
      return;
    }

    setGoogleLoading(true);

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "email profile openid",
        // prompt: "consent", // uncomment if you want it to always ask
        callback: async (tokenResponse) => {
          try {
            const gAccess = tokenResponse?.access_token;
            if (!gAccess) throw new Error("Google did not return access_token");

            await exchangeGoogleAccessToken(gAccess);
            message.success("Signed in with Google");
            navigate("/"); // your app home
          } catch (err) {
            console.error(err);
            clearTokens();
            setAxiosAuthHeader(null);
            message.error("Google login failed (backend exchange failed).");
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      console.error(err);
      setGoogleLoading(false);
      message.error("Google login failed.");
    }
  }

  return (
    <AuthLayout
      title="Login to Dashboard"
      description="Fill the below form to login"
      rightContent={<div style={{ width: "100%", height: "100%" }} />}
    >
      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={signInSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            setLoading(true);
            await loginWithEmailPassword(values);
            message.success("Signed in");
            navigate("/"); // your app route
          } catch (e) {
            console.error(e);
            message.error(
              e?.response?.data?.detail ||
                e?.response?.data?.non_field_errors?.[0] ||
                "Login failed"
            );
          } finally {
            setLoading(false);
            setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            {/* Social buttons row */}
            <Space style={{ width: "100%" }} size="middle">
              <Button
                icon={<GoogleOutlined />}
                style={{ flex: 1 }}
                onClick={handleGoogleLogin}
                loading={googleLoading}
                disabled={!GOOGLE_CLIENT_ID}
              >
                Sign in with Google
              </Button>

              {/* Apple: placeholder */}
              <Button
                icon={<AppleOutlined />}
                style={{ flex: 1 }}
                disabled
                title="Apple sign-in not configured"
              >
                Sign in with Apple
              </Button>
            </Space>

            <Divider plain style={{ margin: "14px 0" }}>
              OR
            </Divider>

            <Space direction="vertical" style={{ width: "100%" }} size={10}>
              <div>
                <Text strong>Email</Text>
                <Input
                  name="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter email address"
                  size="large"
                  status={touched.email && errors.email ? "error" : ""}
                />
                {touched.email && errors.email && (
                  <Text type="danger" style={{ fontSize: 12 }}>
                    {errors.email}
                  </Text>
                )}
              </div>

              <div>
                <Text strong>Password</Text>
                <Input.Password
                  name="password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter Password"
                  size="large"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                  status={touched.password && errors.password ? "error" : ""}
                />
                {touched.password && errors.password && (
                  <Text type="danger" style={{ fontSize: 12 }}>
                    {errors.password}
                  </Text>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Link to="/auth/forgot-password">Forget Password?</Link>
                <Link to="/auth/sign-up">Create account</Link>
              </div>

              <Button
                htmlType="submit"
                type="primary"
                size="large"
                block
                loading={loading}
                style={{ marginTop: 6 }}
              >
                Login
              </Button>

               
               
            </Space>
          </form>
        )}
      </Formik>
    </AuthLayout>
  );
}
