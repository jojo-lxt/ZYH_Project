// 项目二维码的三种渠道(扫码人群身份)。前后端共用:渲染二维码、解析扫码 URL、注入文案角度。
export type Channel = "visitor" | "resident" | "agent";

export const CHANNEL_TYPES: ReadonlyArray<{ value: Channel; label: string }> = [
  { value: "visitor", label: "游客渠道" },
  { value: "resident", label: "用户渠道" },
  { value: "agent", label: "中介渠道" },
];

export const CHANNEL_VALUES: readonly Channel[] = CHANNEL_TYPES.map((c) => c.value);

export const DEFAULT_CHANNEL: Channel = "visitor";

// 把任意查询参数值规整成合法 Channel;缺失/非法回退默认(visitor)。
export function parseChannel(value: string | null | undefined): Channel {
  return CHANNEL_VALUES.includes(value as Channel) ? (value as Channel) : DEFAULT_CHANNEL;
}
