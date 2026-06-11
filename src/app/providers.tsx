"use client";

import type { ReactNode } from "react";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { Provider } from "react-redux";
import { store } from "@/store/store";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <ConfigProvider
        button={{
          autoInsertSpace: false,
        }}
        locale={zhCN}
        theme={{
          components: {
            Button: {
              borderRadius: 6,
              controlHeight: 40,
              fontWeight: 600,
              primaryShadow: "none",
            },
            Input: {
              borderRadius: 6,
              controlHeight: 40,
            },
            Select: {
              borderRadius: 6,
              controlHeight: 42,
            },
            Upload: {
              borderRadiusLG: 8,
              colorBorder: "#d6d3d1",
            },
          },
          token: {
            borderRadius: 6,
            colorBgContainer: "#ffffff",
            colorBorder: "#d6d3d1",
            colorInfo: "#0f766e",
            colorPrimary: "#0f766e",
            colorText: "#1c1917",
            colorTextSecondary: "#57534e",
            fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", Helvetica, sans-serif',
          },
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </Provider>
  );
}
