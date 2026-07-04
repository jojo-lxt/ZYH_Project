import * as consoleRepository from "@/server/console/consoleRepository";

export async function getConsoleOverview() {
  return consoleRepository.getOverview();
}

export async function getConsoleStrategy() {
  return consoleRepository.getStrategy();
}

export async function getConsoleMaterials() {
  return consoleRepository.getMaterials();
}

export async function getMaterialUploadOptions() {
  return consoleRepository.getMaterialUploadOptions();
}

export async function createMaterialUpload(formData: FormData) {
  return consoleRepository.createMaterialUpload(formData);
}

export async function getConsoleTagConfig() {
  return consoleRepository.getTagConfig();
}

export async function getConsoleSellingPointConfig() {
  return consoleRepository.getSellingPointConfig();
}

export async function getConsoleProperties() {
  return consoleRepository.getProperties();
}

export async function getConsolePropertyDetail(id: string) {
  return consoleRepository.getPropertyDetail(id);
}

export async function getConsoleUsers() {
  return consoleRepository.getUsers();
}
