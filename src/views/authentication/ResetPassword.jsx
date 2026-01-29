import React, { useState } from "react";
import { Button, Input, Space, Typography, message } from "antd";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import AuthLayout from "../../layout/AuthLayout";
import { resetPasswordSchema } from "./authSchemas";
const { Text } = Typography;

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function fakeResetPassword(tokenValue, password) {
    await new Promise((r) => setTimeout(r, 800));
    return { tokenValue, password };
  }

  return (
    <AuthLayout
      title="Reset Password"
      description="Create a new password for your account"
      rightContent={<div style={{ width: "100%", height: "100%" }} />}
    >
      <Formik
        initialValues={{ password: "", confirmPassword: "" }}
        validationSchema={resetPasswordSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            setLoading(true);
            await fakeResetPassword(token, values.password);
            message.success("Password reset successful (demo)");
            navigate("/auth/sign-in");
          } catch (e) {
            message.error("Reset failed");
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
                <Text strong>New Password</Text>
                <Input.Password
                  name="password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter new password"
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
                  placeholder="Confirm new password"
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
                Reset password
              </Button>

              <Link to="/auth/sign-in">Back to login</Link>
            </Space>
          </form>
        )}
      </Formik>
    </AuthLayout>
  );
}
