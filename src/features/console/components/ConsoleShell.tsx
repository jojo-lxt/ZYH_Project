"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppstoreOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  DownOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  PictureOutlined,
  ProjectOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { App, Button, Dropdown, Layout, Menu, Select, Space, type MenuProps } from "antd";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectConsoleCurrentProject,
  setCurrentProject,
} from "@/store/consoleSlice";
import { useGetPropertiesQuery } from "@/store/consoleApi";
import type { AuthUser } from "@/shared/types/auth";

type ConsoleShellProps = {
  children: ReactNode;
  currentUser: AuthUser;
};

const { Content, Header, Sider } = Layout;

const topActions = [
  { href: "/materials/tag-config", icon: <TagsOutlined />, label: "图片标签配置" },
  { href: "/materials/selling-point-config", icon: <SettingOutlined />, label: "图片卖点配置" },
  { href: "/materials/upload-image", icon: <UploadOutlined />, label: "上传图片" },
  { href: "/materials/upload-video", icon: <VideoCameraOutlined />, label: "上传视频" },
];

function isActive(pathname: string, href: string) {
  if (href === "/overview") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getSideSelectedKey(pathname: string) {
  if (isActive(pathname, "/materials")) {
    return "materials";
  }

  if (isActive(pathname, "/properties")) {
    return "properties";
  }

  if (isActive(pathname, "/users")) {
    return "users";
  }

  return "overview";
}

function getTopSelectedKey(pathname: string) {
  return topActions.find((item) => isActive(pathname, item.href))?.href;
}

export function ConsoleShell({ children, currentUser }: ConsoleShellProps) {
  const { message } = App.useApp();
  const currentProject = useAppSelector(selectConsoleCurrentProject);
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const router = useRouter();
  const isMaterialsRoute = pathname.startsWith("/materials");
  const [openKeys, setOpenKeys] = useState(["module", "config"]);
  const { data: propertiesData } = useGetPropertiesQuery();
  // 项目切换器按「项目 id」工作(而非项目名),后端据此隔离数据。
  const projectOptions = useMemo(
    () =>
      (propertiesData?.properties ?? []).map((property) => ({
        label: property.name,
        value: property.key,
      })),
    [propertiesData?.properties],
  );
  // 默认项目:用户绑定项目(按名字匹配)对应的 id,匹配不上则取第一个项目。
  const defaultProjectId = useMemo(() => {
    const userProperty = currentUser.property.trim();
    const bound = (propertiesData?.properties ?? []).find((property) => property.name === userProperty);

    return bound?.key ?? propertiesData?.properties[0]?.key ?? "";
  }, [currentUser.property, propertiesData?.properties]);
  const selectedProject = currentProject && projectOptions.some((item) => item.value === currentProject)
    ? currentProject
    : defaultProjectId;

  useEffect(() => {
    if (selectedProject && selectedProject !== currentProject) {
      dispatch(setCurrentProject(selectedProject));
    }
  }, [currentProject, dispatch, selectedProject]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    message.success("已退出登录");
    router.replace("/login");
    router.refresh();
  }

  const sideItems: MenuProps["items"] = [
    {
      icon: <BarChartOutlined />,
      key: "overview",
      label: <Link href="/overview">概览</Link>,
    },
    {
      children: [
        {
          icon: <PictureOutlined />,
          key: "materials",
          label: <Link href="/materials">图片素材管理</Link>,
        },
      ],
      icon: <AppstoreOutlined />,
      key: "module",
      label: "模块管理",
    },
    {
      children: [
        {
          icon: <ProjectOutlined />,
          key: "properties",
          label: <Link href="/properties">项目管理</Link>,
        },
        {
          icon: <TeamOutlined />,
          key: "users",
          label: <Link href="/users">用户管理</Link>,
        },
      ],
      icon: <FolderOpenOutlined />,
      key: "config",
      label: "功能配置",
    },
  ];

  const topItems: MenuProps["items"] = topActions.map((item) => ({
    icon: item.icon,
    key: item.href,
    label: <Link href={item.href}>{item.label}</Link>,
  }));

  const userItems: MenuProps["items"] = [
    {
      icon: <UserOutlined />,
      key: "profile",
      label: "个人资料",
    },
    {
      icon: <DatabaseOutlined />,
      key: "project",
      label: "切换项目",
    },
    {
      danger: true,
      icon: <LogoutOutlined />,
      key: "logout",
      label: "退出登录",
    },
  ];

  return (
    <Layout className="console-shell">
      <Sider className="console-sidebar" theme="light" width={244}>
        <div className="console-brand">
          <div className="brand-mark">
            <ThunderboltOutlined />
          </div>
          <strong>内容中台</strong>
        </div>

        <Menu
          className="side-menu"
          items={sideItems}
          mode="inline"
          onOpenChange={setOpenKeys}
          openKeys={openKeys}
          selectedKeys={[getSideSelectedKey(pathname)]}
        />
      </Sider>

      <Layout className="console-workspace">
        <Header className="console-topbar">
          <Select
            className="project-picker"
            onChange={(value) => dispatch(setCurrentProject(value))}
            options={projectOptions}
            placeholder="请选择项目"
            value={selectedProject || undefined}
          />

          {isMaterialsRoute ? (
            <Menu
              className="top-nav"
              items={topItems}
              mode="horizontal"
              selectedKeys={getTopSelectedKey(pathname) ? [getTopSelectedKey(pathname)!] : []}
            />
          ) : (
            <div />
          )}

          <Dropdown
            menu={{
              items: userItems,
              onClick: ({ key }) => {
                if (key === "logout") {
                  logout();
                }
              },
            }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button className="user-area" type="text">
              <Space size={8}>
                <span>{currentUser.name}</span>
                <em>{currentUser.role}</em>
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </Header>

        <Content className="console-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
