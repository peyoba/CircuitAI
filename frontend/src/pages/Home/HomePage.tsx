import { Button, Card, Row, Col } from 'antd'
import { RocketOutlined, BulbOutlined, ToolOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: <BulbOutlined className="text-4xl text-blue-500" />,
      title: 'AI智能设计',
      description: '通过自然语言描述需求，AI自动生成电路方案'
    },
    {
      icon: <ToolOutlined className="text-4xl text-green-500" />,
      title: '专业工具',
      description: '提供完整的电路设计工具链和元件库'
    },
    {
      icon: <RocketOutlined className="text-4xl text-purple-500" />,
      title: '快速原型',
      description: '快速从概念到可实现的电路原型设计'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            CircuitsAI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            基于人工智能的智能电路设计平台，让复杂的电路设计变得简单易懂
          </p>
          <Button 
            type="primary" 
            size="large" 
            className="px-8 py-6 h-auto text-lg"
            onClick={() => navigate('/design')}
          >
            开始设计
          </Button>
        </div>

        {/* Features Section */}
        <Row gutter={[24, 24]} className="mb-16">
          {features.map((feature, index) => (
            <Col xs={24} md={8} key={index}>
              <Card className="h-full text-center hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            </Col>
          ))}
        </Row>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            准备开始您的电路设计之旅？
          </h2>
          <p className="text-gray-600 mb-6">
            无论您是专业工程师还是电子爱好者，CircuitsAI都能帮助您快速实现电路设计目标
          </p>
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/design')}
          >
            立即体验
          </Button>
        </div>
      </div>
    </div>
  )
}

export default HomePage