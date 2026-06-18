import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  mockMaterialsData,
  mockPropertiesData,
  mockSellingPointConfigData,
  mockTagConfigData,
  mockUsersData,
  type ConfigTreeItem,
  type MaterialItem,
  type PropertyRow,
  type UserRow,
} from "@/shared/mock/consoleData";
import type { RootState } from "@/store/store";

export type ConfigKind = "selling" | "tag";
export type MaterialTagKind = "attribute" | "selling";

export type MaterialTagOverride = {
  attributeTags?: string[];
  sellingTags?: string[];
};

type ConsoleState = {
  currentProject: string;
  currentUser: {
    name: string;
    role: string;
  };
  materialTagOverrides: Record<number, MaterialTagOverride>;
  materials: MaterialItem[];
  properties: PropertyRow[];
  sellingConfigTree: ConfigTreeItem[];
  tagConfigTree: ConfigTreeItem[];
  users: UserRow[];
};

function cloneConfigTree(items: ConfigTreeItem[]): ConfigTreeItem[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? cloneConfigTree(item.children) : undefined,
  }));
}

function updateConfigTreeItem(
  items: ConfigTreeItem[],
  id: string,
  patch: Partial<ConfigTreeItem>,
): ConfigTreeItem[] {
  return items.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...patch,
        count: patch.children ? patch.children.length : item.count,
      };
    }

    if (item.children) {
      return {
        ...item,
        children: updateConfigTreeItem(item.children, id, patch),
      };
    }

    return item;
  });
}

function addConfigTreeItem(
  items: ConfigTreeItem[],
  parentId: string | null,
  item: ConfigTreeItem,
): ConfigTreeItem[] {
  if (!parentId) {
    return [...items, item];
  }

  return items.map((current) => {
    if (current.id === parentId) {
      const children = [...(current.children ?? []), item];

      return {
        ...current,
        children,
        count: children.length,
      };
    }

    if (current.children) {
      return {
        ...current,
        children: addConfigTreeItem(current.children, parentId, item),
      };
    }

    return current;
  });
}

function deleteConfigTreeItem(items: ConfigTreeItem[], id: string): ConfigTreeItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => {
      if (!item.children) {
        return item;
      }

      const children = deleteConfigTreeItem(item.children, id);

      return {
        ...item,
        children,
        count: children.length,
      };
    });
}

function getConfigTree(state: ConsoleState, kind: ConfigKind) {
  return kind === "selling" ? state.sellingConfigTree : state.tagConfigTree;
}

function setConfigTree(state: ConsoleState, kind: ConfigKind, tree: ConfigTreeItem[]) {
  if (kind === "selling") {
    state.sellingConfigTree = tree;
  } else {
    state.tagConfigTree = tree;
  }
}

function formatMaterialUpdatedAt() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const initialState: ConsoleState = {
  currentProject: "张江金茂府",
  currentUser: {
    name: "刘阳",
    role: "管理员",
  },
  materialTagOverrides: {},
  materials: mockMaterialsData.materials,
  properties: mockPropertiesData.properties,
  sellingConfigTree: cloneConfigTree(mockSellingPointConfigData.tree),
  tagConfigTree: cloneConfigTree(mockTagConfigData.tree),
  users: mockUsersData.users,
};

const consoleSlice = createSlice({
  initialState,
  name: "console",
  reducers: {
    addConfigItem: (
      state,
      action: PayloadAction<{
        item: ConfigTreeItem;
        kind: ConfigKind;
        parentId: string | null;
      }>,
    ) => {
      const tree = getConfigTree(state, action.payload.kind);

      setConfigTree(
        state,
        action.payload.kind,
        addConfigTreeItem(tree, action.payload.parentId, action.payload.item),
      );
    },
    deleteConfigItem: (
      state,
      action: PayloadAction<{
        id: string;
        kind: ConfigKind;
      }>,
    ) => {
      const tree = getConfigTree(state, action.payload.kind);

      setConfigTree(
        state,
        action.payload.kind,
        deleteConfigTreeItem(tree, action.payload.id),
      );
    },
    deleteMaterials: (state, action: PayloadAction<number[]>) => {
      state.materials = state.materials.filter((item) => !action.payload.includes(item.id));

      action.payload.forEach((id) => {
        delete state.materialTagOverrides[id];
      });
    },
    deleteProperty: (state, action: PayloadAction<string>) => {
      state.properties = state.properties.filter((property) => property.key !== action.payload);
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter((user) => user.key !== action.payload);
    },
    resetMaterials: (state) => {
      state.materials = mockMaterialsData.materials;
      state.materialTagOverrides = {};
    },
    resetProperties: (state) => {
      state.properties = mockPropertiesData.properties;
    },
    resetUsers: (state) => {
      state.users = mockUsersData.users;
    },
    reverseProperties: (state) => {
      state.properties = [...state.properties].reverse();
    },
    reverseUsers: (state) => {
      state.users = [...state.users].reverse();
    },
    setCurrentProject: (state, action: PayloadAction<string>) => {
      state.currentProject = action.payload;
    },
    setMaterialTags: (
      state,
      action: PayloadAction<{
        id: number;
        kind: MaterialTagKind;
        tags: string[];
      }>,
    ) => {
      const current = state.materialTagOverrides[action.payload.id] ?? {};
      const key = action.payload.kind === "selling" ? "sellingTags" : "attributeTags";

      state.materialTagOverrides[action.payload.id] = {
        ...current,
        [key]: action.payload.tags,
      };
    },
    updateConfigItem: (
      state,
      action: PayloadAction<{
        id: string;
        kind: ConfigKind;
        patch: Partial<ConfigTreeItem>;
      }>,
    ) => {
      const tree = getConfigTree(state, action.payload.kind);

      setConfigTree(
        state,
        action.payload.kind,
        updateConfigTreeItem(tree, action.payload.id, action.payload.patch),
      );
    },
    updateMaterialTypeConfig: (
      state,
      action: PayloadAction<{
        category: string;
        id: number;
        platforms: string[];
        stage: string;
      }>,
    ) => {
      state.materials = state.materials.map((material) =>
        material.id === action.payload.id
          ? {
            ...material,
            category: action.payload.category,
            platforms: action.payload.platforms,
            stage: action.payload.stage,
            updatedAt: formatMaterialUpdatedAt(),
          }
          : material,
      );
    },
    upsertProperty: (state, action: PayloadAction<PropertyRow>) => {
      const index = state.properties.findIndex((property) => property.key === action.payload.key);

      if (index >= 0) {
        state.properties[index] = action.payload;
      } else {
        state.properties = [action.payload, ...state.properties];
      }
    },
    upsertUser: (state, action: PayloadAction<UserRow>) => {
      const index = state.users.findIndex((user) => user.key === action.payload.key);

      if (index >= 0) {
        state.users[index] = action.payload;
      } else {
        state.users = [action.payload, ...state.users];
      }
    },
  },
});

export const {
  addConfigItem,
  deleteConfigItem,
  deleteMaterials,
  deleteProperty,
  deleteUser,
  resetMaterials,
  resetProperties,
  resetUsers,
  reverseProperties,
  reverseUsers,
  setCurrentProject,
  setMaterialTags,
  updateConfigItem,
  updateMaterialTypeConfig,
  upsertProperty,
  upsertUser,
} = consoleSlice.actions;

export const selectConsoleCurrentProject = (state: RootState) => state.console.currentProject;
export const selectConsoleCurrentUser = (state: RootState) => state.console.currentUser;
export const selectMaterialTagOverrides = (state: RootState) => state.console.materialTagOverrides;
export const selectMaterials = (state: RootState) => state.console.materials;
export const selectProperties = (state: RootState) => state.console.properties;
export const selectSellingConfigTree = (state: RootState) => state.console.sellingConfigTree;
export const selectTagConfigTree = (state: RootState) => state.console.tagConfigTree;
export const selectUsers = (state: RootState) => state.console.users;

export default consoleSlice.reducer;
