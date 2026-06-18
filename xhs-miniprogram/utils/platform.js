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

  if (platform && platform.showModal) {
    platform.showModal(options);
  }
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

module.exports = {
  getPlatform,
  request,
  setClipboardData,
  showModal,
  showToast,
};
