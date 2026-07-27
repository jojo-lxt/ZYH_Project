const { API_BASE_URL } = require("../../utils/config");
const {
  request,
  setClipboardData,
  showModal,
  showToast,
} = require("../../utils/platform");
const { buildPublishProps } = require("../../utils/xhsPublish");
const { getDemoDraft } = require("../../utils/mockDraft");

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
    // 无参数冷启动时用内置示例内容(不连后端),避免出现「缺少项目参数」错误页。
    demo: false,
    draft: null,
    error: "",
    loading: true,
    // <post-note-button> 组件入参(由 draft 派生,见 publishDataFrom):
    // media-info 必填的图片 JSON 串、话题、截断后的标题/正文。
    mediaInfo: "",
    projectId: "",
    publishContent: "",
    publishTags: "",
    publishTitle: "",
    refreshing: false,
  },

  onLoad(options) {
    const context = getPreviewContext(options);

    // 无参数冷启动(如平台审核直接从主入口打开、并非扫码进入):不依赖后端,
    // 展示内置示例内容,避免落到「缺少项目参数」错误页导致审核不通过。
    if (!context.apiUrl) {
      this.showDemo();
      return;
    }

    this.setData({
      apiBaseUrl: context.apiBaseUrl,
      apiUrl: context.apiUrl,
      projectId: context.projectId,
    });
    this.loadPreview();
  },

  // 本地示例:用内置图片 + 固定「展示文案」渲染一个可用页面,全程不发网络请求。
  showDemo() {
    const draft = getDemoDraft();

    this.setData({
      apiBaseUrl: "",
      apiUrl: "",
      captionLoading: false,
      currentImage: draft.selectedImages[0] || null,
      currentImageIndex: 0,
      demo: true,
      draft,
      error: "",
      loading: false,
      projectId: "",
      refreshing: false,
    });
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

      const nextDraft = {
        ...draft,
        body,
        caption: [title, body].filter(Boolean).join("\n\n"),
        tags: topics,
        title,
        topics,
      };

      this.setData({
        captionLoading: false,
        draft: nextDraft,
        // 文案回来后,把标题/正文/话题补进 <post-note-button> 入参。
        ...this.publishDataFrom(nextDraft),
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
      // 图片已就位,先算出 media-info;标题/正文待文案回来再补。
      ...this.publishDataFrom(draft),
    });
  },

  // 由 draft 派生 <post-note-button> 组件入参(标题/正文截断、图片转 media-info)。
  publishDataFrom(draft) {
    const props = buildPublishProps(draft);

    return {
      mediaInfo: props.mediaInfo,
      publishContent: props.content,
      publishTags: props.tags,
      publishTitle: props.title,
    };
  },

  // 换一批:重新拉一组随机图 + 新文案。序号机制保证上一批的慢文案不会串台。
  refreshPreview() {
    // 示例模式没有后端,「换一批」仅在本地轮转示例图片,保留可交互体验。
    if (this.data.demo) {
      const draft = this.data.draft;

      if (!draft || !draft.selectedImages.length) {
        return;
      }

      const rotated = draft.selectedImages
        .slice(1)
        .concat(draft.selectedImages.slice(0, 1));

      this.setData({
        currentImage: rotated[0] || null,
        currentImageIndex: 0,
        draft: { ...draft, selectedImages: rotated },
      });
      return;
    }

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

  // 示例模式:post-note-button 需要 https 公网图 + 会真的跳发布页,示例图是本地资源、
  // 也不该让审核员真跳去发布;所以示例模式改用普通按钮,点了只弹窗说明。
  async showDemoPublishTip() {
    await showModal({
      content:
        "当前为内容展示示例。扫描具体项目的二维码进入后,可直接跳转小红书发布页。",
      showCancel: false,
      title: "示例内容",
    });
  },

  // <post-note-button> 参数校验失败(标题/正文超长、media-info 不合法等)时触发。
  onPublishError(event) {
    const detail = (event && event.detail) || {};

    showModal({
      content: detail.errMsg || "内容不符合发布要求,请点「换一批」重试。",
      showCancel: false,
      title: "无法发布",
    });
  },
});
