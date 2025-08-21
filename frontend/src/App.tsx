import { Routes, Route } from 'react-router-dom'
import { Layout, Select } from 'antd'
import HomePage from './pages/Home/HomePage'
import DesignPage from './pages/Design/DesignPage'
import './App.css'
import { I18nProvider, useI18n } from './i18n/I18nProvider'

const { Header, Content } = Layout

const { Option } = Select

const AppShell = () => {
  const { t, lang, setLang } = useI18n()
  return (
    <Layout className="min-h-screen">
      <Header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">{t('app_title')}</h1>
            </div>
            <div>
              <Select value={lang} onChange={(v) => setLang(v as any)} size="small" style={{ width: 120 }}>
                <Option value="en">English</Option>
                <Option value="zh">中文</Option>
              </Select>
            </div>
          </div>
        </div>
      </Header>
      <Content>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/design" element={<DesignPage />} />
        </Routes>
      </Content>
    </Layout>
  )
}

function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  )
}

export default App