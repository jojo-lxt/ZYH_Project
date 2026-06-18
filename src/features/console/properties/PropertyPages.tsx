"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReloadOutlined, SettingOutlined, SortAscendingOutlined } from "@ant-design/icons";
import { App, Button, Input, Modal, Pagination, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { QRCodeSVG } from "qrcode.react";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import { useGetPropertiesQuery, useGetPropertyDetailQuery, useGetUsersQuery } from "@/store/consoleApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteProperty as deletePropertyAction,
  deleteUser as deleteUserAction,
  resetProperties as resetPropertiesAction,
  resetUsers as resetUsersAction,
  reverseProperties,
  reverseUsers,
  selectProperties,
  selectUsers,
  upsertProperty,
  upsertUser,
} from "@/store/consoleSlice";
import { mockPropertyDetailData, type PropertyRow, type UserRow } from "@/shared/mock/consoleData";

function formatNow() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function PropertyPage({ onDetail }: { onDetail: () => void }) {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  useGetPropertiesQuery();
  const properties = useAppSelector(selectProperties);
  const emptyDraft: PropertyRow = {
    address: "",
    createdAt: "",
    developer: "",
    key: "",
    name: "",
    stage: "现房在售",
    type: "住宅",
  };
  const [draft, setDraft] = useState<PropertyRow>(emptyDraft);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [stageQuery, setStageQuery] = useState<string | undefined>();

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) => {
        const matchName = property.name.includes(nameQuery.trim());
        const matchStage = !stageQuery || property.stage === stageQuery;

        return matchName && matchStage;
      }),
    [nameQuery, properties, stageQuery],
  );

  function openCreateProperty() {
    setEditingKey(null);
    setDraft({ ...emptyDraft, createdAt: formatNow(), key: `property-${Date.now()}` });
    setIsModalOpen(true);
  }

  function openEditProperty(property: PropertyRow) {
    setEditingKey(property.key);
    setDraft(property);
    setIsModalOpen(true);
  }

  function saveProperty() {
    if (!draft.developer.trim() || !draft.name.trim()) {
      message.warning("请填写开发商和项目名称");
      return;
    }

    dispatch(upsertProperty(draft));
    setIsModalOpen(false);
    message.success(editingKey ? "项目已更新" : "项目已创建");
  }

  function deleteProperty(key: string) {
    dispatch(deletePropertyAction(key));
    message.success("项目已删除");
  }

  const columns: ColumnsType<PropertyRow> = [
    { dataIndex: "developer", title: "开发商" },
    { dataIndex: "name", title: "项目名称" },
    {
      dataIndex: "type",
      title: "项目类型",
      render: (value: string) => <Tag color="green">{value}</Tag>,
    },
    {
      dataIndex: "stage",
      title: "营销阶段",
      render: (value: string) => <Tag color="orange">{value}</Tag>,
    },
    { dataIndex: "address", title: "项目地址" },
    { dataIndex: "createdAt", title: "创建时间" },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button onClick={onDetail} type="link">
            详情
          </Button>
          <Button onClick={() => openEditProperty(record)} type="link">
            编辑
          </Button>
          <Button danger onClick={() => deleteProperty(record.key)} type="link">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section className="console-page">
      <div className="search-row">
        <Input
          onChange={(event) => setNameQuery(event.target.value)}
          placeholder="项目名称"
          value={nameQuery}
        />
        <Select
          allowClear
          onChange={(value) => setStageQuery(value)}
          options={[
            { label: "现房在售", value: "现房在售" },
            { label: "交付和口碑期", value: "交付和口碑期" },
          ]}
          placeholder="请选择状态"
          value={stageQuery}
        />
        <Input disabled placeholder="当前开发商由表格创建/编辑维护" />
        <Space>
          <Button onClick={() => {
            setNameQuery("");
            setStageQuery(undefined);
          }}>
            重置
          </Button>
          <Button onClick={() => message.success("查询完成")} type="primary">查询</Button>
          <Button onClick={() => message.info("暂无更多筛选项")} type="link">展开</Button>
        </Space>
      </div>
      <div className="section-title-row">
        <h2>项目</h2>
        <Space>
          <Button onClick={openCreateProperty} type="primary">创建项目</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              dispatch(resetPropertiesAction());
              message.success("项目列表已刷新");
            }}
            type="text"
          />
          <Button
            icon={<SortAscendingOutlined />}
            onClick={() => dispatch(reverseProperties())}
            type="text"
          />
          <Button
            icon={<SettingOutlined />}
            onClick={() => message.info("列配置已保存为默认视图")}
            type="text"
          />
        </Space>
      </div>
      <Table columns={columns} dataSource={filteredProperties} pagination={false} />

      <Modal
        centered
        onCancel={() => setIsModalOpen(false)}
        onOk={saveProperty}
        open={isModalOpen}
        title={editingKey ? "编辑项目" : "创建项目"}
        width={620}
      >
        <div className="crud-form-grid">
          <label>
            <span>开发商 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, developer: event.target.value }))}
              value={draft.developer}
            />
          </label>
          <label>
            <span>项目名称 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              value={draft.name}
            />
          </label>
          <label>
            <span>项目类型</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, type: value }))}
              options={[
                { label: "住宅", value: "住宅" },
                { label: "商办", value: "商办" },
                { label: "综合体", value: "综合体" },
              ]}
              value={draft.type}
            />
          </label>
          <label>
            <span>营销阶段</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, stage: value }))}
              options={[
                { label: "现房在售", value: "现房在售" },
                { label: "交付和口碑期", value: "交付和口碑期" },
                { label: "强销期", value: "强销期" },
              ]}
              value={draft.stage}
            />
          </label>
          <label className="crud-form-wide">
            <span>项目地址</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
              value={draft.address}
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}

function PropertyDetailPage() {
  const { message } = App.useApp();
  const { data = mockPropertyDetailData } = useGetPropertyDetailQuery("1");
  const { property } = data;

  return (
    <section className="console-page">
      <p className="breadcrumb">项目管理列表 / 详情</p>
      <h2>项目详情</h2>
      <div className="detail-grid">
        <span>开发商：<strong>{property.developer}</strong></span>
        <span>项目名称：<strong>{property.name}</strong></span>
        <span>项目类型：<strong>{property.type}</strong></span>
        <span>项目地址：<strong>{property.address}</strong></span>
        <span>创建时间：<strong>{property.createdAt}</strong></span>
        <span>描述：<strong>{property.description}</strong></span>
      </div>
      <h3 className="link-title">NFC 链接 & 二维码</h3>
      <div className="qr-channel-grid">
        {data.channels.map((channel) => (
          <div className="qr-channel" key={channel.label}>
            <h3>{channel.label}</h3>
            <p>
              NFC 链接：
              <button
                onClick={async () => {
                  const copied = await copyTextToClipboard(channel.qrValue);
                  message[copied ? "success" : "error"](copied ? "已复制链接" : "复制失败");
                }}
                type="button"
              >
                复制
              </button>
            </p>
            <p>二维码：扫码查看项目详情</p>
            <div className="qr-placeholder">
              <QRCodeSVG value={channel.qrValue} size={210} />
            </div>
            <time>{channel.updatedAt}</time>
          </div>
        ))}
      </div>
    </section>
  );
}

function UsersPage() {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  useGetUsersQuery();
  const users = useAppSelector(selectUsers);
  const emptyDraft: UserRow = {
    createdAt: "",
    key: "",
    name: "",
    phone: "",
    property: "张江金茂府",
    role: "游客",
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<UserRow>(emptyDraft);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [propertyQuery, setPropertyQuery] = useState<string | undefined>();

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchPhone = user.phone.includes(phoneQuery.trim());
        const matchName = user.name.includes(nameQuery.trim());
        const matchProperty = !propertyQuery || user.property === propertyQuery;

        return matchPhone && matchName && matchProperty;
      }),
    [nameQuery, phoneQuery, propertyQuery, users],
  );
  const pageUsers = filteredUsers.slice((currentPage - 1) * 10, currentPage * 10);

  function openCreateUser() {
    setEditingKey(null);
    setDraft({
      ...emptyDraft,
      createdAt: formatNow(),
      key: `user-${Date.now()}`,
    });
    setIsModalOpen(true);
  }

  function openEditUser(user: UserRow) {
    setEditingKey(user.key);
    setDraft(user);
    setIsModalOpen(true);
  }

  function saveUser() {
    if (!draft.name.trim() || !draft.phone.trim()) {
      message.warning("请填写用户名和手机号");
      return;
    }

    dispatch(upsertUser(draft));
    setIsModalOpen(false);
    message.success(editingKey ? "用户已更新" : "用户已创建");
  }

  function deleteUser(key: string) {
    dispatch(deleteUserAction(key));
    message.success("用户已删除");
  }

  const columns: ColumnsType<UserRow> = [
    { dataIndex: "name", title: "用户名" },
    {
      dataIndex: "phone",
      title: "手机号",
      render: (phone: string) => (
        <span>
          {phone}{" "}
          <button
            className="copy-mini"
            onClick={async () => {
              const copied = await copyTextToClipboard(phone);
              message[copied ? "success" : "error"](copied ? "手机号已复制" : "复制失败");
            }}
            type="button"
          >
            复制
          </button>
        </span>
      ),
    },
    { dataIndex: "key", title: "小红书账号链接", render: () => "-" },
    {
      dataIndex: "role",
      title: "角色",
      render: (role: string) => (
        <Tag color={role === "管理员" ? "success" : "processing"}>{role}</Tag>
      ),
    },
    { dataIndex: "property", title: "有权限的项目" },
    { dataIndex: "createdAt", title: "创建时间" },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button onClick={() => openEditUser(record)} type="link">编辑</Button>
          <Button danger onClick={() => deleteUser(record.key)} type="link">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section className="console-page">
      <div className="search-row">
        <Input
          onChange={(event) => setPhoneQuery(event.target.value)}
          placeholder="手机号"
          value={phoneQuery}
        />
        <Input
          onChange={(event) => setNameQuery(event.target.value)}
          placeholder="用户名"
          value={nameQuery}
        />
        <Select
          allowClear
          onChange={(value) => setPropertyQuery(value)}
          options={[{ label: "张江金茂府", value: "张江金茂府" }]}
          placeholder="有权限的项目"
          value={propertyQuery}
        />
        <Space>
          <Button onClick={() => {
            setPhoneQuery("");
            setNameQuery("");
            setPropertyQuery(undefined);
            setCurrentPage(1);
          }}>
            重置
          </Button>
          <Button onClick={() => {
            setCurrentPage(1);
            message.success("查询完成");
          }} type="primary">
            查询
          </Button>
          <Button onClick={() => message.info("暂无更多筛选项")} type="link">展开</Button>
        </Space>
      </div>
      <div className="section-title-row">
        <h2>用户</h2>
        <Space>
          <Button onClick={() => message.success("已模拟导入模板用户")}>模板导入</Button>
          <Button onClick={openCreateUser} type="primary">创建</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              dispatch(resetUsersAction());
              setCurrentPage(1);
              message.success("用户列表已刷新");
            }}
            type="text"
          />
          <Button
            icon={<SortAscendingOutlined />}
            onClick={() => dispatch(reverseUsers())}
            type="text"
          />
          <Button
            icon={<SettingOutlined />}
            onClick={() => message.info("列配置已保存为默认视图")}
            type="text"
          />
        </Space>
      </div>
      <Table columns={columns} dataSource={pageUsers} pagination={false} />
      <div className="pagination-row">
        <span>共 {filteredUsers.length} 条</span>
        <Pagination
          current={currentPage}
          onChange={setCurrentPage}
          pageSize={10}
          total={filteredUsers.length}
        />
      </div>

      <Modal
        centered
        onCancel={() => setIsModalOpen(false)}
        onOk={saveUser}
        open={isModalOpen}
        title={editingKey ? "编辑用户" : "创建用户"}
        width={580}
      >
        <div className="crud-form-grid">
          <label>
            <span>用户名 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              value={draft.name}
            />
          </label>
          <label>
            <span>手机号 *</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
              value={draft.phone}
            />
          </label>
          <label>
            <span>角色</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, role: value }))}
              options={[
                { label: "管理员", value: "管理员" },
                { label: "游客", value: "游客" },
              ]}
              value={draft.role}
            />
          </label>
          <label>
            <span>有权限的项目</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, property: value }))}
              options={[{ label: "张江金茂府", value: "张江金茂府" }]}
              value={draft.property}
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}


export function PropertyManagementPage() {
  const router = useRouter();

  return <PropertyPage onDetail={() => router.push("/properties/detail")} />;
}


export { PropertyDetailPage, UsersPage };
