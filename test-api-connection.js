#!/usr/bin/env node

import axios from 'axios';

console.log('🔍 CircuitAI API连接诊断工具\n');

// 测试配置
const configs = [
  {
    name: '本地后端服务',
    url: 'http://localhost:3003/api/health',
    timeout: 5000
  },
  {
    name: 'Cloudflare Workers',
    url: 'https://circuitai-api.peyoba.workers.dev/api/health',
    timeout: 10000
  }
];

async function testEndpoint(config) {
  console.log(`📡 测试 ${config.name}...`);
  
  try {
    const response = await axios.get(config.url, {
      timeout: config.timeout,
      headers: {
        'User-Agent': 'CircuitAI-Test/1.0'
      }
    });
    
    console.log(`✅ ${config.name} 连接成功`);
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应: ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    console.log(`❌ ${config.name} 连接失败`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`   错误: 连接被拒绝 - 服务可能未启动`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`   错误: 连接超时`);
    } else if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误信息: ${error.response.data?.error || error.message}`);
    } else {
      console.log(`   错误: ${error.message}`);
    }
    return false;
  }
}

async function testAIEndpoint(baseUrl, provider = 'mock') {
  console.log(`🤖 测试 AI 接口 (${provider})...`);
  
  try {
    const response = await axios.post(`${baseUrl}/ai/chat`, {
      message: '你好，这是一个测试消息',
      provider: provider,
      apiConfig: provider === 'mock' ? {} : {
        provider: provider,
        apiKey: 'test-key',
        apiUrl: 'https://api.example.com',
        model: 'test-model'
      }
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ AI接口测试成功`);
    console.log(`   响应: ${response.data.data?.response?.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.log(`❌ AI接口测试失败`);
    console.log(`   错误: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function main() {
  let workingEndpoint = null;
  
  // 测试所有端点
  for (const config of configs) {
    const success = await testEndpoint(config);
    if (success && !workingEndpoint) {
      workingEndpoint = config.url.replace('/health', '');
    }
    console.log('');
  }
  
  // 如果有可用的端点，测试AI功能
  if (workingEndpoint) {
    console.log(`🎯 使用可用端点测试AI功能: ${workingEndpoint}`);
    await testAIEndpoint(workingEndpoint);
  } else {
    console.log('❌ 没有可用的API端点');
    console.log('\n🔧 建议的解决步骤:');
    console.log('1. 启动本地后端服务: npm run dev:backend');
    console.log('2. 检查Cloudflare Workers部署状态');
    console.log('3. 验证API密钥配置');
  }
  
  console.log('\n📋 诊断完成');
}

main().catch(console.error);