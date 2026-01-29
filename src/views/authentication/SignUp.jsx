import React, { useState } from "react";
import { Button, Input, Space, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import AuthLayout from "../../layout/AuthLayout";
import { signUpSchema } from "./authSchemas";
const { Text, Title } = Typography;

export default function SignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function fakeSignUp(values) {
    await new Promise((r) => setTimeout(r, 800));
    return values;
  }

  return (
    <AuthLayout
      title="Create an account"
      description="Fill the below form to sign up"
      rightContent={<div style={{ width: "100%", height: "100%" }} />}
    >
      <Formik
        initialValues={{ fullName: "", email: "", password: "", confirmPassword: "" }}
        validationSchema={signUpSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            setLoading(true);
            await fakeSignUp(values);
            message.success("Account created (demo)");
            navigate("/auth/sign-in");
          } catch (e) {
            message.error("Sign up failed");
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
                <Text strong>Full Name</Text>
                <Input
                  name="fullName"
                  value={values.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your full name"
                  size="large"
                  status={touched.fullName && errors.fullName ? "error" : ""}
                />
                {touched.fullName && errors.fullName && (
                  <Text type="danger" style={{ fontSize: 12 }}>
                    {errors.fullName}
                  </Text>
                )}
              </div>

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
                  placeholder="Create password"
                  size="large"
                  status={touched.password && errors.password ? "error" : ""}
                />
                {touched.password && errors.password && (
                  <Text type="danger" style={{ fontSize: 12 }}>
                    {errors.password}
                  </Text>
                )}
              </div>

              <div>
                <Text strong>Confirm Password</Text>
                <Input.Password
                  name="confirmPassword"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Confirm password"
                  size="large"
                  status={touched.confirmPassword && errors.confirmPassword ? "error" : ""}
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <Text type="danger" style={{ fontSize: 12 }}>
                    {errors.confirmPassword}
                  </Text>
                )}
              </div>

              <Button htmlType="submit" type="primary" size="large" block loading={loading}>
                Create account
              </Button>

              <Text type="secondary" style={{ textAlign: "center" }}>
                Already have an account? <Link to="/auth/sign-in">Sign in</Link>
              </Text>
            </Space>
          </form>
        )}
      </Formik>
    </AuthLayout>
  );
}
