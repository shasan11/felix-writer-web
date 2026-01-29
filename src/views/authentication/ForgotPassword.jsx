import React, { useState } from "react";
import { Button, Input, Space, Typography, message } from "antd";
import { Link } from "react-router-dom";
import { Formik } from "formik";
import AuthLayout from "../../layout/AuthLayout";
import { forgotPasswordSchema } from "./authSchemas";

const { Text } = Typography;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);

  async function fakeRequestReset(email) {
    await new Promise((r) => setTimeout(r, 700));
    return email;
  }

  return (
    <AuthLayout
      title="Forgot Password"
      description="Enter your email and we’ll send a reset link"
      rightContent={<div style={{ width: "100%", height: "100%" }} />}
    >
      <Formik
        initialValues={{ email: "" }}
        validationSchema={forgotPasswordSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            setLoading(true);
            await fakeRequestReset(values.email);
            message.success("Reset link sent (demo)");
          } catch (e) {
            message.error("Request failed");
          } finally {
            setLoading(false);
            setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
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

              <Button htmlType="submit" type="primary" size="large" block loading={loading}>
                Send reset link
              </Button>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Link to="/auth/sign-in">Back to login</Link>
                <Link to="/auth/sign-up">Create account</Link>
              </div>
            </Space>
          </form>
        )}
      </Formik>
    </AuthLayout>
  );
}
