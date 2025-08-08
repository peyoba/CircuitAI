import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import HomePage from './pages/Home/HomePage'
import DesignPage from './pages/Design/DesignPage'
import './App.css'

const { Header, Content } = Layout

function App() {
  return (
    <Layout className="min-h-screen">
      <Header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">CircuitsAI</h1>
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

export default App