const { API_BASE_URL } = require("../../utils/config");
const {
  request,
  setClipboardData,
  showToast,
} = require("../../utils/platform");
const { getMockDraft } = require("../../utils/mockDraft");
const { openXhsDraftPublisher } = require("../../utils/xhsPublish");

function trimSlash(value) {
  return value.replace(/\/+$/, "");
}

function normalizeUrl(url, baseUrl) {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (!baseUrl || url.startsWith("/assets/")) {
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

function withDisplayImageUrls(draft, apiBaseUrl = "") {
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
      this.showDraft(getMockDraft());
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
      this.showDraft(payload.draft, apiBaseUrl);
    } catch (error) {
      this.setData({
        error: error.message || "加载草稿失败",
        loading: false,
      });
    }
  },

  showDraft(rawDraft, apiBaseUrl = "") {
    const draft = withDisplayImageUrls(rawDraft, apiBaseUrl);

    this.setData({
      currentImage: draft.selectedImages[0] || null,
      currentImageIndex: 0,
      draft,
      error: "",
      loading: false,
    });
  },

  selectImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const currentImage =
      this.data.draft && this.data.draft.selectedImages[index];

    if (!currentImage) {
      return;
    }

    this.setData({
      currentImage,
      currentImageIndex: index,
    });
  },

  async copyCaption() {
    if (!this.data.draft || !this.data.draft.caption) {
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
