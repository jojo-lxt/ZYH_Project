import {
  mockMaterialsData,
  mockMaterialUploadData,
  mockOverviewData,
  mockPropertiesData,
  mockPropertyDetailData,
  mockSellingPointConfigData,
  mockStrategyData,
  mockTagConfigData,
  mockUsersData,
} from "@/shared/mock/consoleData";

export function getConsoleOverview() {
  return mockOverviewData;
}

export function getConsoleStrategy() {
  return mockStrategyData;
}

export function getConsoleMaterials() {
  return mockMaterialsData;
}

export function getMaterialUploadOptions() {
  return mockMaterialUploadData;
}

export async function createMockMaterialUpload(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  return {
    files: files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      status: "uploaded",
      type: file.type || "application/octet-stream",
    })),
    total: files.length,
  };
}

export function getConsoleTagConfig() {
  return mockTagConfigData;
}

export function getConsoleSellingPointConfig() {
  return mockSellingPointConfigData;
}

export function getConsoleProperties() {
  return mockPropertiesData;
}

export function getConsolePropertyDetail() {
  return mockPropertyDetailData;
}

export function getConsoleUsers() {
  return mockUsersData;
}
