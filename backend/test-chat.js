import axios from 'axios';

async function testMockChat() {
  console.log('测试Mock AI聊天功能...');
  
  try {
    const response = await axios.post('http://localhost:3004/api/ai/chat', {
      message: '帮我设计一个LED闪烁电路',
      provider: 'mock',
      apiConfig: {
        provider: 'mock',
        apiKey: 'test-key',
        apiUrl: 'mock://localhost',
        model: 'mock-gpt-4'
      }
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ Mock AI聊天测试结果:');
    console.log('状态码:', response.status);
    console.log('响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Mock AI聊天测试失败:');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('响应:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('错误:', error.message);
    }
  }
}

testMockChat().catch(console.error);