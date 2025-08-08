import axios from 'axios';

async function testMockAPI() {
  console.log('测试Mock API...');
  
  try {
    const response = await axios.post('http://localhost:3004/api/ai/test-config', {
      provider: 'mock',
      apiKey: 'test-key',
      apiUrl: 'mock://localhost',
      model: 'mock-gpt-4'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log('✅ Mock API测试结果:');
    console.log('状态码:', response.status);
    console.log('响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Mock API测试失败:');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('响应:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('错误:', error.message);
    }
  }
}

testMockAPI().catch(console.error);