function getPlatform() {
  if (typeof xhs !== "undefined") {
    return xhs;
  }

  if (typeof wx !== "undefined") {
    return wx;
  }

  return null;
}

function request(options) {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.request) {
      reject(new Error("当前运行环境不支持 request"));
      return;
    }

    platform.request({
      ...options,
      fail: reject,
      success: resolve,
    });
  });
}

function showToast(title, icon = "none") {
  const platform = getPlatform();

  if (platform && platform.showToast) {
    platform.showToast({ icon, title });
  }
}

function showModal(options) {
  const platform = getPlatform();

  return new Promise((resolve) => {
    if (!platform || !platform.showModal) {
      resolve({ cancel: true, confirm: false });
      return;
    }

    platform.showModal({
      ...options,
      fail: () => resolve({ cancel: true, confirm: false }),
      success: resolve,
    });
  });
}

function setClipboardData(data) {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.setClipboardData) {
      reject(new Error("当前运行环境不支持剪贴板"));
      return;
    }

    platform.setClipboardData({
      data,
      fail: reject,
      success: resolve,
    });
  });
}

function downloadFile(options) {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.downloadFile) {
      reject(new Error("当前运行环境不支持下载图片"));
      return;
    }

    platform.downloadFile({
      ...options,
      fail: reject,
      success: resolve,
    });
  });
}

function saveImageToPhotosAlbum(filePath) {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.saveImageToPhotosAlbum) {
      reject(new Error("当前运行环境不支持保存到相册"));
      return;
    }

    platform.saveImageToPhotosAlbum({
      filePath,
      fail: reject,
      success: resolve,
    });
  });
}

function getSetting() {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.getSetting) {
      reject(new Error("当前运行环境不支持获取授权状态"));
      return;
    }

    platform.getSetting({
      fail: reject,
      success: resolve,
    });
  });
}

function authorize(scope) {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.authorize) {
      reject(new Error("当前运行环境不支持申请授权"));
      return;
    }

    platform.authorize({
      scope,
      fail: reject,
      success: resolve,
    });
  });
}

function openSetting() {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.openSetting) {
      reject(new Error("当前运行环境不支持打开设置页"));
      return;
    }

    platform.openSetting({
      fail: reject,
      success: resolve,
    });
  });
}

function openXhsDeeplink(deeplink) {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    if (!platform || !platform.openXhsDeeplink) {
      reject(new Error("当前运行环境不支持 openXhsDeeplink"));
      return;
    }

    // openXhsDeeplink 的入参字段名未能在可访问的官方文档中确认,这里同时传
    // deeplink / link / url 三个常见别名,真机验证后按实际字段裁掉多余的。
    // 多余字段通常会被忽略,不会报错;真跳不动会走 fail → 上层退回弹窗引导。
    platform.openXhsDeeplink({
      deeplink,
      link: deeplink,
      url: deeplink,
      fail: reject,
      success: resolve,
    });
  });
}

module.exports = {
  authorize,
  downloadFile,
  getPlatform,
  getSetting,
  openSetting,
  openXhsDeeplink,
  request,
  saveImageToPhotosAlbum,
  setClipboardData,
  showModal,
  showToast,
};
