"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockOutlined,
  LoginOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  WechatOutlined,
} from "@ant-design/icons";
import { App, Button, Checkbox, Divider, Form, Input, Select, Space, Tabs } from "antd";
import { saveAuthSession } from "@/features/auth/lib/session";

type LoginMode = "code" | "password";

type LoginFormValues = {
  code?: string;
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
  const [mode, setMode] = useState<LoginMode>("code");
  const [countdown, setCountdown] = useState(0);

  function startCountdown() {
    const phone = form.getFieldValue("phone");

    if (!phone) {
      message.warning("请输入手机号码");
      return;
    }

    message.success("验证码已发送");
    setCountdown(60);

    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);
  }

  async function submitLogin(values: LoginFormValues) {
    if (!values.phone) {
      message.warning("请输入手机号码");
      return;
    }

    if (mode === "code" && !values.code) {
      message.warning("请输入验证码");
      return;
    }

    if (mode === "password" && !values.password) {
      message.warning("请输入密码");
      return;
    }

    message.success("登录成功");
    saveAuthSession(values.phone);
    router.push("/overview");
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
            activeKey={mode}
            centered
            className="login-tabs"
            items={[
              { key: "code", label: "验证码登录" },
              { key: "password", label: "密码登录" },
            ]}
            onChange={(key) => setMode(key as LoginMode)}
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

            {mode === "code" ? (
              <Form.Item name="code" rules={[{ required: true, message: "请输入验证码" }]}>
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="输入验证码"
                  suffix={
                    <Button disabled={countdown > 0} onClick={startCountdown} type="link">
                      {countdown > 0 ? `${countdown}s` : "获取验证码"}
                    </Button>
                  }
                />
              </Form.Item>
            ) : (
              <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                />
              </Form.Item>
            )}

            {mode === "password" ? (
              <div className="login-tools">
                <Form.Item name="remember" noStyle valuePropName="checked">
                  <Checkbox>记住登录</Checkbox>
                </Form.Item>
                <Button type="link">忘记密码</Button>
              </div>
            ) : null}

            <Button
              block
              className="login-submit"
              htmlType="submit"
              icon={<LoginOutlined />}
              size="large"
              type="primary"
            >
              登录
            </Button>
          </Form>

          <div className="login-register">
            <span>还没有账号？</span>
            <Button type="link">注册</Button>
          </div>

          <Divider className="login-divider">其他登录方式</Divider>

          <Space className="login-social" size={14}>
            <Button
              aria-label="微信登录"
              className="wechat-login"
              icon={<WechatOutlined />}
              shape="circle"
              size="large"
            />
          </Space>
        </div>
      </section>
    </main>
  );
}
