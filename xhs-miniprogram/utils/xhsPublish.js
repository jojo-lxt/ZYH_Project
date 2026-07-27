// 把预览页的 draft 结构,转换成 <post-note-button> 组件需要的入参。
//
// <post-note-button> 是小红书内置的「发小红书」原生组件:点击即原生跳转到发布页,
// 并把 title / content / media-info / tags 带过去,用户在小红书里点发布即可。
// 组件对入参有硬性校验(见小红书官方文档 post-note-button),违反会触发 binderror
// 且不跳转,所以这里做防御式处理:
//   - title    ≤ 20 字(超出组件会 error,这里先截断保底);
//   - content  ≤ 1000 字(同上);
//   - media-info 必填,需 JSON 字符串;image_resources / video_resources 二选一,
//     图片 1-18 张,url 仅支持 https:// 且响应头带 content-disposition: inline
//     (我们的公开图片接口已满足);本项目只发图文,故只填 image_resources;
//   - tags 用英文逗号分割,不带 # 号。
const MAX_TITLE_LEN = 20;
const MAX_CONTENT_LEN = 1000;
const MAX_IMAGES = 18;

function buildPublishProps(draft) {
  const source = draft || {};
  const imageUrls = (source.selectedImages || [])
    .map((image) => image && image.absoluteUrl)
    .filter(Boolean)
    .slice(0, MAX_IMAGES);
  const title = (source.title || "").slice(0, MAX_TITLE_LEN);
  const content = (source.body || "").slice(0, MAX_CONTENT_LEN);
  const tags = (source.topics || [])
    .map((topic) => String(topic || "").trim())
    .filter(Boolean)
    .join(",");
  const mediaInfo = JSON.stringify({
    image_resources: imageUrls.map((url) => ({ url })),
  });

  return { content, mediaInfo, tags, title };
}

module.exports = {
  buildPublishProps,
};
