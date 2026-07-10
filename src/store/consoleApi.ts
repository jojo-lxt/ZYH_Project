import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { selectConsoleCurrentProject } from "@/store/consoleSlice";
import type { RootState } from "@/store/store";
import type {
  ConsoleConfigResponse,
  ConsoleOverviewQuery,
  ConsoleOverviewResponse,
  ConsolePropertiesResponse,
  ConsolePropertyDetailResponse,
  ConsoleStrategyQuery,
  ConsoleStrategyResponse,
  ConsoleUsersResponse,
  MaterialItem,
  MaterialUploadResponse,
  PropertyRow,
  UserRow,
} from "@/shared/types/console";

type ConfigKind = "selling" | "tag";

function configBasePath(kind: ConfigKind) {
  return kind === "selling" ? "/config/selling-points" : "/config/tags";
}

function toSearchParams(params?: ConsoleOverviewQuery | ConsoleStrategyQuery | void) {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

export const consoleApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/console",
    // 把当前选中的项目 id 通过 X-Project-Id 头带给后端,用于按项目隔离数据。
    prepareHeaders: (headers, { getState }) => {
      const projectId = selectConsoleCurrentProject(getState() as RootState);
      if (projectId) {
        headers.set("X-Project-Id", projectId);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    createConfigItem: builder.mutation<
      { id: string },
      {
        description?: string;
        kind: ConfigKind;
        modes?: string[];
        name: string;
        parentId: string | null;
      }
    >({
      invalidatesTags: (_result, _error, arg) => [
        arg.kind === "selling" ? "SellingConfig" : "TagConfig",
        "UploadOptions",
      ],
      query: ({ kind, ...body }) => ({
        body,
        method: "POST",
        url: configBasePath(kind),
      }),
    }),
    createProperty: builder.mutation<{ property: PropertyRow }, Omit<PropertyRow, "createdAt" | "key">>({
      invalidatesTags: ["Properties"],
      query: (body) => ({
        body,
        method: "POST",
        url: "/properties",
      }),
    }),
    createUser: builder.mutation<
      { user: UserRow },
      {
        name: string;
        password: string;
        phone: string;
        property: string;
        role: string;
      }
    >({
      invalidatesTags: ["Users"],
      query: (body) => ({
        body,
        method: "POST",
        url: "/users",
      }),
    }),
    deleteConfigItem: builder.mutation<{ deleted: number }, { id: string; kind: ConfigKind }>({
      invalidatesTags: (_result, _error, arg) => [
        arg.kind === "selling" ? "SellingConfig" : "TagConfig",
        "UploadOptions",
      ],
      query: ({ id, kind }) => ({
        method: "DELETE",
        url: `${configBasePath(kind)}/${encodeURIComponent(id)}`,
      }),
    }),
    deleteMaterials: builder.mutation<{ deleted: number }, number[]>({
      invalidatesTags: ["Materials"],
      query: (ids) => ({
        body: { ids },
        method: "DELETE",
        url: "/materials",
      }),
    }),
    deleteProperty: builder.mutation<{ deleted: number }, string>({
      invalidatesTags: ["Properties"],
      query: (id) => ({
        method: "DELETE",
        url: `/properties/${encodeURIComponent(id)}`,
      }),
    }),
    deleteUser: builder.mutation<{ deleted: number }, string>({
      invalidatesTags: ["Users"],
      query: (id) => ({
        method: "DELETE",
        url: `/users/${encodeURIComponent(id)}`,
      }),
    }),
    getMaterialUploadOptions: builder.query<MaterialUploadResponse, string>({
      providesTags: ["UploadOptions"],
      query: () => "/materials/upload-options",
    }),
    getMaterials: builder.query<{ filterGroups: string[]; materials: MaterialItem[]; total: number }, string>({
      providesTags: ["Materials"],
      query: () => "/materials",
    }),
    getOverview: builder.query<ConsoleOverviewResponse, ConsoleOverviewQuery & { projectId: string }>({
      providesTags: ["Overview"],
      query: (params) => `/overview${toSearchParams(params)}`,
    }),
    getProperties: builder.query<ConsolePropertiesResponse, void>({
      providesTags: ["Properties"],
      query: () => "/properties",
    }),
    getPropertyDetail: builder.query<ConsolePropertyDetailResponse, string>({
      providesTags: (_result, _error, id) => [{ id, type: "PropertyDetail" }],
      query: (id) => `/properties/${id}`,
    }),
    getSellingPointConfig: builder.query<ConsoleConfigResponse, string>({
      providesTags: ["SellingConfig"],
      query: () => "/config/selling-points",
    }),
    getStrategy: builder.query<ConsoleStrategyResponse, ConsoleStrategyQuery & { projectId: string }>({
      providesTags: ["Strategy"],
      query: (params) => `/strategy${toSearchParams(params)}`,
    }),
    getTagConfig: builder.query<ConsoleConfigResponse, string>({
      providesTags: ["TagConfig"],
      query: () => "/config/tags",
    }),
    getUsers: builder.query<ConsoleUsersResponse, void>({
      providesTags: ["Users"],
      query: () => "/users",
    }),
    updateConfigItem: builder.mutation<
      { ok: true },
      {
        description?: string;
        id: string;
        kind: ConfigKind;
        modes?: string[];
        name?: string;
      }
    >({
      invalidatesTags: (_result, _error, arg) => [
        arg.kind === "selling" ? "SellingConfig" : "TagConfig",
        "UploadOptions",
      ],
      query: ({ id, kind, ...body }) => ({
        body,
        method: "PATCH",
        url: `${configBasePath(kind)}/${encodeURIComponent(id)}`,
      }),
    }),
    updateMaterial: builder.mutation<
      { material: MaterialItem },
      {
        category?: string;
        id: number;
        platforms?: string[];
        stage?: string;
      }
    >({
      invalidatesTags: ["Materials"],
      query: ({ id, ...body }) => ({
        body,
        method: "PATCH",
        url: `/materials/${id}`,
      }),
    }),
    updateMaterialTags: builder.mutation<
      { ok: true },
      {
        id: number;
        kind: "attribute" | "selling";
        tags: string[];
      }
    >({
      invalidatesTags: ["Materials"],
      query: ({ id, ...body }) => ({
        body,
        method: "PUT",
        url: `/materials/${id}/tags`,
      }),
    }),
    updateProperty: builder.mutation<
      { property: PropertyRow },
      Partial<Omit<PropertyRow, "createdAt" | "key">> & { id: string }
    >({
      invalidatesTags: (_result, _error, arg) => ["Properties", { id: arg.id, type: "PropertyDetail" }],
      query: ({ id, ...body }) => ({
        body,
        method: "PATCH",
        url: `/properties/${encodeURIComponent(id)}`,
      }),
    }),
    updateUser: builder.mutation<
      { user: UserRow },
      Partial<Omit<UserRow, "createdAt" | "key">> & { id: string; password?: string }
    >({
      invalidatesTags: ["Users"],
      query: ({ id, ...body }) => ({
        body,
        method: "PATCH",
        url: `/users/${encodeURIComponent(id)}`,
      }),
    }),
  }),
  reducerPath: "consoleApi",
  tagTypes: [
    "Materials",
    "Overview",
    "Properties",
    "PropertyDetail",
    "SellingConfig",
    "Strategy",
    "TagConfig",
    "UploadOptions",
    "Users",
  ],
});

export const {
  useCreateConfigItemMutation,
  useCreatePropertyMutation,
  useCreateUserMutation,
  useDeleteConfigItemMutation,
  useDeleteMaterialsMutation,
  useDeletePropertyMutation,
  useDeleteUserMutation,
  useGetMaterialUploadOptionsQuery,
  useGetMaterialsQuery,
  useGetOverviewQuery,
  useGetPropertiesQuery,
  useGetPropertyDetailQuery,
  useGetSellingPointConfigQuery,
  useGetStrategyQuery,
  useGetTagConfigQuery,
  useGetUsersQuery,
  useUpdateConfigItemMutation,
  useUpdateMaterialMutation,
  useUpdateMaterialTagsMutation,
  useUpdatePropertyMutation,
  useUpdateUserMutation,
} = consoleApi;
