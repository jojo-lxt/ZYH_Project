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
    // 图片已就位、AI 文案还在生成中:文案卡片显示「生成中」占位,复制/发布按钮先禁用。
    captionLoading: false,
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

    // 每次加载递增序号:图片/文案是两个异步请求,靠它丢弃「换一批」时上一批的过期响应,
    // 避免慢到的旧文案覆盖到新的一批上。
    const seq = (this.loadSeq = (this.loadSeq || 0) + 1);
    this.setData(isRefresh ? { refreshing: true } : { loading: true });

    try {
      const response = await request({
        method: "GET",
        url: this.data.apiUrl,
      });

      if (seq !== this.loadSeq) {
        return;
      }

      const payload = response.data || {};

      if (!payload.images) {
        throw new Error(payload.error || "项目不存在");
      }

      // 图片先显示,文案单独异步拉,不阻塞图片。
      this.showDraft(toDraft(payload, this.data.apiBaseUrl));
      this.loadCaption(seq);
    } catch (error) {
      if (seq !== this.loadSeq) {
        return;
      }

      this.setData({
        captionLoading: false,
        error: error.message || "加载失败",
        loading: false,
        refreshing: false,
      });
    }
  },

  // 图片就绪后单独拉 AI 文案。慢的部分只影响文案卡片,不影响图片浏览。
  async loadCaption(seq) {
    const captionUrl = this.data.apiUrl.replace(/\/preview(\?|$)/, "/caption$1");

    try {
      const response = await request({ method: "GET", url: captionUrl });

      if (seq !== this.loadSeq) {
        return;
      }

      const caption = (response.data && response.data.caption) || {};
      const title = caption.title || "";
      const body = caption.body || "";
      const topics = Array.isArray(caption.topics) ? caption.topics : [];
      const draft = this.data.draft;

      if (!draft) {
        return;
      }

      this.setData({
        captionLoading: false,
        draft: {
          ...draft,
          body,
          caption: [title, body].filter(Boolean).join("\n\n"),
          tags: topics,
          title,
          topics,
        },
      });
    } catch (error) {
      if (seq !== this.loadSeq) {
        return;
      }

      this.setData({ captionLoading: false });
      showToast("文案生成失败,可点换一批重试");
    }
  },

  showDraft(draft) {
    this.setData({
      // 文案随后异步补齐,先进入「生成中」态。
      captionLoading: true,
      currentImage: draft.selectedImages[0] || null,
      currentImageIndex: 0,
      draft,
      error: "",
      loading: false,
      refreshing: false,
    });
  },

  // 换一批:重新拉一组随机图 + 新文案。序号机制保证上一批的慢文案不会串台。
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
    if (this.data.captionLoading || !this.data.draft || !this.data.draft.caption) {
      return;
    }

    await setClipboardData(this.data.draft.caption);
    showToast("文案已复制", "success");
  },

  async openPublisher() {
    const draft = this.data.draft;

    // 文案还没生成完就不放行,避免把空文案带进发布记录。
    if (!draft || this.data.captionLoading) {
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
