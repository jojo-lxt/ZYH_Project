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

function withAbsoluteImageUrls(draft, apiBaseUrl) {
  const addAbsoluteUrl = (image) => ({
    ...image,
    absoluteUrl: normalizeUrl(image.url, apiBaseUrl),
  });

  return {
    ...draft,
    images: draft.images.map(addAbsoluteUrl),
    selectedImages: draft.selectedImages.map(addAbsoluteUrl),
  };
}

Page({
  data: {
    currentImage: null,
    currentImageIndex: 0,
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
      const draft = withAbsoluteImageUrls(payload.draft, apiBaseUrl);

      this.setData({
        currentImage: draft.selectedImages[0] || null,
        currentImageIndex: 0,
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

  selectImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const currentImage = this.data.draft?.selectedImages[index];

    if (!currentImage) {
      return;
    }

    this.setData({
      currentImage,
      currentImageIndex: index,
    });
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
