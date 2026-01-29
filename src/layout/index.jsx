import React from "react";
import { Layout, theme } from "antd";
import AppNavbar from "./partials/Appnavbar";
import AppSidebar from "./partials/AppSidebar";
import { Outlet } from "react-router-dom";

const { Content, Footer } = Layout;

export default function AppLayout() {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout hasSider>
      <AppSidebar />

      <Layout>
        <AppNavbar />

        <Content style={{ margin: "0 16px", paddingTop: 24, overflow: "initial" }}>
          <Outlet />
        </Content>


        <Footer style={{ textAlign: "center" }}>
          FelixWriter AI ©{new Date().getFullYear()} Powerd by Cortifox
        </Footer>
      </Layout>
    </Layout>
  );
}
