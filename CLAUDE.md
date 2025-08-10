# CircuitsAI - 智能电路设计平台开发指南

# 常用命令 (Windows PowerShell)
npm run build            # 构建项目
npm run lint             # 代码风格检查
npm run test             # 运行单元测试
npm run dev              # 启动开发环境（前后端同时）
npm run dev:frontend     # 仅启动前端服务 (端口3002)
npm run dev:backend      # 仅启动后端服务 (端口3003)
npm run install:all      # 安装所有依赖

# 代码风格
- 使用ES模块语法 (import/export)，避免CommonJS (require)
- 优先解构导入 (import { foo } from 'bar')
- 变量命名采用camelCase风格

# 工作流程
- 每次提交前必须运行单元测试和类型检查
- 分支命名格式：feature/xxx, fix/xxx, chore/xxx
- 代码评审后合并，优先使用rebase合并

# 开发环境设置
- Node.js版本：>=16.0.0 (推荐18.x)
- npm版本：>=8.0.0
- 推荐IDE配置：VSCode + ESLint + Prettier + TypeScript
- 操作系统：Windows 10/11, macOS, Linux

# 项目警告
- 注意：API调用频率限制为每分钟10次
- 慎用“force update”命令，可能导致数据丢失

# 其他
- Claude应默认用中文回答问题
- 提醒Claude关注代码安全和性能优化


## 📋 项目概述

### 🎯 项目愿景
CircuitsAI是一个基于人工智能的智能电路设计平台，通过自然语言交互将复杂的电路设计变得简单易懂。即使是初级工程师或电子爱好者，也能在AI的指导下设计出专业、可靠的电路方案。

### 📊 当前项目状态 (2025-08-08更新)
**MVP阶段**: ✅ 100%完成  
**Phase 2**: ✅ 100%完成  
**Phase 3**: ⏳ 计划中  

**核心功能完成度**:
- ✅ AI对话系统 - 支持多种AI模型集成
- ✅ ASCII电路图生成 - 智能组件识别和连接解析  
- ✅ SVG电路图渲染 - 14种标准电路符号，智能布局
- ✅ BOM物料清单管理 - 自动生成，价格估算，CSV导出
- ✅ 项目管理系统 - CRUD操作，导入导出，搜索过滤
- ✅ 现代化用户界面 - 响应式三栏布局，主题切换

**技术指标**:
- 测试覆盖: 前端5/5通过，后端15/15通过
- 构建状态: 前后端构建无错误
- 代码质量: 52个ESLint警告待处理

### 🎯 核心价值
- **降低门槛**：将专业电路设计知识转化为直观的AI对话
- **提升效率**：快速从需求到可实现的电路方案
- **保证质量**：基于专业知识库的AI辅助设计
- **知识传承**：将资深工程师经验融入AI指导流程

### 👥 目标用户
- **硬件工程师**：快速原型设计与方案验证
- **电子爱好者**：学习电路设计基础知识
- **学生群体**：电子工程教育辅助工具
- **教育机构**：电路设计课程教学平台
- **企业团队**：产品开发前期电路方案设计

---

## 🏗️ 技术架构

### 🎨 前端技术栈
- **框架**：React 18 + TypeScript
- **UI组件库**：Ant Design / Material-UI
- **状态管理**：Zustand / Redux Toolkit
- **路由**：React Router v6
- **构建工具**：Vite
- **样式方案**：Tailwind CSS + CSS Modules
- **代码规范**：ESLint + Prettier + Husky

### ⚙️ 后端技术栈
- **运行环境**：Node.js 18+
- **Web框架**：Express.js / Fastify
- **数据库**：PostgreSQL + Redis
- **ORM**：Prisma / TypeORM
- **身份认证**：JWT + Passport.js
- **API文档**：Swagger/OpenAPI
- **日志系统**：Winston + Morgan

### 🤖 AI集成方案
- **模型接入**：统一AI服务适配器
- **支持模型**：OpenAI、Claude、Gemini、DeepSeek、豆包、Perplexity
- **自定义接入**：灵活的API配置接口
- **提示词管理**：模板化提示词系统
- **对话管理**：上下文记忆与多轮对话

### 🎨 电路图渲染
- **ASCII渲染**：纯文本电路图生成
- **可视化渲染**：Canvas/SVG电路图绘制
- **元件库管理**：标准电子元件符号库
- **图形导出**：PNG、SVG、PDF格式支持

---

## 📁 项目目录结构

```
CircuitsAI/
├── docs/                          # 项目文档
│   ├── api/                       # API文档
│   ├── development/               # 开发文档
│   └── user/                      # 用户手册
├── frontend/                      # 前端项目
│   ├── public/                    # 静态资源
│   ├── src/                       # 源代码
│   │   ├── components/            # 可复用组件
│   │   │   ├── common/            # 通用组件
│   │   │   ├── circuit/           # 电路相关组件
│   │   │   └── ai/                # AI对话组件
│   │   ├── pages/                 # 页面组件
│   │   │   ├── Home/              # 首页
│   │   │   ├── Design/            # 设计页面
│   │   │   └── Profile/           # 用户页面
│   │   ├── hooks/                 # 自定义Hooks
│   │   ├── services/              # API服务
│   │   ├── stores/                # 状态管理
│   │   ├── utils/                 # 工具函数
│   │   └── types/                 # TypeScript类型定义
│   ├── package.json
│   └── README.md
├── backend/                       # 后端项目
│   ├── src/                       # 源代码
│   │   ├── controllers/           # 控制器
│   │   ├── services/              # 业务逻辑
│   │   │   ├── ai/                # AI服务
│   │   │   ├── circuit/           # 电路服务
│   │   │   └── user/              # 用户服务
│   │   ├── models/                # 数据模型
│   │   ├── middleware/            # 中间件
│   │   ├── routes/                # 路由定义
│   │   ├── config/                # 配置文件
│   │   └── utils/                 # 工具函数
│   ├── tests/                     # 测试文件
│   ├── package.json
│   └── README.md
├── shared/                        # 共享代码
│   ├── types/                     # 共享类型定义
│   ├── constants/                 # 常量定义
│   └── utils/                     # 共享工具函数
├── scripts/                       # 脚本文件
│   ├── build.sh                   # 构建脚本
│   ├── deploy.sh                  # 部署脚本
│   └── dev.sh                     # 开发脚本
├── docker/                        # Docker配置
│   ├── Dockerfile.frontend        # 前端Docker文件
│   ├── Dockerfile.backend         # 后端Docker文件
│   └── docker-compose.yml         # Docker编排
├── .github/                       # GitHub配置
│   └── workflows/                 # CI/CD工作流
├── package.json                   # 项目配置
├── CLAUDE.md                      # 开发指南
└── README.md                      # 项目说明
```

---

## 🚀 核心功能模块

### 🤖 AI对话系统 (Phase 1)
**优先级：高 | 技术难度：中**

#### 功能特性
- **多模型集成**：支持主流AI大模型的统一接入
- **智能对话**：上下文感知的多轮对话能力
- **专业提示词**：电路设计领域专业化提示词模板
- **参数收集**：结构化收集电路设计参数

#### 技术实现
```typescript
// AI服务适配器接口
interface AIAdapter {
  chat(messages: Message[], options?: ChatOptions): Promise<AIResponse>
  validateApiKey(apiKey: string): Promise<boolean>
}

// 提示词模板系统
interface PromptTemplate {
  system: string
  phases: {
    requirement: string
    design: string
    validation: string
  }
}
```

### 📊 电路方案设计 (Phase 1)
**优先级：高 | 技术难度：中**

#### 功能特性
- **需求分析**：自然语言需求结构化分析
- **方案生成**：基于需求生成电路框架方案
- **可行性评估**：技术可行性与成本分析
- **方案对比**：多方案比较与推荐

#### 实现方式
```typescript
// 电路设计流程管理
interface CircuitDesignFlow {
  phase: 'requirement' | 'concept' | 'detailed' | 'validation'
  data: {
    requirements: RequirementData
    concept: ConceptDesign
    detailed: DetailedDesign
    validation: ValidationResult
  }
}
```

### 📋 ASCII电路图生成 (Phase 1)
**优先级：高 | 技术难度：低**

#### 功能特性
- **文本电路图**：ASCII字符格式电路原理图
- **元件清单**：详细的BOM表格生成
- **连接说明**：引脚对应关系详细说明
- **参数标注**：关键参数与选型建议

#### 技术实现
```typescript
// ASCII电路图生成器
class ASCIICircuitGenerator {
  generateCircuit(design: CircuitDesign): string
  generateBOM(components: Component[]): BOMTable
  generateConnections(connections: Connection[]): string
}
```

### 🎨 可视化电路图 (Phase 2)
**优先级：中 | 技术难度：高**

#### 功能特性
- **专业绘图**：标准电路符号与布局
- **智能布局**：自动元件排布与走线
- **交互编辑**：可视化编辑与修改功能
- **多格式导出**：PNG、SVG、PDF格式支持

#### 技术方案
```typescript
// 电路图渲染引擎
interface CircuitRenderer {
  renderToSVG(circuit: CircuitData): SVGElement
  renderToCanvas(circuit: CircuitData): HTMLCanvasElement
  exportToPDF(circuit: CircuitData): Blob
}

// 元件库管理
interface ComponentLibrary {
  getSymbol(componentType: string): ComponentSymbol
  getFootprint(componentType: string): ComponentFootprint
}
```

### 📱 用户界面设计 (Phase 1)
**优先级：高 | 技术难度：中**

#### 界面布局
- **主工作区**：AI对话界面 + 电路展示区域
- **侧边栏**：功能导航 + 项目管理
- **工具栏**：常用操作快捷入口
- **响应式设计**：移动端适配

#### 组件设计
```typescript
// 主要页面组件
interface DesignWorkspace {
  chatPanel: AIChat
  circuitDisplay: CircuitViewer
  sidebar: ProjectSidebar
  toolbar: DesignToolbar
}
```

---

## 📋 开发阶段规划

### 🎯 Phase 1: MVP核心功能 (4-6周)
**目标：基础AI对话 + ASCII电路图生成**

#### Week 1-2: 项目基础架构
- ✅ 项目初始化与环境配置
- ✅ 前后端基础框架搭建
- ✅ AI服务适配器开发
- ✅ 基础UI组件开发

#### Week 3-4: 核心功能开发
- ✅ AI对话系统实现
- ✅ 提示词模板设计
- ✅ ASCII电路图生成
- ✅ BOM表格生成

#### Week 5-6: 功能完善与测试
- ✅ 多轮对话逻辑优化
- ✅ 用户界面完善
- ✅ 基础测试与调试
- ✅ MVP版本发布

### 🎯 Phase 2: 可视化增强 (6-8周)
**目标：专业电路图可视化**

#### Week 7-10: 可视化基础
- ✅ 电路图渲染引擎开发
- ✅ 元件符号库建设（14种标准符号）
- ✅ 布局算法实现
- ✅ SVG/Canvas渲染

#### Week 11-14: 交互功能
- ✅ 可视化编辑功能
- ✅ 图形导出功能
- ✅ 用户体验优化
- ✅ 高级功能集成

### 🎯 Phase 3: 平台完善 (4-6周)
**目标：企业级功能与优化**

#### 高级功能
- ⏳ 用户账户系统
- ⏳ 项目管理功能
- ⏳ 协作分享功能
- ⏳ 性能优化与扩展

---

## 💻 开发规范

### 📝 代码规范
- **语言**：TypeScript优先，严格类型检查
- **注释**：中文注释，函数与类必须有完整注释
- **命名**：驼峰命名法，变量名要有意义
- **文件大小**：单文件不超过200行，模块化拆分
- **函数复杂度**：单函数不超过50行，职责单一

### 🏗️ 架构原则
- **模块化设计**：功能模块独立，接口清晰
- **低耦合**：模块间依赖最小化
- **可测试性**：代码结构便于单元测试
- **可扩展性**：预留扩展接口和配置
- **性能优先**：关键路径性能优化

### 🧪 测试策略
- **单元测试**：核心业务逻辑100%覆盖
- **集成测试**：API接口与数据流测试
- **E2E测试**：关键用户流程端到端测试
- **性能测试**：负载测试与性能基准

### 📚 文档要求
- **API文档**：完整的接口文档与示例
- **组件文档**：前端组件使用说明
- **部署文档**：环境配置与部署流程
- **用户手册**：功能使用指南

---

## ⚠️ 风险评估与应对

### 🚨 技术风险
1. **AI模型稳定性**
   - 风险：第三方API不稳定或限流
   - 应对：多模型备份、本地缓存、优雅降级

2. **电路图生成复杂度**
   - 风险：可视化电路图生成技术难度高
   - 应对：分阶段实现，先ASCII后可视化

3. **性能瓶颈**
   - 风险：大规模电路图渲染性能问题
   - 应对：渐进渲染、虚拟化、Web Worker

### 💰 成本控制
- **AI调用成本**：智能缓存、请求优化
- **服务器成本**：弹性扩容、CDN加速
- **开发成本**：MVP优先、迭代开发

---

## 🎯 成功指标

### 📊 技术指标
- **响应时间**：AI对话<3秒，页面加载<2秒
- **准确率**：电路方案可行性>90%
- **可用性**：系统可用性>99.5%
- **性能**：支持100+并发用户

### 👥 用户指标
- **用户满意度**：>4.5/5.0评分
- **任务完成率**：电路设计任务完成率>85%
- **留存率**：月活跃用户留存>60%
- **推荐度**：NPS评分>50

---

## 📞 项目支持

### 🛠️ 开发工具
- **代码仓库**：Git + GitHub/GitLab
- **项目管理**：GitHub Issues / Jira
- **CI/CD**：GitHub Actions / Jenkins
- **监控告警**：Sentry + Prometheus

### 📋 质量保证
- **代码审查**：强制PR Review流程
- **自动测试**：CI集成自动化测试
- **代码质量**：SonarQube代码质量检查
- **安全扫描**：定期依赖安全扫描

---

*本文档将随项目开发进度持续更新，确保开发团队始终有清晰的指导方向。*

