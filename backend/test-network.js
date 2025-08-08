import axios from 'axios';
import { spawn } from 'child_process';

async function diagnoseNetwork() {
  console.log('🔍 网络诊断开始...\n');

  // 1. 测试基础DNS解析
  console.log('1. 测试DNS解析...');
  const domains = [
    'api.openai.com',
    'generativelanguage.googleapis.com',
    'api.anthropic.com'
  ];

  for (const domain of domains) {
    try {
      console.log(`   测试 ${domain}...`);
      const response = await axios.get(`https://${domain}`, { 
        timeout: 5000,
        validateStatus: () => true // 接受所有状态码
      });
      console.log(`   ✅ ${domain} - 状态码: ${response.status}`);
    } catch (error) {
      if (error.code === 'ETIMEDOUT') {
        console.log(`   ❌ ${domain} - 连接超时`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   ❌ ${domain} - DNS解析失败`);
      } else {
        console.log(`   ⚠️  ${domain} - ${error.message}`);
      }
    }
  }

  // 2. 测试国内可用的API服务
  console.log('\n2. 测试国内API服务...');
  const chineseAPIs = [
    { name: 'DeepSeek', url: 'https://api.deepseek.com' },
    { name: 'Moonshot', url: 'https://api.moonshot.cn' },
    { name: 'Qwen', url: 'https://dashscope.aliyuncs.com' }
  ];

  for (const api of chineseAPIs) {
    try {
      console.log(`   测试 ${api.name}...`);
      const response = await axios.get(api.url, { 
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`   ✅ ${api.name} - 可访问 (${response.status})`);
    } catch (error) {
      console.log(`   ❌ ${api.name} - ${error.message}`);
    }
  }

  // 3. 检查系统代理设置
  console.log('\n3. 检查环境变量...');
  const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
  let hasProxy = false;
  for (const varName of proxyVars) {
    if (process.env[varName]) {
      console.log(`   ✅ 发现代理设置: ${varName}=${process.env[varName]}`);
      hasProxy = true;
    }
  }
  if (!hasProxy) {
    console.log('   ℹ️  未发现代理环境变量');
  }

  // 4. 测试特定的Gemini API端点
  console.log('\n4. 测试Gemini API具体端点...');
  const geminiKey = 'AIzaSyCmuoDi9hHuMteG0yCY_WAmtumx_DS8z-k';
  try {
    console.log('   尝试访问Gemini API...');
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{
          parts: [{ text: 'test' }]
        }]
      },
      {
        params: { key: geminiKey },
        timeout: 30000, // 增加超时时间
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CircuitsAI/1.0'
        }
      }
    );
    console.log('   ✅ Gemini API响应成功!');
    console.log('   响应:', response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.log('   ❌ Gemini API失败:', error.message);
    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

diagnoseNetwork().catch(console.error);