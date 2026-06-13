const {
  getPlatform,
  setClipboardData,
  showModal,
  showToast,
} = require("./platform");

function buildPublishPayload(draft) {
  return {
    caption: draft.caption,
    images: draft.selectedImages.map((image) => image.absoluteUrl),
    tags: draft.tags,
    title: draft.tags[0] ? `${draft.tags[0]}推荐` : "推荐笔记",
    topics: draft.topics,
  };
}

async function fallbackPublish(draft) {
  await setClipboardData(draft.caption);

  showModal({
    content: "文案已复制。当前小程序发布 API 尚未接入，请接入小红书开放平台发布能力后替换 utils/xhsPublish.js。",
    showCancel: false,
    title: "发布能力待接入",
  });
}

async function openXhsDraftPublisher(draft) {
  const platform = getPlatform();
  const payload = buildPublishPayload(draft);

  if (platform?.openXhsPublish) {
    return platform.openXhsPublish(payload);
  }

  if (platform?.openNotePublish) {
    return platform.openNotePublish(payload);
  }

  if (platform?.publishNote) {
    return platform.publishNote(payload);
  }

  await fallbackPublish(draft);
  showToast("已复制文案");
}

module.exports = {
  openXhsDraftPublisher,
};
