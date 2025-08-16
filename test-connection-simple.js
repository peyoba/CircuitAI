#!/usr/bin/env node

// 简单的API连接测试
console.log('🔍 CircuitAI API连接测试\n');

// 测试本地服务
async function testLocal() {
  try {
    const response = await fetch('http://localhost:3003/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 本地后端服务正常');
      console.log('   响应:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('❌ 本地后端服务响应异常:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 本地后端服务连接失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   提示: 请先启动后端服务 - npm run dev:backend');
    }
    return false;
  }
}

// 测试Cloudflare Workers
async function testWorkers() {
  try {
    const response = await fetch('https://circuitai-api.peyoba660703.workers.dev/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Cloudflare Workers正常');
      console.log('   响应:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('❌ Cloudflare Workers响应异常:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Cloudflare Workers连接失败:', error.message);
    return false;
  }
}

// 测试AI接口
async function testAI(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '设计一个简单的LED电路',
        provider: 'mock'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ AI接口测试成功');
      console.log('   AI响应:', data.data?.response?.substring(0, 100) + '...');
      return true;
    } else {
      const errorData = await response.json();
      console.log('❌ AI接口测试失败:', response.status);
      console.log('   错误:', errorData.error);
      return false;
    }
  } catch (error) {
    console.log('❌ AI接口测试异常:', error.message);
    return false;
  }
}

async function main() {
  console.log('📡 测试本地后端服务...');
  const localOk = await testLocal();
  console.log('');
  
  console.log('📡 测试Cloudflare Workers...');
  const workersOk = await testWorkers();
  console.log('');
  
  if (localOk) {
    console.log('🤖 测试本地AI接口...');
    await testAI('http://localhost:3003');
  } else if (workersOk) {
    console.log('🤖 测试Workers AI接口...');
    await testAI('https://circuitai-api.peyoba660703.workers.dev');
  }
  
  console.log('\n📋 诊断建议:');
  if (!localOk && !workersOk) {
    console.log('❌ 所有API端点都无法访问');
    console.log('1. 启动本地服务: npm run dev:backend');
    console.log('2. 检查Cloudflare Workers部署状态');
  } else if (localOk) {
    console.log('✅ 本地开发环境正常，可以继续开发');
  } else if (workersOk) {
    console.log('✅ 生产环境正常，本地服务需要启动');
  }
}

main().catch(console.error);