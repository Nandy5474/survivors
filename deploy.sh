#!/usr/bin/env bash
# ============================================================
# deploy.sh — 部署「幸存者」到 GitHub Pages
#
# 用法:
#   ./deploy.sh              # 默认推送到 gh-pages 分支
#   ./deploy.sh -m "msg"    # 指定提交信息
#   ./deploy.sh -d           # 仅构建，不推送
#
# 依赖:
#   npm install --save-dev vite
# ============================================================

set -euo pipefail

# ---- 配置 ----
DIST_DIR=".survivors-dist"
BRANCH="${GITHUB_PAGES_BRANCH:-gh-pages}"
COMMIT_MSG="${1:-"deploy: update Survivors game"}"
DRY_RUN=false

# ---- 参数解析 ----
while getopts "m:dh" opt; do
  case $opt in
    m) COMMIT_MSG="$OPTARG" ;;
    d) DRY_RUN=true ;;
    h)
      echo "Usage: ./deploy.sh [-m commit_msg] [-d]"
      echo "  -m  指定提交信息"
      echo "  -d  仅构建，不推送"
      exit 0
      ;;
    *) exit 1 ;;
  esac
done

echo "=========================================="
echo "  Survivors — GitHub Pages 部署脚本"
echo "=========================================="

# ---- 检查依赖 ----
if ! command -v git &>/dev/null; then
  echo "[ERROR] git 未安装，请先安装 git"
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "[WARN] 当前目录不是 git 仓库，正在初始化..."
  git init
  echo "[INFO] 请手动添加 remote： git remote add origin <your-repo-url>"
fi

# ---- 安装/检查构建工具 ----
if [ ! -d "node_modules" ]; then
  echo "[INFO] 首次运行，安装依赖..."
  npm install
fi

# ---- 构建 ----
echo "[BUILD] 正在构建生产版本..."
npx vite build --config vite.config.js --outDir "$DIST_DIR" 2>&1

if [ ! -d "$DIST_DIR" ]; then
  echo "[ERROR] 构建失败：$DIST_DIR 不存在"
  exit 1
fi

echo "[BUILD] 构建完成，输出目录: $DIST_DIR"

# 复制 index.html 到 404.html（SPA 路由支持）
if [ -f "$DIST_DIR/index.html" ]; then
  cp "$DIST_DIR/index.html" "$DIST_DIR/404.html"
  echo "[BUILD] 已生成 404.html（SPA 路由支持）"
fi

if [ "$DRY_RUN" = true ]; then
  echo "[DRY-RUN] 仅构建完成，跳过推送。"
  echo "[DRY-RUN] 构建产物位于: $DIST_DIR"
  exit 0
fi

# ---- 推送到 gh-pages 分支 ----
echo "[DEPLOY] 正在推送到 $BRANCH 分支..."

cd "$DIST_DIR"

# 初始化临时 git 仓库
git init
git checkout -b "$BRANCH"
git add -A

if git rev-parse --verify HEAD &>/dev/null; then
  git commit --amend --no-edit || git commit -m "$COMMIT_MSG"
else
  git commit -m "$COMMIT_MSG"
fi

# 推送到 origin 的 gh-pages 分支
git push -f "$(git -C .. remote get-url origin 2>/dev/null || echo '')" "$BRANCH" 2>/dev/null \
  || echo "[WARN] 推送失败，请手动配置 remote:  cd $DIST_DIR && git remote add origin <url> && git push -f origin $BRANCH"

cd ..

echo ""
echo "=========================================="
echo "  部署完成！"
echo "  访问: https://<your-username>.github.io/<repo>/"
echo "=========================================="
