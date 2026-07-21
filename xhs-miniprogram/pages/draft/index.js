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

  if (!baseUrl || url.startsWith("/assets/")) {
    return url;
  }

  return `${trimSlash(baseUrl)}${url}`;
}

// 中间页跳转时会带上 projectId + channel + apiUrl(= /api/public/projects/<id>/preview?channel=<身份>)。
function getPreviewContext(options) {
  const projectId = options.projectId || options.id || "";
  // 渠道身份(游客/用户/中介):优先用中间页传来的完整 apiUrl(已带 ?channel=),
  // 没有 apiUrl 时用 channel 自己拼,再退到 visitor。
  const channel = options.channel || "visitor";
  const apiUrl = options.apiUrl
    ? decodeURIComponent(options.apiUrl)
    : projectId
      ? `${trimSlash(API_BASE_URL)}/api/public/projects/${projectId}/preview?channel=${channel}`
      : "";
  // 从预览地址推出接口根域名(用于拼图片绝对地址 + 发布接口)。
  const apiBaseUrl = apiUrl.replace(/\/api\/public\/projects\/.*/, "");

  return { apiBaseUrl, apiUrl, projectId };
}

// 把「随机图 + AI 文案」预览响应适配成模板用的 draft 结构。
function toDraft(payload, apiBaseUrl) {
  const caption = payload.caption || {};
  const images = (payload.images || []).map((image) => ({
    ...image,
    absoluteUrl: normalizeUrl(image.url, apiBaseUrl),
  }));
  const title = caption.title || "";
  const body = caption.body || "";
  const topics = Array.isArray(caption.topics) ? caption.topics : [];

  return {
    body,
    caption: [title, body].filter(Boolean).join("\n\n"),
    images,
    materialIds: images.map((image) => image.id),
    projectName: payload.projectName || "",
    selectedImages: images,
    tags: topics,
    title,
    topics,
  };
}

Page({
  data: {
    apiBaseUrl: "",
    apiUrl: "",
    currentImage: null,
    currentImageIndex: 0,
    draft: null,
    error: "",
    loading: true,
    projectId: "",
    publishing: false,
    refreshing: false,
  },

  onLoad(options) {
    const context = getPreviewContext(options);

    this.setData({
      apiBaseUrl: context.apiBaseUrl,
      apiUrl: context.apiUrl,
      projectId: context.projectId,
    });
    this.loadPreview();
  },

  async loadPreview(isRefresh) {
    if (!this.data.apiUrl) {
      this.setData({ error: "缺少项目参数", loading: false });
      return;
    }

    this.setData(isRefresh ? { refreshing: true } : { loading: true });

    try {
      const response = await request({
        method: "GET",
        url: this.data.apiUrl,
      });
      const payload = response.data || {};

      if (!payload.images) {
        throw new Error(payload.error || "项目不存在");
      }

      this.showDraft(toDraft(payload, this.data.apiBaseUrl));
    } catch (error) {
      this.setData({
        error: error.message || "加载失败",
        loading: false,
        refreshing: false,
      });
    }
  },

  showDraft(draft) {
    this.setData({
      currentImage: draft.selectedImages[0] || null,
      currentImageIndex: 0,
      draft,
      error: "",
      loading: false,
      refreshing: false,
    });
  },

  // 换一批:重新拉预览,后端随机取新的一组图 + 生成新文案。
  refreshPreview() {
    if (this.data.refreshing || this.data.loading) {
      return;
    }

    this.loadPreview(true);
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
    const draft = this.data.draft;

    if (!draft) {
      return;
    }

    this.setData({ publishing: true });

    try {
      // 先把这一组存成发布记录(只存 material_ids 引用 + 文案),再打开小红书发布页。
      if (this.data.apiBaseUrl && this.data.projectId) {
        await request({
          data: {
            body: draft.body,
            channel: "xhs",
            materialIds: draft.materialIds,
            publisher: "",
            title: draft.title,
            topics: draft.topics,
          },
          method: "POST",
          url: `${trimSlash(this.data.apiBaseUrl)}/api/public/projects/${this.data.projectId}/publish`,
        });
      }

      await openXhsDraftPublisher(draft);
    } catch (error) {
      showToast(error.message || "打开发布页失败");
    } finally {
      this.setData({ publishing: false });
    }
  },
});
