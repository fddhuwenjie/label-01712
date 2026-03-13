# 可视化工作流编辑器

基于 HTML5 的可视化工作流编辑器，支持拖拽组件、连线关联、保存运行等功能。

## How to Run

```bash
# 使用 Docker Compose 启动
docker-compose up --build -d

# 访问应用
open http://localhost:8085

# 停止服务
docker-compose down
```

本地开发可直接在浏览器打开 `frontend-user/index.html`。

## Services

| 服务 | 端口 | 说明 |
|-----|------|-----|
| frontend-user | 8085 | 工作流编辑器前端 |

## 测试账号

本项目为纯前端应用，无需登录。数据存储在浏览器 LocalStorage。

运行单元测试：访问 `http://localhost:8085/test.html`

## 题目内容

基于 HTML 实现可视化工作流编辑器：

- 左侧组件面板，右侧工作区
- 支持拖拽组件到工作区
- 通过连线关联组件形成工作流
- 右上角保存/运行按钮
- 左上角新建/加载工作流
- 组件类型：数字输入、文字输入、条件判断、结果输出

## 项目介绍

### 功能特性

- 拖拽式组件添加
- 贝塞尔曲线连线（带动画效果）
- 工作流保存/加载/导出/导入
- 拓扑排序执行工作流
- 深色主题 UI

### 技术架构

```
frontend-user/
├── js/
│   ├── app.js              # 主应用入口
│   ├── core/               # 核心模块
│   │   ├── NodeManager.js      # 节点管理
│   │   ├── ConnectionManager.js # 连线管理
│   │   ├── DragManager.js      # 拖拽处理
│   │   ├── WorkflowExecutor.js # 工作流执行
│   │   └── StorageManager.js   # 数据存储
│   ├── ui/                 # UI 组件
│   │   ├── ModalManager.js     # 弹窗管理
│   │   └── ToastManager.js     # 通知管理
│   ├── utils/              # 工具类
│   │   ├── Logger.js           # 日志
│   │   ├── EventEmitter.js     # 事件总线
│   │   └── ErrorHandler.js     # 错误处理
│   ├── config/             # 配置
│   │   └── NodeTypes.js        # 节点类型定义
│   └── __tests__/          # 单元测试
├── css/style.css           # 样式
└── index.html              # 主页面
```

### 组件说明

| 组件 | 输入 | 输出 | 功能 |
|-----|-----|-----|-----|
| 数字输入 | ✅ | ✅ | 输入数字，可接收上游数据 |
| 文字输入 | ✅ | ✅ | 输入文字，可拼接上游数据 |
| 条件判断 | ✅ | ✅ | 比较运算（>、<、=、>=、<=） |
| 结果输出 | ✅ | ❌ | 显示工作流执行结果 |

### 使用方式

1. 从左侧拖拽组件到工作区
2. 点击组件输出端口（右侧圆点），拖动到另一组件输入端口（左侧圆点）
3. 配置组件参数
4. 点击"运行"执行工作流
5. 点击"保存"保存工作流
