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
              borderRadius: 8,
              controlHeight: 40,
              fontWeight: 700,
              primaryShadow: "none",
            },
            DatePicker: {
              borderRadius: 8,
              controlHeight: 42,
            },
            Input: {
              borderRadius: 8,
              controlHeight: 40,
            },
            Modal: {
              borderRadiusLG: 10,
            },
            Select: {
              borderRadius: 8,
              controlHeight: 42,
            },
            Table: {
              headerBg: "#eef7ff",
              headerColor: "#16324f",
              rowHoverBg: "#f7fbff",
            },
            Tabs: {
              inkBarColor: "#00b8ff",
              itemActiveColor: "#006bff",
              itemHoverColor: "#00a4e8",
              itemSelectedColor: "#006bff",
            },
            Upload: {
              borderRadiusLG: 8,
              colorBorder: "#b8d7ee",
            },
          },
          token: {
            borderRadius: 8,
            colorBgContainer: "#ffffff",
            colorBorder: "#bfd8ea",
            colorInfo: "#00b8ff",
            colorPrimary: "#006bff",
            colorSuccess: "#18c964",
            colorText: "#102033",
            colorTextSecondary: "#5f6f86",
            fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", Helvetica, sans-serif',
          },
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </Provider>
  );
}
