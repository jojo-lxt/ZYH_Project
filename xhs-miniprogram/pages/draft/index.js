const { API_BASE_URL } = require("../../utils/config");
const {
  request,
  setClipboardData,
  showToast,
} = require("../../utils/platform");
const { openXhsDraftPublisher } = require("../../utils/xhsPublish");

function trimSlash(value) {
  return value.replace(/\/+$/, "");
}

function normalizeUrl(url, baseUrl) {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${trimSlash(baseUrl)}${url}`;
}

function getDraftApiUrl(options) {
  if (options.apiUrl) {
    return decodeURIComponent(options.apiUrl);
  }

  const draftId = options.draftId || options.id;

  if (!draftId) {
    return "";
  }

  return `${trimSlash(API_BASE_URL)}/api/drafts/${draftId}`;
}

Page({
  data: {
    draft: null,
    error: "",
    loading: true,
    publishing: false,
  },

  onLoad(options) {
    this.loadDraft(options);
  },

  async loadDraft(options) {
    const apiUrl = getDraftApiUrl(options);

    if (!apiUrl) {
      this.setData({
        error: "缺少草稿参数",
        loading: false,
      });
      return;
    }

    try {
      const response = await request({
        method: "GET",
        url: apiUrl,
      });
      const payload = response.data || {};

      if (!payload.draft) {
        throw new Error(payload.error || "草稿不存在");
      }

      const apiBaseUrl = apiUrl.replace(/\/api\/drafts\/[^/]+$/, "");
      const draft = {
        ...payload.draft,
        images: payload.draft.images.map((image) => ({
          ...image,
          absoluteUrl: normalizeUrl(image.url, apiBaseUrl),
        })),
        selectedImages: payload.draft.selectedImages.map((image) => ({
          ...image,
          absoluteUrl: normalizeUrl(image.url, apiBaseUrl),
        })),
      };

      this.setData({
        draft,
        loading: false,
      });
    } catch (error) {
      this.setData({
        error: error.message || "加载草稿失败",
        loading: false,
      });
    }
  },

  async copyCaption() {
    if (!this.data.draft?.caption) {
      return;
    }

    await setClipboardData(this.data.draft.caption);
    showToast("文案已复制", "success");
  },

  async openPublisher() {
    if (!this.data.draft) {
      return;
    }

    this.setData({ publishing: true });

    try {
      await openXhsDraftPublisher(this.data.draft);
    } catch (error) {
      showToast(error.message || "打开发布页失败");
    } finally {
      this.setData({ publishing: false });
    }
  },
});
