// 内置示例内容:用小程序自带的几张图片 + 一段固定「展示文案」。
// 供无参数冷启动(如平台审核从主入口直接打开、并非扫码进入)时展示一个可用页面,
// 全程不发起任何网络请求,避免落到「缺少项目参数」错误页导致审核不通过。
const demoImages = [
  "/assets/mock-draft-1.jpeg",
  "/assets/mock-draft-2.jpeg",
  "/assets/mock-draft-3.jpeg",
  "/assets/mock-draft-4.jpeg",
  "/assets/mock-draft-5.jpeg",
].map((url, index) => ({
  id: `demo-${index + 1}`,
  url,
  // 本地图片直接用相对路径渲染,absoluteUrl 与 url 相同(模板统一读 absoluteUrl)。
  absoluteUrl: url,
}));

const DEMO_CAPTION =
  "【示例展示】这里是小程序的内容展示示例,图片与文案均为演示用途,并非真实内容。\n\n" +
  "扫描具体项目的二维码进入后,会展示该项目的真实图片与 AI 生成文案,并可保存图片、复制文案前往小红书发布。";

const DEMO_TAGS = ["示例展示", "内容预览"];

// 结构对齐 index.js 里 toDraft 的产物,模板/复制/发布逻辑无需区分来源。
function getDemoDraft() {
  return {
    body: DEMO_CAPTION,
    caption: DEMO_CAPTION,
    images: demoImages,
    materialIds: demoImages.map((image) => image.id),
    projectName: "示例内容",
    selectedImages: demoImages,
    tags: DEMO_TAGS,
    title: "",
    topics: DEMO_TAGS,
  };
}

module.exports = {
  getDemoDraft,
};
