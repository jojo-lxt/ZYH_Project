"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { CurrentUserProvider } from "@/features/console/components/CurrentUserContext";

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
  const searchParams = useSearchParams();
  const isMaterialsRoute = pathname.startsWith("/materials");
  const [openKeys, setOpenKeys] = useState(["module", "config"]);
  const { data: propertiesData, isLoading: isPropertiesLoading } = useGetPropertiesQuery();
  // 项目切换器按「项目 id」工作(而非项目名),后端据此隔离数据。getProperties 只返回当前用户的项目。
  const projectOptions = useMemo(
    () =>
      (propertiesData?.properties ?? []).map((property) => ({
        label: property.name,
        value: property.key,
      })),
    [propertiesData?.properties],
  );
  // 当前项目 id 放在 URL 查询参数 ?project= 里,刷新后仍保持在同一个项目。
  // 优先级:URL 里的有效项目 > 上次选中的项目(Redux currentProject)> 用户的第一个项目。
  // 侧边栏/顶部导航切换路由时会丢掉 ?project=,若直接回退到「第一个项目」,多项目账号
  // 每次跳转都会被拽回第一个项目。用 currentProject 兜底修好这一点(对所有跳转都生效),
  // 再给下面的导航链接补上 ?project= 让 URL 始终正确、跳转无闪烁。
  const urlProject = searchParams.get("project") ?? "";
  const isValidProject = (id: string) => projectOptions.some((item) => item.value === id);
  const selectedProject = isValidProject(urlProject)
    ? urlProject
    : isValidProject(currentProject)
      ? currentProject
      : propertiesData?.properties[0]?.key ?? "";
  // 给控制台内部导航链接补上当前项目参数,跳转后不丢项目、也不产生地址栏闪烁。
  const withProject = (href: string) =>
    selectedProject ? `${href}?project=${encodeURIComponent(selectedProject)}` : href;

  // 选中的项目同步进 Redux(供请求头 X-Project-Id 和 RTK 查询参数用)。
  useEffect(() => {
    if (selectedProject && selectedProject !== currentProject) {
      dispatch(setCurrentProject(selectedProject));
    }
  }, [currentProject, dispatch, selectedProject]);

  // URL 里没有有效项目时,把默认项目写进 URL(刷新后仍保持)。
  useEffect(() => {
    if (selectedProject && selectedProject !== urlProject) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("project", selectedProject);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams, selectedProject, urlProject]);

  // 切换项目 = 改 URL 的 ?project=(effect 会把它同步进 Redux 并触发数据重拉)。
  function switchProject(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

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
      label: <Link href={withProject("/overview")}>概览</Link>,
    },
    {
      children: [
        {
          icon: <PictureOutlined />,
          key: "materials",
          label: <Link href={withProject("/materials")}>图片素材管理</Link>,
        },
      ],
      icon: <AppstoreOutlined />,
      key: "module",
      label: "模块管理",
    },
    // 员工只有工作区(概览 + 图片素材);项目管理 / 用户管理仅超管+管理员可见。
    ...(currentUser.role === "员工"
      ? []
      : [
          {
            children: [
              {
                icon: <ProjectOutlined />,
                key: "properties",
                label: <Link href={withProject("/properties")}>项目管理</Link>,
              },
              {
                icon: <TeamOutlined />,
                key: "users",
                label: <Link href={withProject("/users")}>用户管理</Link>,
              },
            ],
            icon: <FolderOpenOutlined />,
            key: "config",
            label: "功能配置",
          },
        ]),
  ];

  const topItems: MenuProps["items"] = topActions.map((item) => ({
    icon: item.icon,
    key: item.href,
    label: <Link href={withProject(item.href)}>{item.label}</Link>,
  }));

  const userItems: MenuProps["items"] = [
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
            loading={isPropertiesLoading}
            onChange={(value) => switchProject(value)}
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

        <Content className="console-content">
          <CurrentUserProvider user={currentUser}>{children}</CurrentUserProvider>
        </Content>
      </Layout>
    </Layout>
  );
}
