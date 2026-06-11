import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  ConsoleConfigResponse,
  ConsoleMaterialsResponse,
  ConsoleOverviewResponse,
  ConsolePropertiesResponse,
  ConsolePropertyDetailResponse,
  ConsoleStrategyResponse,
  ConsoleUsersResponse,
  MaterialUploadResponse,
} from "@/shared/mock/consoleData";

export const consoleApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "/api/console" }),
  endpoints: (builder) => ({
    getMaterials: builder.query<ConsoleMaterialsResponse, void>({
      query: () => "/materials",
    }),
    getMaterialUploadOptions: builder.query<MaterialUploadResponse, void>({
      query: () => "/materials/upload-options",
    }),
    getOverview: builder.query<ConsoleOverviewResponse, void>({
      query: () => "/overview",
    }),
    getProperties: builder.query<ConsolePropertiesResponse, void>({
      query: () => "/properties",
    }),
    getPropertyDetail: builder.query<ConsolePropertyDetailResponse, string | void>({
      query: (id = "1") => `/properties/${id}`,
    }),
    getSellingPointConfig: builder.query<ConsoleConfigResponse, void>({
      query: () => "/config/selling-points",
    }),
    getStrategy: builder.query<ConsoleStrategyResponse, void>({
      query: () => "/strategy",
    }),
    getTagConfig: builder.query<ConsoleConfigResponse, void>({
      query: () => "/config/tags",
    }),
    getUsers: builder.query<ConsoleUsersResponse, void>({
      query: () => "/users",
    }),
  }),
  reducerPath: "consoleApi",
});

export const {
  useGetMaterialUploadOptionsQuery,
  useGetMaterialsQuery,
  useGetOverviewQuery,
  useGetPropertiesQuery,
  useGetPropertyDetailQuery,
  useGetSellingPointConfigQuery,
  useGetStrategyQuery,
  useGetTagConfigQuery,
  useGetUsersQuery,
} = consoleApi;
