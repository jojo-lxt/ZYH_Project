const {
  authorize,
  downloadFile,
  getPlatform,
  getSetting,
  openSetting,
  openXhsDeeplink,
  saveImageToPhotosAlbum,
  setClipboardData,
  showModal,
} = require("./platform");

// 保存到相册所需的授权 scope(小红书小程序沿用微信系命名)。
const ALBUM_SCOPE = "scope.writePhotosAlbum";

// 小红书发布页 deeplink。真机需逐个验证哪个能被 openXhsDeeplink 放行、落点最好:
//   xhsdiscover://post_note/       图文笔记创作页(默认)
//   xhsdiscover://post/            打开相册选择发布
//   xhsdiscover://hey_home_feed/   「记录我的日常」发布入口
// 注意:openXhsDeeplink 可能有白名单,未必放行发布类 deeplink,以真机实测为准。
const PUBLISH_DEEPLINK = "xhsdiscover://post_note/";

// 拿到「保存到相册」授权:
// 已授权 → 直接过;首次 → authorize 弹窗;曾拒绝过(authorize 不再弹)→ 引导去设置页手动开。
async function ensureAlbumPermission() {
  const setting = await getSetting();
  const authSetting = (setting && setting.authSetting) || {};

  if (authSetting[ALBUM_SCOPE]) {
    return;
  }

  try {
    await authorize(ALBUM_SCOPE);
    return;
  } catch (error) {
    // 用户拒绝(或曾拒绝),继续引导到设置页。
  }

  const modal = await showModal({
    cancelText: "取消",
    confirmText: "去开启",
    content: "需要「保存到相册」权限,才能把图片存进手机相册。请在设置里开启后重试。",
    title: "开启相册权限",
  });

  if (!modal || !modal.confirm) {
    throw new Error("未授权保存到相册");
  }

  const opened = await openSetting();
  const openedAuth = (opened && opened.authSetting) || {};

  if (!openedAuth[ALBUM_SCOPE]) {
    throw new Error("未授权保存到相册");
  }
}

// 下载一张远程图到临时文件,再存进相册。失败抛错,由上层按张兜底。
async function saveOneImage(url) {
  const res = await downloadFile({ url });
  const filePath = res && res.tempFilePath;

  if (!filePath || (res.statusCode && res.statusCode >= 400)) {
    throw new Error("图片下载失败");
  }

  await saveImageToPhotosAlbum(filePath);
}

// 批量存图:先拿一次授权,再逐张存;单张失败不阻断其余。返回成功张数。
async function saveImagesToAlbum(imageUrls) {
  await ensureAlbumPermission();

  let saved = 0;

  for (const url of imageUrls) {
    try {
      await saveOneImage(url);
      saved += 1;
    } catch (error) {
      // 单张失败(下载/保存)不打断整批。
    }
  }

  return saved;
}

// 尝试用 openXhsDeeplink 直接跳进小红书发布器。
// 成功 → true;不支持 / 被白名单拦 / 报错 → false(由上层退回弹窗引导)。
async function jumpToPublisher() {
  const platform = getPlatform();

  if (!platform || typeof platform.openXhsDeeplink !== "function") {
    return false;
  }

  try {
    await openXhsDeeplink(PUBLISH_DEEPLINK);
    return true;
  } catch (error) {
    return false;
  }
}

// 半自动发布闭环:图片存相册 + 文案进剪贴板 + 引导用户去小红书手动发布。
//
// 说明:小红书未开放「小程序直接带图文拉起发布页」的能力(公开文档里只有 xhs.share
// 页面分享,没有笔记预填发布),所以只能做到「备好图文 + 引导」这一步。等官方放开
// 小程序端原生发布跳转,或改用原生 App 接分享 SDK,再在这里替换成一键预填即可。
async function openXhsDraftPublisher(draft) {
  const imageUrls = (draft.selectedImages || [])
    .map((image) => image.absoluteUrl)
    .filter(Boolean);
  const caption = draft.caption || "";
  const platform = getPlatform();
  const canSaveAlbum =
    !!platform && !!platform.downloadFile && !!platform.saveImageToPhotosAlbum;

  // 文案先复制 —— 这是闭环里最关键、最稳的一环。
  let captionCopied = false;

  if (caption) {
    try {
      await setClipboardData(caption);
      captionCopied = true;
    } catch (error) {
      captionCopied = false;
    }
  }

  // 环境不支持存相册,或本就没有图:退回「文案已复制 + 提示手动发布」。
  if (!canSaveAlbum || !imageUrls.length) {
    await showModal({
      content: captionCopied
        ? "文案已复制。请手动保存图片后,打开小红书发布。"
        : "请打开小红书发布。",
      showCancel: false,
      title: "去小红书发布",
    });
    return;
  }

  let savedCount = 0;

  try {
    savedCount = await saveImagesToAlbum(imageUrls);
  } catch (error) {
    savedCount = 0;
  }

  // 一张都没存成(多为未授权相册):至少文案已复制,提示手动处理。
  if (!savedCount) {
    await showModal({
      content: captionCopied
        ? "文案已复制。图片未能保存到相册(可能未授权相册权限),请手动保存图片后到小红书发布。"
        : "图片未能保存到相册,请重试或手动保存。",
      showCancel: false,
      title: "图片未保存",
    });
    return;
  }

  const savedTip =
    savedCount < imageUrls.length
      ? `已保存 ${savedCount}/${imageUrls.length} 张图片到相册`
      : `${imageUrls.length} 张图片已保存到相册`;
  const captionTip = captionCopied ? ",文案已复制" : "";
  const pasteTip = captionCopied ? "、粘贴文案" : "";
  const canJump = !!platform && typeof platform.openXhsDeeplink === "function";

  // 能跳发布器:先让用户读提示,点「去发布」再用 openXhsDeeplink 跳进小红书发布页。
  if (canJump) {
    const modal = await showModal({
      cancelText: "稍后",
      confirmText: "去发布",
      content: `${savedTip}${captionTip}。\n点「去发布」进入小红书,选择刚存的图片${pasteTip}即可。`,
      title: "图文已备好",
    });

    if (modal && modal.confirm) {
      const jumped = await jumpToPublisher();

      // openXhsDeeplink 存在但被白名单拦/报错:退回手动引导。
      if (!jumped) {
        await showModal({
          content: `请打开小红书点「+」发布,从相册选择刚存的图片${pasteTip}即可。`,
          showCancel: false,
          title: "请手动打开小红书",
        });
      }
    }

    return;
  }

  // 不支持跳转:纯手动引导(存图 + 复制文案已完成)。
  await showModal({
    confirmText: "我知道了",
    content: `${savedTip}${captionTip}。\n请打开小红书点「+」发布,从相册选择这些图片${pasteTip}即可。`,
    showCancel: false,
    title: "图文已备好",
  });
}

module.exports = {
  openXhsDraftPublisher,
};
