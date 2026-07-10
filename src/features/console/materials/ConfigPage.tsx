"use client";

import { useMemo, useState } from "react";
import { CloseOutlined, DeleteOutlined, DownOutlined, PlusOutlined, RightOutlined, TableOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, Input, Modal, Space } from "antd";
import {
  useCreateConfigItemMutation,
  useDeleteConfigItemMutation,
  useGetSellingPointConfigQuery,
  useGetTagConfigQuery,
  useUpdateConfigItemMutation,
} from "@/store/consoleApi";
import { selectConsoleCurrentProject } from "@/store/consoleSlice";
import { useAppSelector } from "@/store/hooks";
import type { ConfigTreeItem, ConsoleConfigResponse } from "@/shared/types/console";

type ConfigKind = "selling" | "tag";

type ConfigDraft = {
  description: string;
  id: string;
  modes: string[];
  name: string;
};

const emptyConfigData: ConsoleConfigResponse = {
  allowPrimaryCreate: false,
  stats: [],
  title: "",
  tree: [],
};

function findConfigItem(items: ConfigTreeItem[], id: string): ConfigTreeItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    const child = findConfigItem(item.children ?? [], id);

    if (child) {
      return child;
    }
  }

  return null;
}

function getParentForConfigItem(items: ConfigTreeItem[], id: string) {
  return items.find((item) => item.id === id || item.children?.some((child) => child.id === id));
}

function countConfigChildren(items: ConfigTreeItem[]) {
  return items.reduce((total, item) => total + (item.children?.length ?? 0), 0);
}

function deleteConfigItem(items: ConfigTreeItem[], id: string): ConfigTreeItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => {
      if (!item.children) {
        return item;
      }

      const children = deleteConfigItem(item.children, id);

      return {
        ...item,
        children,
        count: children.length,
      };
    });
}

function getFirstConfigId(items: ConfigTreeItem[]) {
  return items[0]?.id ?? "";
}

export function ConfigPage({ title }: { title: string }) {
  const { message } = App.useApp();
  const currentProject = useAppSelector(selectConsoleCurrentProject);
  const isSellingPoint = title.includes("卖点");
  const configKind: ConfigKind = isSellingPoint ? "selling" : "tag";
  const { data: tagApiData = emptyConfigData } = useGetTagConfigQuery(currentProject, { skip: !currentProject });
  const { data: sellingApiData = emptyConfigData } = useGetSellingPointConfigQuery(currentProject, { skip: !currentProject });
  const [createConfigItem] = useCreateConfigItemMutation();
  const [deleteConfigItemMutation] = useDeleteConfigItemMutation();
  const [updateConfigItemMutation] = useUpdateConfigItemMutation();
  const apiData = isSellingPoint ? sellingApiData : tagApiData;
  const tree = apiData.tree;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedId, setSelectedId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [draft, setDraft] = useState<ConfigDraft>({
    description: "",
    id: "",
    modes: ["晒单式", "盘点式"],
    name: "",
  });
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && findConfigItem(tree, selectedId)) {
      return selectedId;
    }

    return getFirstConfigId(tree);
  }, [selectedId, tree]);
  const selected = effectiveSelectedId ? findConfigItem(tree, effectiveSelectedId) : null;
  const selectedParent = effectiveSelectedId ? getParentForConfigItem(tree, effectiveSelectedId) : null;
  const isChildSelected = Boolean(
    selectedParent?.children?.some((child) => child.id === effectiveSelectedId),
  );
  const activeDraft = useMemo(
    () => ({
      description: draft.id === selected?.id ? draft.description : selected?.description ?? "",
      modes: draft.id === selected?.id ? draft.modes : selected?.modes ?? ["晒单式", "盘点式"],
      name: draft.id === selected?.id ? draft.name : selected?.name ?? "",
    }),
    [draft, selected],
  );
  const stats = useMemo(
    () => [
      { label: "一级分类", value: tree.length },
      { label: "二级分类", value: countConfigChildren(tree) },
      { label: "总标签数", value: tree.length + countConfigChildren(tree) },
    ],
    [tree],
  );
  const isModalCreatingSellingPoint = isSellingPoint && Boolean(modalParentId);

  function toggleExpanded(id: string) {
    const next = new Set(expandedIds);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setExpandedIds(next);
  }

  function selectConfigItem(id: string) {
    const item = findConfigItem(tree, id);

    setSelectedId(id);
    setDraft({
      description: item?.description ?? "",
      id,
      modes: item?.modes ?? ["晒单式", "盘点式"],
      name: item?.name ?? "",
    });
  }

  function updateActiveDraft(patch: Partial<Omit<ConfigDraft, "id">>) {
    if (!selected) {
      return;
    }

    setDraft({
      description: activeDraft.description,
      id: selected.id,
      modes: activeDraft.modes,
      name: activeDraft.name,
      ...patch,
    });
  }

  function openCreateModal(parentId: string | null) {
    setModalParentId(parentId);
    setModalName("");
    setModalDescription("");
    setIsModalOpen(true);
  }

  async function handleCreateItem() {
    const name = modalName.trim();
    const isCreatingSellingPoint = isSellingPoint && Boolean(modalParentId);

    if (!name) {
      message.warning(isCreatingSellingPoint ? "请输入卖点" : "请输入分类名称");
      return;
    }

    const result = await createConfigItem({
      description: modalDescription.trim() || undefined,
      kind: configKind,
      modes: isCreatingSellingPoint ? ["种草式"] : undefined,
      name,
      parentId: modalParentId,
    }).unwrap();
    setExpandedIds((current) => {
      const next = new Set(current);
      if (modalParentId) {
        next.add(modalParentId);
      }
      return next;
    });
    setSelectedId(result.id);
    setIsModalOpen(false);
    message.success("新增项已保存");
  }

  async function handleDeleteItem(id: string) {
    if (!id) {
      return;
    }

    const nextId = getFirstConfigId(deleteConfigItem(tree, id));

    await deleteConfigItemMutation({ id, kind: configKind }).unwrap();
    setSelectedId(nextId);
    message.success("已删除");
  }

  async function handleSave() {
    if (!selected) {
      return;
    }

    if (!activeDraft.name.trim()) {
      message.warning(isSellingPoint && isChildSelected ? "请输入卖点" : "请输入分类名称");
      return;
    }

    await updateConfigItemMutation({
      description: activeDraft.description.trim() || undefined,
      id: selected.id,
      kind: configKind,
      modes: isSellingPoint && isChildSelected ? activeDraft.modes : undefined,
      name: activeDraft.name.trim(),
    }).unwrap();
    message.success("已保存当前配置");
  }

  return (
    <section className="console-page taxonomy-page">
      <div className="taxonomy-header">
        <h2>分类总览</h2>
        <Space>
          <Button onClick={() => message.info("导入接口尚未接入")}>导入标签</Button>
          <Button onClick={() => message.info("导出接口尚未接入")}>导出标签</Button>
          <Button onClick={() => message.info("模板下载接口尚未接入")}>下载模板</Button>
        </Space>
      </div>

      <div className="taxonomy-stats">
        {stats.map((stat) => (
          <div className="taxonomy-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <i />
          </div>
        ))}
      </div>

      <div className="taxonomy-section-head">
        <h2>分类明细</h2>
        <Space>
          <Button onClick={() => setExpandedIds(new Set(tree.map((item) => item.id)))}>
            全部展开
          </Button>
          <Button onClick={() => setExpandedIds(new Set())}>全部折叠</Button>
          {apiData.allowPrimaryCreate ? (
            <Button onClick={() => openCreateModal(null)} type="primary">
              新增一级分类
            </Button>
          ) : null}
        </Space>
      </div>

      <div className="taxonomy-layout">
        <div className="taxonomy-list">
          {tree.map((item) => {
            const isOpen = expandedIds.has(item.id);
            const isActive = effectiveSelectedId === item.id;

            return (
              <div className="taxonomy-group" key={item.id}>
                <button
                  className={isActive ? "taxonomy-node active" : "taxonomy-node"}
                  onClick={() => {
                    selectConfigItem(item.id);
                    if ((item.children?.length ?? 0) > 0) {
                      setExpandedIds(new Set(expandedIds).add(item.id));
                    }
                  }}
                  type="button"
                >
                  <span>
                    <strong>
                      {item.name}
                      {typeof item.count === "number" ? <em>({item.count})</em> : null}
                    </strong>
                    {item.description ? <small>{item.description}</small> : null}
                  </span>
                  <span className="taxonomy-actions">
                    {(item.children?.length ?? 0) > 0 ? (
                      <i onClick={(event) => {
                        event.stopPropagation();
                        toggleExpanded(item.id);
                      }}>
                        {isOpen ? <DownOutlined /> : <RightOutlined />}
                      </i>
                    ) : null}
                    <i onClick={(event) => {
                      event.stopPropagation();
                      selectConfigItem(item.id);
                      openCreateModal(item.id);
                    }}><PlusOutlined /></i>
                    {apiData.allowPrimaryCreate ? (
                      <i onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteItem(item.id);
                      }}><DeleteOutlined /></i>
                    ) : null}
                  </span>
                </button>

                {isOpen
                  ? item.children?.map((child) => (
                      <button
                        className={
                          effectiveSelectedId === child.id
                            ? "taxonomy-node taxonomy-child active"
                            : "taxonomy-node taxonomy-child"
                        }
                        key={child.id}
                        onClick={() => selectConfigItem(child.id)}
                        type="button"
                      >
                        <span>
                          <strong>{child.name}</strong>
                          {child.description ? <small>{child.description}</small> : null}
                        </span>
                        <span className="taxonomy-actions">
                          <i onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteItem(child.id);
                          }}><DeleteOutlined /></i>
                        </span>
                      </button>
                    ))
                  : null}
              </div>
            );
          })}
        </div>

        <div className="taxonomy-editor">
          {selected ? (
            <>
              <div className="taxonomy-editor-head">
                <div>
                  <h2>
                    {isSellingPoint
                      ? isChildSelected
                        ? "编辑卖点"
                        : "编辑一级分类"
                      : isChildSelected
                        ? "编辑二级分类"
                        : "编辑一级分类"}
                  </h2>
                  <p>点击左侧标签进行编辑，或添加新标签</p>
                </div>
                <Button danger={isSellingPoint} onClick={() => handleDeleteItem(selected.id)} type="primary">
                  {isSellingPoint && isChildSelected ? "删除卖点" : "删除分类"}
                </Button>
              </div>

              {isSellingPoint && isChildSelected ? (
                <>
                  <label className="taxonomy-field">
                    <span>卖点</span>
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 6 }}
                      onChange={(event) => updateActiveDraft({ name: event.target.value })}
                      value={activeDraft.name}
                    />
                  </label>
                  <div className="taxonomy-field">
                    <span>模式</span>
                    <Checkbox.Group
                      onChange={(values) => updateActiveDraft({ modes: values.map(String) })}
                      options={apiData.modeOptions ?? []}
                      value={activeDraft.modes}
                    />
                  </div>
                </>
              ) : (
                <>
                  <label className="taxonomy-field">
                    <span>分类名称 *</span>
                    <Input
                      onChange={(event) => updateActiveDraft({ name: event.target.value })}
                      value={activeDraft.name}
                    />
                  </label>
                  <label className="taxonomy-field">
                    <span>描述（可选）</span>
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 6 }}
                      onChange={(event) => updateActiveDraft({ description: event.target.value })}
                      value={activeDraft.description}
                    />
                  </label>
                  {!isChildSelected ? (
                    <div className="taxonomy-field">
                      <span>{isSellingPoint ? "卖点管理" : "子标签管理"}</span>
                      <div className="taxonomy-sub-list">
                        {(selected.children ?? []).map((child) => (
                          <div key={child.id}>
                            <span>{child.name}</span>
                            <Button
                              danger
                              icon={<CloseOutlined />}
                              onClick={() => handleDeleteItem(child.id)}
                              shape="circle"
                              size="small"
                              type="text"
                            />
                          </div>
                        ))}
                        <Button block onClick={() => openCreateModal(selected.id)}>
                          {isSellingPoint ? "添加卖点" : "添加子标签"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <Button block onClick={handleSave} type="primary">
                保存
              </Button>
            </>
          ) : (
            <div className="taxonomy-empty">
              <TableOutlined />
              <p>点击左侧标签进行编辑，或添加新标签</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        centered
        footer={[
          <Button key="save" onClick={handleCreateItem} type="primary">
            保存
          </Button>,
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
        ]}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        title="新增"
        width={500}
      >
        <div className="taxonomy-modal-form">
          <label>
            <span>* 所属分类</span>
            <Input
              disabled
              value={modalParentId ? findConfigItem(tree, modalParentId)?.name ?? "" : "一级分类"}
            />
          </label>
          <label>
            <span>* {isModalCreatingSellingPoint ? "卖点" : "分类名称"}</span>
            {isModalCreatingSellingPoint ? (
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 6 }}
                onChange={(event) => setModalName(event.target.value)}
                placeholder="请输入"
                value={modalName}
              />
            ) : (
              <Input
                onChange={(event) => setModalName(event.target.value)}
                placeholder="请输入"
                value={modalName}
              />
            )}
          </label>
          {!isModalCreatingSellingPoint ? (
            <label>
              <span>描述（可选）</span>
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 6 }}
                onChange={(event) => setModalDescription(event.target.value)}
                placeholder="请输入"
                value={modalDescription}
              />
            </label>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
