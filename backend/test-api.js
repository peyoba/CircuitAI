import axios from 'axios';

// 测试不同的API
async function testAPI() {
  // 1. 测试一个简单的HTTP请求确保网络连接正常
  console.log('1. 测试基础网络连接...');
  try {
    const response = await axios.get('https://httpbin.org/get', { timeout: 10000 });
    console.log('✅ 基础网络连接正常');
  } catch (error) {
    console.log('❌ 基础网络连接失败:', error.message);
    return;
  }

  // 2. 测试OpenAI API (使用无效key应该返回401)
  console.log('\n2. 测试OpenAI API连接...');
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', 
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }]
      },
      {
        headers: {
          'Authorization': 'Bearer invalid-key',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ OpenAI API连接正常 (401 Unauthorized expected)');
    } else {
      console.log('❌ OpenAI API连接问题:', error.message);
    }
  }

  // 3. 测试Gemini API
  console.log('\n3. 测试Gemini API连接...');
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{
          parts: [{ text: 'test' }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          key: 'invalid-key'
        },
        timeout: 10000
      }
    );
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Gemini API连接正常 (400 Bad Request expected for invalid key)');
      console.log('响应数据:', error.response.data);
    } else {
      console.log('❌ Gemini API连接问题:', error.message);
      if (error.code === 'ETIMEDOUT') {
        console.log('   这是网络超时，可能是防火墙或网络问题');
      }
    }
  }

  // 4. 测试有效的Gemini API key（如果有的话）
  const geminiKey = 'AIzaSyCmuoDi9hHuMteG0yCY_WAmtumx_DS8z-k';
  console.log('\n4. 测试实际Gemini API key...');
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{
          parts: [{ text: 'Hello' }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          key: geminiKey
        },
        timeout: 15000
      }
    );
    console.log('✅ Gemini API调用成功!');
    console.log('响应:', response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.log('❌ Gemini API调用失败:', error.message);
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI().catch(console.error);