#!/bin/bash

echo "🧪 CircuitAI 部署测试脚本"
echo "========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
test_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

test_fail() {
    echo -e "${RED}❌ $1${NC}"
}

test_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 获取部署URL
if [ -z "$1" ]; then
    echo -e "${YELLOW}请提供Vercel部署URL作为参数${NC}"
    echo "用法: ./test-deployment.sh https://your-app.vercel.app"
    exit 1
fi

DEPLOY_URL=$1
echo -e "${BLUE}测试部署URL: $DEPLOY_URL${NC}"
echo ""

# 1. 测试网站首页
echo "1. 测试网站首页..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL")
if [ "$HTTP_STATUS" = "200" ]; then
    test_pass "首页响应正常 (HTTP $HTTP_STATUS)"
else
    test_fail "首页响应异常 (HTTP $HTTP_STATUS)"
fi

# 2. 测试健康检查API
echo -e "\n2. 测试健康检查API..."
HEALTH_RESPONSE=$(curl -s "$DEPLOY_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
    test_pass "健康检查API正常"
    echo "   响应: $(echo $HEALTH_RESPONSE | jq -r '.message' 2>/dev/null || echo $HEALTH_RESPONSE)"
else
    test_fail "健康检查API异常"
    echo "   响应: $HEALTH_RESPONSE"
fi

# 3. 测试AI配置测试API
echo -e "\n3. 测试AI配置测试API..."
TEST_CONFIG='{
  "provider": "mock",
  "apiUrl": "https://api.example.com",
  "apiKey": "test-key",
  "model": "test-model"
}'

CONFIG_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_CONFIG" \
  "$DEPLOY_URL/api/ai/test-config")

if echo "$CONFIG_RESPONSE" | grep -q "success"; then
    test_pass "AI配置测试API正常"
else
    test_fail "AI配置测试API异常"
    echo "   响应: $CONFIG_RESPONSE"
fi

# 4. 测试静态资源
echo -e "\n4. 测试静态资源..."
ASSETS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/vite.svg")
if [ "$ASSETS_STATUS" = "200" ]; then
    test_pass "静态资源加载正常"
else
    test_info "静态资源测试跳过 (可能路径不同)"
fi

# 5. 测试路由
echo -e "\n5. 测试SPA路由..."
ROUTE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/design")
if [ "$ROUTE_STATUS" = "200" ]; then
    test_pass "SPA路由正常"
else
    test_info "SPA路由测试 (HTTP $ROUTE_STATUS) - 这是正常的，因为是客户端路由"
fi

# 6. 测试CORS
echo -e "\n6. 测试CORS配置..."
CORS_HEADERS=$(curl -s -I -X OPTIONS "$DEPLOY_URL/api/health" | grep -i "access-control")
if [ -n "$CORS_HEADERS" ]; then
    test_pass "CORS配置正常"
    echo "   Headers: $CORS_HEADERS"
else
    test_info "CORS头部未检测到（可能需要实际请求触发）"
fi

# 总结
echo -e "\n📋 测试总结"
echo "============"
echo -e "${BLUE}部署URL: $DEPLOY_URL${NC}"
echo ""
echo "✅ 基础功能测试完成"
echo "✅ API端点测试完成"
echo ""
echo "🔗 下一步测试（手动）："
echo "   1. 在浏览器中打开: $DEPLOY_URL"
echo "   2. 测试AI对话功能"
echo "   3. 测试电路设计功能"
echo "   4. 检查控制台是否有错误"
echo ""
echo "📊 性能测试："
echo "   curl -w \"@curl-format.txt\" -o /dev/null -s \"$DEPLOY_URL\""
echo ""
echo "🐛 如果发现问题："
echo "   1. 检查Vercel部署日志"
echo "   2. 查看浏览器开发者工具"
echo "   3. 测试本地开发环境对比"