"use client";

import { useMemo, useState } from "react";
import { CloseOutlined, DeleteOutlined, DownOutlined, PlusOutlined, RightOutlined, TableOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, Input, Modal, Space } from "antd";
import { useGetSellingPointConfigQuery, useGetTagConfigQuery } from "@/store/consoleApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addConfigItem as addConfigItemAction,
  deleteConfigItem as deleteConfigItemAction,
  selectSellingConfigTree,
  selectTagConfigTree,
  updateConfigItem as updateConfigItemAction,
  type ConfigKind,
} from "@/store/consoleSlice";
import { mockSellingPointConfigData, mockTagConfigData, type ConfigTreeItem } from "@/shared/mock/consoleData";

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
  const dispatch = useAppDispatch();
  const isSellingPoint = title.includes("卖点");
  const fallback = isSellingPoint ? mockSellingPointConfigData : mockTagConfigData;
  const initialSelectedId = isSellingPoint ? "" : fallback.tree[0]?.id ?? "";
  const initialSelected = initialSelectedId ? findConfigItem(fallback.tree, initialSelectedId) : null;
  const configKind: ConfigKind = isSellingPoint ? "selling" : "tag";
  const { data: tagApiData = mockTagConfigData } = useGetTagConfigQuery();
  const { data: sellingApiData = mockSellingPointConfigData } = useGetSellingPointConfigQuery();
  const apiData = isSellingPoint ? sellingApiData : tagApiData;
  const tree = useAppSelector((state) =>
    isSellingPoint ? selectSellingConfigTree(state) : selectTagConfigTree(state),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(isSellingPoint ? [] : [fallback.tree[0]?.id ?? ""]),
  );
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [draftName, setDraftName] = useState(initialSelected?.name ?? "");
  const [draftDescription, setDraftDescription] = useState(initialSelected?.description ?? "");
  const [draftModes, setDraftModes] = useState<string[]>(
    () => initialSelected?.modes ?? ["晒单式", "盘点式"],
  );
  const selected = selectedId ? findConfigItem(tree, selectedId) : null;
  const selectedParent = selectedId ? getParentForConfigItem(tree, selectedId) : null;
  const isChildSelected = Boolean(
    selectedParent?.children?.some((child) => child.id === selectedId),
  );
  const stats = useMemo(
    () => [
      { label: "一级分类", value: tree.length },
      { label: "二级分类", value: countConfigChildren(tree) },
      { label: "总标签数", value: tree.length + countConfigChildren(tree) },
    ],
    [tree],
  );

  function toggleExpanded(id: string) {
    const next = new Set(expandedIds);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setExpandedIds(next);
  }

  function syncConfigDraft(item: ConfigTreeItem | null) {
    setDraftName(item?.name ?? "");
    setDraftDescription(item?.description ?? "");
    setDraftModes(item?.modes ?? ["晒单式", "盘点式"]);
  }

  function selectConfigItem(id: string) {
    const item = findConfigItem(tree, id);

    setSelectedId(id);
    syncConfigDraft(item);
  }

  function openCreateModal(parentId: string | null) {
    setModalParentId(parentId);
    setModalName("");
    setModalDescription("");
    setIsModalOpen(true);
  }

  function handleCreateItem() {
    const name = modalName.trim();

    if (!name) {
      message.warning(isSellingPoint ? "请输入卖点" : "请输入标签名称");
      return;
    }

    const id = `${isSellingPoint ? "sell" : "attr"}-${Date.now()}`;
    const nextItem: ConfigTreeItem = {
      description: modalDescription.trim() || undefined,
      id,
      modes: isSellingPoint ? ["种草式"] : undefined,
      name,
    };

    dispatch(addConfigItemAction({
      item: nextItem,
      kind: configKind,
      parentId: modalParentId,
    }));
    setExpandedIds((current) => {
      const next = new Set(current);
      if (modalParentId) {
        next.add(modalParentId);
      }
      return next;
    });
    setSelectedId(id);
    syncConfigDraft(nextItem);
    setIsModalOpen(false);
    message.success("新增项已保存");
  }

  function handleDeleteItem(id: string) {
    if (!id) {
      return;
    }

    const next = deleteConfigItem(tree, id);
    const nextId = getFirstConfigId(next);

    dispatch(deleteConfigItemAction({ id, kind: configKind }));
    setSelectedId(nextId);
    syncConfigDraft(nextId ? findConfigItem(next, nextId) : null);
    message.success("已删除");
  }

  function handleSave() {
    if (!selected) {
      return;
    }

    if (!draftName.trim()) {
      message.warning(isSellingPoint ? "请输入卖点" : "请输入分类名称");
      return;
    }

    dispatch(
      updateConfigItemAction({
        id: selected.id,
        kind: configKind,
        patch: {
          description: draftDescription.trim() || undefined,
          modes: isSellingPoint ? draftModes : undefined,
          name: draftName.trim(),
        },
      }),
    );
    message.success("已保存当前配置");
  }

  return (
    <section className="console-page taxonomy-page">
      <div className="taxonomy-header">
        <h2>分类总览</h2>
        <Space>
          <Button onClick={() => message.info("已模拟导入标签")}>导入标签</Button>
          <Button onClick={() => message.success("已导出当前标签")}>导出标签</Button>
          <Button onClick={() => message.success("模板已准备下载")}>下载模板</Button>
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
            const isActive = selectedId === item.id;

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
                          selectedId === child.id
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
                      ? "编辑二级分类"
                      : isChildSelected
                        ? "编辑二级分类"
                        : "编辑一级分类"}
                  </h2>
                  <p>点击左侧标签进行编辑，或添加新标签</p>
                </div>
                <Button danger={isSellingPoint} onClick={() => handleDeleteItem(selected.id)} type="primary">
                  {isSellingPoint ? "删除卖点" : "删除分类"}
                </Button>
              </div>

              {isSellingPoint ? (
                <>
                  <label className="taxonomy-field">
                    <span>卖点</span>
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 6 }}
                      onChange={(event) => setDraftName(event.target.value)}
                      value={draftName}
                    />
                  </label>
                  <div className="taxonomy-field">
                    <span>模式</span>
                    <Checkbox.Group
                      onChange={(values) => setDraftModes(values.map(String))}
                      options={apiData.modeOptions ?? []}
                      value={draftModes}
                    />
                  </div>
                </>
              ) : (
                <>
                  <label className="taxonomy-field">
                    <span>分类名称 *</span>
                    <Input
                      onChange={(event) => setDraftName(event.target.value)}
                      value={draftName}
                    />
                  </label>
                  <label className="taxonomy-field">
                    <span>描述（可选）</span>
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 6 }}
                      onChange={(event) => setDraftDescription(event.target.value)}
                      value={draftDescription}
                    />
                  </label>
                  {!isChildSelected ? (
                    <div className="taxonomy-field">
                      <span>子标签管理</span>
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
                          添加子标签
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
            <span>* {isSellingPoint ? "卖点" : "标签名称"}</span>
            {isSellingPoint ? (
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
          {!isSellingPoint ? (
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

