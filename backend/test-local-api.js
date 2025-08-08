import axios from 'axios';

// 测试一个可以正常工作的API
async function testWorkingAPI() {
  console.log('测试一个模拟的API服务...');
  
  // 创建一个模拟的成功响应
  const mockApiSuccess = {
    success: true,
    message: 'API连接测试成功！这是模拟的成功响应。'
  };
  
  // 模拟API测试成功
  console.log('✅ 模拟API测试:', JSON.stringify(mockApiSuccess, null, 2));
  
  // 测试httpbin - 这个应该能工作
  try {
    console.log('\n测试httpbin API...');
    const response = await axios.post('https://httpbin.org/post', 
      { test: 'data' },
      { 
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    console.log('✅ httpbin API调用成功');
    console.log('响应状态:', response.status);
  } catch (error) {
    console.log('❌ httpbin API失败:', error.message);
  }
}

testWorkingAPI().catch(console.error);