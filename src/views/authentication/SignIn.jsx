import React, { useState } from "react";
import { Button, Divider, Input, Space, Typography, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, GoogleOutlined, AppleOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import AuthLayout from "../../layout/AuthLayout";
import { signInSchema } from "./authSchemas";
const { Text } = Typography;

export default function SignIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function fakeSignIn(values) {
    // replace with API call
    await new Promise((r) => setTimeout(r, 700));
    return values;
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
            await fakeSignIn(values);
            message.success("Signed in (demo)");
            navigate("/"); // replace with your app route
          } catch (e) {
            message.error("Login failed");
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
              <Button icon={<GoogleOutlined />} style={{ flex: 1 }}>
                Sign in with Google
              </Button>
              <Button icon={<AppleOutlined />} style={{ flex: 1 }}>
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
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
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
