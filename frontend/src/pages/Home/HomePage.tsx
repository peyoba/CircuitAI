import { Button, Card, Row, Col } from 'antd'
import { RocketOutlined, BulbOutlined, ToolOutlined } from '@ant-design/icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
  const navigate = useNavigate()

  const { t } = useI18n()

  const features = [
    {
      icon: <BulbOutlined className="text-4xl text-blue-500" />,
      title: t('features_ai'),
      description: t('features_ai_desc')
    },
    {
      icon: <ToolOutlined className="text-4xl text-green-500" />,
      title: t('features_tools'),
      description: t('features_tools_desc')
    },
    {
      icon: <RocketOutlined className="text-4xl text-purple-500" />,
      title: t('features_fast'),
      description: t('features_fast_desc')
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">CircuitAI</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {t('hero_subtitle')}
          </p>
          <Button 
            type="primary" 
            size="large" 
            className="px-8 py-6 h-auto text-lg"
            onClick={() => navigate('/design')}
          >
            {t('start_design')}
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('ready_to_start')}</h2>
          <p className="text-gray-600 mb-6">
            {t('cta_subtitle')}
          </p>
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/design')}
          >
            {t('try_now')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default HomePage