"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReloadOutlined, SettingOutlined, SortAscendingOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { QRCodeSVG } from "qrcode.react";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import type { PropertyRow, UserRow } from "@/shared/types/console";
import {
  useCreatePropertyMutation,
  useCreateUserMutation,
  useDeletePropertyMutation,
  useDeleteUserMutation,
  useGetPropertiesQuery,
  useGetPropertyDetailQuery,
  useGetUsersQuery,
  useUpdatePropertyMutation,
  useUpdateUserMutation,
} from "@/store/consoleApi";
import { MARKETING_STAGES } from "@/features/console/shared/marketingStages";
import { useCurrentUser } from "@/features/console/components/CurrentUserContext";

type PropertyDraft = Omit<PropertyRow, "createdAt" | "key">;

type UserDraft = {
  name: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  managerId?: string;
  projectIds: string[];
};

const emptyPropertyDraft: PropertyDraft = {
  address: "",
  developer: "",
  name: "",
  stage: "现房在售",
  type: "住宅",
};

const emptyProperties: PropertyRow[] = [];
const emptyUsers: UserRow[] = [];

const emptyUserDraft: UserDraft = {
  name: "",
  password: "",
  phone: "",
  role: "员工",
  status: "active",
  projectIds: [],
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { data?: { error?: string }; error?: string })?.data;

  return data?.error ?? (error as { error?: string })?.error ?? fallback;
}

function PropertyPage({ onDetail }: { onDetail: (id: string) => void }) {
  const { message } = App.useApp();
  const { data, isFetching, refetch } = useGetPropertiesQuery();
  const [createProperty, { isLoading: isCreating }] = useCreatePropertyMutation();
  const [updateProperty, { isLoading: isUpdating }] = useUpdatePropertyMutation();
  const [deletePropertyMutation] = useDeletePropertyMutation();
  const properties = data?.properties ?? emptyProperties;
  const [draft, setDraft] = useState<PropertyDraft>(emptyPropertyDraft);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [stageQuery, setStageQuery] = useState<string | undefined>();

  const stageOptions = useMemo(
    () =>
      Array.from(new Set([...properties.map((property) => property.stage), ...MARKETING_STAGES]))
        .filter(Boolean)
        .map((value) => ({ label: value, value })),
    [properties],
  );
  const filteredProperties = useMemo(() => {
    const list = properties.filter((property) => {
      const query = nameQuery.trim();
      const matchName = !query || property.name.includes(query);
      const matchStage = !stageQuery || property.stage === stageQuery;

      return matchName && matchStage;
    });

    return sortDesc ? list : [...list].reverse();
  }, [nameQuery, properties, sortDesc, stageQuery]);

  function openCreateProperty() {
    setEditingKey(null);
    setDraft(emptyPropertyDraft);
    setIsModalOpen(true);
  }

  function openEditProperty(property: PropertyRow) {
    setEditingKey(property.key);
    setDraft({
      address: property.address,
      developer: property.developer,
      name: property.name,
      stage: property.stage,
      type: property.type,
    });
    setIsModalOpen(true);
  }

  async function saveProperty() {
    if (!draft.developer.trim() || !draft.name.trim()) {
      message.warning("请填写开发商和项目名称");
      return;
    }

    try {
      if (editingKey) {
        await updateProperty({ ...draft, id: editingKey }).unwrap();
      } else {
        await createProperty(draft).unwrap();
      }

      setIsModalOpen(false);
      message.success(editingKey ? "项目已更新" : "项目已创建");
    } catch (error) {
      message.error(getApiErrorMessage(error, "项目保存失败"));
    }
  }

  async function deleteProperty(key: string) {
    try {
      await deletePropertyMutation(key).unwrap();
      message.success("项目已删除");
    } catch (error) {
      message.error(getApiErrorMessage(error, "项目删除失败"));
    }
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
          <Button onClick={() => onDetail(record.key)} type="link">
            详情
          </Button>
          <Button onClick={() => openEditProperty(record)} type="link">
            编辑
          </Button>
          <Popconfirm
            cancelText="取消"
            okText="删除"
            onConfirm={() => deleteProperty(record.key)}
            title="确认删除该项目？"
          >
            <Button danger type="link">
              删除
            </Button>
          </Popconfirm>
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
          options={stageOptions}
          placeholder="请选择状态"
          value={stageQuery}
        />
        <Input disabled placeholder="当前开发商由表格创建/编辑维护" />
        <Space>
          <Button
            onClick={() => {
              setNameQuery("");
              setStageQuery(undefined);
            }}
          >
            重置
          </Button>
          <Button onClick={() => message.success("查询完成")} type="primary">
            查询
          </Button>
        </Space>
      </div>
      <div className="section-title-row">
        <h2>项目</h2>
        <Space>
          <Button onClick={openCreateProperty} type="primary">
            创建项目
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={isFetching}
            onClick={() => refetch()}
            type="text"
          />
          <Button
            icon={<SortAscendingOutlined />}
            onClick={() => setSortDesc((value) => !value)}
            type="text"
          />
          <Button
            icon={<SettingOutlined />}
            onClick={() => message.info("列配置已保存为默认视图")}
            type="text"
          />
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={filteredProperties}
        loading={isFetching}
        pagination={false}
        rowKey="key"
      />

      <Modal
        centered
        confirmLoading={isCreating || isUpdating}
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
              options={stageOptions}
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
  const searchParams = useSearchParams();
  const propertyIdFromUrl = searchParams.get("id");
  const { data: propertiesData, isLoading: isLoadingProperties } = useGetPropertiesQuery();
  const fallbackPropertyId = propertiesData?.properties[0]?.key;
  const propertyId = propertyIdFromUrl || fallbackPropertyId;
  const { data, isFetching } = useGetPropertyDetailQuery(propertyId ?? "", { skip: !propertyId });

  if (!propertyId && !isLoadingProperties) {
    return (
      <section className="console-page">
        <p className="breadcrumb">项目管理列表 / 详情</p>
        <Empty description="数据库中暂无项目" />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="console-page">
        <p className="breadcrumb">项目管理列表 / 详情</p>
        <Empty description={isFetching || isLoadingProperties ? "正在读取项目详情" : "项目详情不存在"} />
      </section>
    );
  }

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
        {data.channels.length > 0 ? (
          data.channels.map((channel) => (
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
          ))
        ) : (
          <Empty description="该项目暂无渠道链接" />
        )}
      </div>
    </section>
  );
}

function UsersPage() {
  const { message } = App.useApp();
  const { data: usersData, isFetching, refetch } = useGetUsersQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUserMutation] = useDeleteUserMutation();
  const users = usersData?.users ?? emptyUsers;
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<UserDraft>(emptyUserDraft);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const me = useCurrentUser();
  const isSuper = me.role === "超级管理员";
  const { data: propertiesData } = useGetPropertiesQuery();

  // 超管可建管理员/员工;管理员只能建员工(锁死)。
  const roleOptions = isSuper
    ? [
        { label: "管理员", value: "管理员" },
        { label: "员工", value: "员工" },
      ]
    : [{ label: "员工", value: "员工" }];

  // 超管建员工时选「所属管理员」:从用户列表里筛出角色为管理员的账号。
  const managerOptions = useMemo(
    () => users.filter((u) => u.role === "管理员").map((u) => ({ label: u.name, value: u.key })),
    [users],
  );

  // 可访问项目:超管按所选管理员的 ownerId 过滤;管理员用自己的全部项目(getProperties 已只返回自己的)。
  const assignableProjects = useMemo(
    () =>
      (propertiesData?.properties ?? [])
        .filter((p) => (isSuper ? p.ownerId === draft.managerId : true))
        .map((p) => ({ label: p.name, value: p.key })),
    [propertiesData, isSuper, draft.managerId],
  );

  const filteredUsers = useMemo(() => {
    const list = users.filter((user) => {
      const matchPhone = !phoneQuery.trim() || user.phone.includes(phoneQuery.trim());
      const matchName = !nameQuery.trim() || user.name.includes(nameQuery.trim());

      return matchPhone && matchName;
    });

    return sortDesc ? list : [...list].reverse();
  }, [nameQuery, phoneQuery, sortDesc, users]);
  const pageUsers = filteredUsers.slice((currentPage - 1) * 10, currentPage * 10);

  function openCreateUser() {
    setEditingKey(null);
    setDraft({
      ...emptyUserDraft,
    });
    setIsModalOpen(true);
  }

  function openEditUser(user: UserRow) {
    setEditingKey(user.key);
    setDraft({
      name: user.name,
      password: "",
      phone: user.phone,
      role: user.role,
      status: user.status ?? "active",
      managerId: user.managerId ?? undefined,
      projectIds: user.projectKeys ?? [],
    });
    setIsModalOpen(true);
  }

  async function saveUser() {
    if (!draft.name.trim() || !draft.phone.trim()) {
      message.warning("请填写用户名和手机号");
      return;
    }

    if (!/^1\d{10}$/.test(draft.phone.trim())) {
      message.warning("请输入 11 位手机号");
      return;
    }

    if (!editingKey && draft.password.length < 8) {
      message.warning("新用户密码至少需要 8 位");
      return;
    }

    if (editingKey && draft.password && draft.password.length < 8) {
      message.warning("新密码至少需要 8 位");
      return;
    }

    if (draft.role === "员工") {
      if (isSuper && !draft.managerId) {
        message.warning("请为员工选择所属管理员");
        return;
      }
      if (draft.projectIds.length === 0) {
        message.warning("请至少为员工分配 1 个项目");
        return;
      }
    }

    const staffFields =
      draft.role === "员工"
        ? { managerId: isSuper ? draft.managerId : undefined, projectIds: draft.projectIds }
        : {};

    try {
      if (editingKey) {
        await updateUser({
          id: editingKey,
          name: draft.name,
          password: draft.password || undefined,
          phone: draft.phone,
          role: draft.role,
          status: draft.status,
          ...staffFields,
        }).unwrap();
      } else {
        await createUser({
          name: draft.name,
          password: draft.password,
          phone: draft.phone,
          role: draft.role,
          ...staffFields,
        }).unwrap();
      }

      setIsModalOpen(false);
      message.success(editingKey ? "用户已更新" : "用户已创建");
    } catch (error) {
      message.error(getApiErrorMessage(error, "用户保存失败"));
    }
  }

  async function deleteUser(key: string) {
    try {
      await deleteUserMutation(key).unwrap();
      message.success("用户已删除");
    } catch (error) {
      message.error(getApiErrorMessage(error, "用户删除失败"));
    }
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
        <Tag color={role === "超级管理员" ? "gold" : role === "管理员" ? "success" : "processing"}>{role}</Tag>
      ),
    },
    { dataIndex: "managerName", title: "所属管理员", render: (value: string | null) => value || "-" },
    {
      dataIndex: "projectNames",
      title: "可访问项目",
      render: (names: string[] = []) => (names.length ? names.join("、") : "-"),
    },
    {
      dataIndex: "status",
      title: "状态",
      render: (status: string = "active") => (
        <Tag color={status === "active" ? "green" : "red"}>
          {status === "active" ? "启用" : "禁用"}
        </Tag>
      ),
    },
    { dataIndex: "createdAt", title: "创建时间" },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button onClick={() => openEditUser(record)} type="link">
            编辑
          </Button>
          <Popconfirm
            cancelText="取消"
            okText="删除"
            onConfirm={() => deleteUser(record.key)}
            title="确认删除该用户？"
          >
            <Button danger type="link">
              删除
            </Button>
          </Popconfirm>
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
        <Space>
          <Button
            onClick={() => {
              setPhoneQuery("");
              setNameQuery("");
              setCurrentPage(1);
            }}
          >
            重置
          </Button>
          <Button
            onClick={() => {
              setCurrentPage(1);
              message.success("查询完成");
            }}
            type="primary"
          >
            查询
          </Button>
        </Space>
      </div>
      <div className="section-title-row">
        <h2>用户</h2>
        <Space>
          <Button onClick={openCreateUser} type="primary">
            创建
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={isFetching}
            onClick={() => {
              refetch();
              setCurrentPage(1);
            }}
            type="text"
          />
          <Button
            icon={<SortAscendingOutlined />}
            onClick={() => setSortDesc((value) => !value)}
            type="text"
          />
          <Button
            icon={<SettingOutlined />}
            onClick={() => message.info("列配置已保存为默认视图")}
            type="text"
          />
        </Space>
      </div>
      <Table columns={columns} dataSource={pageUsers} loading={isFetching} pagination={false} rowKey="key" />
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
        confirmLoading={isCreating || isUpdating}
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
            <span>{editingKey ? "新密码" : "登录密码 *"}</span>
            <Input.Password
              onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
              placeholder={editingKey ? "留空则不修改" : "至少 8 位"}
              value={draft.password}
            />
          </label>
          <label>
            <span>角色</span>
            <Select
              disabled={!isSuper}
              onChange={(value) => setDraft((current) => ({ ...current, role: value }))}
              options={roleOptions}
              value={draft.role}
            />
          </label>
          {isSuper && draft.role === "员工" ? (
            <label>
              <span>所属管理员</span>
              <Select
                onChange={(value) => setDraft((current) => ({ ...current, managerId: value, projectIds: [] }))}
                options={managerOptions}
                placeholder="选择该员工归属的管理员"
                value={draft.managerId}
              />
            </label>
          ) : null}
          {draft.role === "员工" ? (
            <label>
              <span>可访问项目</span>
              <Select
                mode="multiple"
                onChange={(value) => setDraft((current) => ({ ...current, projectIds: value }))}
                options={assignableProjects}
                placeholder={isSuper && !draft.managerId ? "请先选择所属管理员" : "至少选择 1 个项目"}
                value={draft.projectIds}
              />
            </label>
          ) : null}
          <label>
            <span>状态</span>
            <Select
              onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
              options={[
                { label: "启用", value: "active" },
                { label: "禁用", value: "disabled" },
              ]}
              value={draft.status}
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}

export function PropertyManagementPage() {
  const router = useRouter();

  return <PropertyPage onDetail={(id) => router.push(`/properties/detail?id=${encodeURIComponent(id)}`)} />;
}

export { PropertyDetailPage, UsersPage };
