"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockOutlined,
  LoginOutlined,
  MobileOutlined,
  WechatOutlined,
} from "@ant-design/icons";
import { App, Button, Checkbox, Divider, Form, Input, Select, Space, Tabs } from "antd";

type LoginFormValues = {
  password?: string;
  phone?: string;
  remember?: boolean;
};

const areaOptions = [
  { label: "+86", value: "+86" },
  { label: "+852", value: "+852" },
  { label: "+853", value: "+853" },
];

export function LoginPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<LoginFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(values: LoginFormValues) {
    const phone = values.phone?.replace(/\s+/g, "").trim() ?? "";
    const password = values.password ?? "";

    if (!/^1\d{10}$/.test(phone)) {
      message.warning("请输入手机号码");
      return;
    }

    if (password.length < 8) {
      message.warning("密码至少需要 8 位");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        body: JSON.stringify({
          password,
          phone,
          remember: Boolean(values.remember),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        message.error(payload.error || "登录失败");
        return;
      }

      message.success("登录成功");
      router.replace("/overview");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="AI 内容管理系统">
        <div className="login-visual-grid" />
        <div className="login-chip">
          <span>AI</span>
        </div>
        <div className="login-visual-copy">
          <strong>智能内容工作台</strong>
          <p>素材、策略、草稿和发布流程统一管理</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">Z</div>
            <strong>至野内容</strong>
          </div>

          <Tabs
            activeKey="password"
            centered
            className="login-tabs"
            items={[{ key: "password", label: "密码登录" }]}
          />

          <Form
            form={form}
            initialValues={{ remember: true }}
            onFinish={submitLogin}
            requiredMark={false}
          >
            <Form.Item className="login-phone-item">
              <Space.Compact block>
                <Select
                  className="login-area-select"
                  defaultValue="+86"
                  options={areaOptions}
                />
                <Form.Item name="phone" noStyle rules={[{ required: true, message: "请输入手机号码" }]}>
                  <Input
                    prefix={<MobileOutlined />}
                    placeholder="输入手机号码"
                  />
                </Form.Item>
              </Space.Compact>
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
              />
            </Form.Item>

            <div className="login-tools">
              <Form.Item name="remember" noStyle valuePropName="checked">
                <Checkbox>记住登录</Checkbox>
              </Form.Item>
              <Button onClick={() => message.info("请联系管理员重置密码")} type="link">
                忘记密码
              </Button>
            </div>

            <Button
              block
              className="login-submit"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={isSubmitting}
              size="large"
              type="primary"
            >
              登录
            </Button>
          </Form>

          <div className="login-register">
            <span>还没有账号？</span>
            <Button onClick={() => message.info("请联系管理员开通账号")} type="link">
              联系管理员
            </Button>
          </div>

          <Divider className="login-divider">其他登录方式</Divider>

          <Space className="login-social" size={14}>
            <Button
              aria-label="微信登录"
              className="wechat-login"
              icon={<WechatOutlined />}
              onClick={() => message.info("微信登录暂未接入")}
              shape="circle"
              size="large"
            />
          </Space>
        </div>
      </section>
    </main>
  );
}
