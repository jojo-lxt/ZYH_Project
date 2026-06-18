const mockImages = [
  {
    id: "mock-1",
    url: "/assets/mock-draft-1.jpeg",
  },
  {
    id: "mock-2",
    url: "/assets/mock-draft-2.jpeg",
  },
];

function getMockDraft() {
  return {
    id: "preview",
    caption:
      "这是一份小程序本地预览内容。正式打开时会从中间页传入草稿参数，展示真实图片、文案和话题。",
    images: mockImages,
    selectedImages: mockImages,
    tags: ["小红书发布", "内容预览", "探店素材"],
    topics: ["小红书小程序", "图文发布"],
  };
}

module.exports = {
  getMockDraft,
};
