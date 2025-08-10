# CircuitAI - 智能电路设计平台

[![开发状态](https://img.shields.io/badge/开发状态-Phase%202%20完成-brightgreen)](https://github.com/peyoba/CircuitAI)
[![技术栈](https://img.shields.io/badge/技术栈-React%20%2B%20Node.js%20%2B%20TypeScript-blue)](https://github.com/peyoba/CircuitAI)
[![AI支持](https://img.shields.io/badge/AI支持-OpenAI%20%2B%20Claude%20%2B%20Gemini-orange)](https://github.com/peyoba/CircuitAI)

> 🎯 **项目愿景**: 通过人工智能让复杂的电路设计变得简单易懂，即使是初学者也能设计出专业可靠的电路方案。

## ✨ 核心特性

### 🤖 智能AI助手
- **多模型支持**: OpenAI GPT、Anthropic Claude、Google Gemini
- **专业对话**: 基于电路设计领域的专业提示词模板  
- **上下文感知**: 智能的多轮对话和设计意图理解
- **实时响应**: 快速生成专业的电路设计方案

### 📊 电路设计生成
- **ASCII电路图**: 清晰的文本格式电路原理图
- **参数计算**: 自动计算电阻、电容等关键参数
- **多种电路**: 支持LED、电源、放大器、滤波器等电路类型
- **设计验证**: 电路可行性分析和优化建议

### 📋 智能BOM管理
- **自动生成**: 从电路描述自动解析物料清单
- **价格估算**: 实时元件价格和供应商信息
- **表格管理**: 可编辑的BOM表格，支持CSV/PDF导出
- **采购助手**: 一键查找元件采购链接

### 🎨 现代化界面
- **三栏布局**: AI助手 + 电路图 + BOM表格
- **响应式设计**: 完美支持桌面和移动设备
- **实时预览**: 即时显示设计结果和参数变化
- **交互友好**: 直观的操作体验和丰富的用户反馈

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装和启动
```bash
# 克隆项目
git clone https://github.com/peyoba/CircuitAI.git
cd CircuitAI

# 安装所有依赖
npm run install:all

# 启动开发环境（同时启动前后端）
npm run dev

# 或分别启动
npm run dev:backend  # 后端服务 http://localhost:3003
npm run dev:frontend # 前端应用 http://localhost:3002
```

### 首次使用
1. 访问 http://localhost:3002
2. 点击左侧AI助手的设置按钮⚙️配置API密钥（可选）
3. 在对话框输入："设计一个LED闪烁电路"
4. 查看生成的电路图和BOM清单

## 💡 使用示例

### 基础LED电路
```
用户: 设计一个简单的LED指示灯电路
AI: 我为您设计一个基本的LED驱动电路...

ASCII电路图:
VCC(+5V) ----[R1]----[LED1]---- GND
              220Ω     红色

元件清单:
- R1: 220Ω电阻，1/4W，碳膜电阻
- LED1: 红色LED，5mm，正向电压2V  
- 电源: 5V直流电源
```

### 电源稳压电路
```
用户: 需要一个5V稳压电源
AI: 推荐使用LM7805线性稳压器...

ASCII电路图:
AC输入 ----[变压器]----[整流桥]----[C1]----[LM7805]----[C2]---- +5V输出
       220V→12V        D1-D4      470μF    IN  OUT    100nF
```

## 🏗️ 技术架构

### 前端技术栈
```
React 18 + TypeScript + Vite
├── UI框架: Ant Design + Tailwind CSS
├── 状态管理: React Hooks
├── API调用: Axios + 统一错误处理
└── 开发工具: ESLint + Prettier
```

### 后端技术栈  
```
Node.js + Express + TypeScript
├── AI集成: OpenAI/Claude/Gemini适配器
├── 会话管理: 智能上下文跟踪
├── 电路处理: ASCII解析 + BOM生成
└── 开发工具: tsx + 热重载
```

### 项目结构
```
CircuitsAI/
├── frontend/           # React前端应用
├── backend/            # Node.js后端服务
├── shared/             # 共享类型定义
├── docs/               # 项目文档
├── scripts/            # 构建脚本
└── docker/             # Docker配置
```

## 📖 API文档

### AI对话接口
```typescript
POST /api/ai/chat
{
  "message": "设计一个LED电路",
  "model": "openai",
  "conversation_id": "conv_xxx"
}

Response:
{
  "success": true,
  "data": {
    "response": "电路设计方案...",
    "conversation_id": "conv_xxx",
    "circuitData": { ... },
    "bomData": [ ... ]
  }
}
```

### 支持的AI模型
- `openai`: OpenAI GPT-3.5/4
- `claude`: Anthropic Claude
- `gemini`: Google Gemini

## 🛠️ 开发指南

### 可用脚本
```bash
# 开发
npm run dev              # 同时启动前后端
npm run dev:frontend     # 仅前端
npm run dev:backend      # 仅后端

# 构建
npm run build            # 构建全部
npm run build:frontend   # 构建前端
npm run build:backend    # 构建后端

# 代码质量
npm run lint             # 代码检查
npm run test             # 运行测试
```

### 配置API密钥
1. 复制环境配置文件：`cp backend/.env.example backend/.env`
2. 编辑`.env`文件，添加你的API密钥
3. 或在应用界面中点击设置按钮配置

### 添加新电路类型
1. 在`PromptTemplates.ts`中添加专用提示词
2. 在`AIService.ts`中添加识别逻辑
3. 更新`CircuitGenerator.ts`支持新元件类型

## 🔄 开发路线图

### ✅ Phase 1: MVP核心功能 (已完成)
- [x] AI对话系统
- [x] ASCII电路图生成
- [x] BOM表格管理
- [x] API配置界面
- [x] 基础用户界面

### 🚧 Phase 2: 可视化增强 (进行中)
- [ ] SVG专业电路图渲染
- [ ] 标准电路符号库
- [ ] 智能布局算法
- [ ] 交互式编辑功能

### 📋 Phase 3: 平台完善 (计划中)
- [ ] 用户账户系统
- [ ] 设计历史保存
- [ ] 协作分享功能
- [ ] PCB布局建议

## 🤝 贡献指南

### 参与开发
1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交Pull Request

### 代码规范
- 使用TypeScript严格模式
- 遵循ESLint和Prettier配置
- 中文注释，英文变量名
- 单个函数不超过50行

### 问题反馈
- [提交Bug报告](https://github.com/your-username/circuitsai/issues)
- [功能请求](https://github.com/your-username/circuitsai/issues)
- [讨论区](https://github.com/your-username/circuitsai/discussions)

## 📄 许可证

本项目采用 [MIT许可证](LICENSE)

## 🙏 致谢

- 感谢OpenAI、Anthropic、Google提供的AI API支持
- 感谢开源社区提供的优秀工具和库
- 感谢所有贡献者的参与和支持

## 📞 联系我们

- 项目主页: https://github.com/your-username/circuitsai
- 问题反馈: https://github.com/your-username/circuitsai/issues
- 邮箱: your-email@example.com

---

<div align="center">

**CircuitsAI - 让电路设计变得简单智能** 🚀

[![Star](https://img.shields.io/github/stars/your-username/circuitsai?style=social)](https://github.com/your-username/circuitsai)
[![Fork](https://img.shields.io/github/forks/your-username/circuitsai?style=social)](https://github.com/your-username/circuitsai)
[![Watch](https://img.shields.io/github/watchers/your-username/circuitsai?style=social)](https://github.com/your-username/circuitsai)

</div>