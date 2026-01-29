import React from "react";
import { Row, Col, Card, Typography, Space } from "antd";

const { Title, Text } = Typography;

export default function AuthLayout({
  brand = "IQMS",
  subtitle = "Pressure Sensor",
  title = "Login to Dashboard",
  description = "Fill the below form to login",
  rightBadgeText = "IQM SYSTEMS Pressure Control",
  rightHeadline = "Manage your concreting and construction operations more professionally",
  rightContent = null, // pass an image/mock on pages if you want
  children,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#f5f7fb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(1200px, 100%)",
          background: "#fff",
          borderRadius: 20,
          padding: 18,
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
        }}
      >
        <Row gutter={[18, 18]} align="stretch">
          {/* LEFT */}
          <Col xs={24} lg={11}>
            <Card
              bordered={false}
              style={{ height: "100%", borderRadius: 18 }}
              bodyStyle={{ padding: 28 }}
            >
              {/* Brand */}
              <Space align="center" style={{ marginBottom: 18 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "#6D5EF6",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  I
                </div>
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ fontWeight: 700 }}>{brand}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {subtitle}
                  </Text>
                </div>
              </Space>

              {/* Titles */}
              <Title level={3} style={{ marginBottom: 4 }}>
                {title}
              </Title>
              <Text type="secondary">{description}</Text>

              <div style={{ marginTop: 22 }}>{children}</div>
            </Card>
          </Col>

          {/* RIGHT */}
          <Col xs={24} lg={13}>
            <div
              style={{
                height: "90%",
                borderRadius: 18,
                padding: 20,
                background:
                  "linear-gradient(135deg, rgba(109,94,246,0.14), rgba(109,94,246,0.04))",
                border: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 18,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {rightBadgeText}
                </div>

                <Title level={3} style={{ marginTop: 0 }}>
                  {rightHeadline}
                </Title>
              </div>

              <div
                style={{
                  flex: 1,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.75)",
                  border: "1px dashed rgba(0,0,0,0.10)",
                  display: "grid",
                  placeItems: "center",
                  padding: 14,
                  minHeight: 160,
                }}
              >
                {rightContent ?? (
                  <Text type="secondary">
                    Place your dashboard mock / image / illustration here
                  </Text>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
