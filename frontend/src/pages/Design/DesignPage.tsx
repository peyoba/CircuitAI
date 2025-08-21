import { Layout, Row, Col, Button, Space, message, Tabs } from 'antd'
import { useState } from 'react'
import { SaveOutlined, FolderOpenOutlined, HomeOutlined, FileTextOutlined, BgColorsOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import ChatPanel from '../../components/ai/ChatPanel'
import CircuitViewer from '../../components/circuit/CircuitViewer'
import VisualCircuitViewer from '../../components/circuit/VisualCircuitViewer'
import BOMTable from '../../components/circuit/BOMTable'
import ProjectManager from '../../components/project/ProjectManager'
import { Project } from '../../services/projectService'

const { Sider, Content } = Layout

interface Component {
  name: string
  type: string
  value?: string
  reference?: string
  package?: string
  description?: string
}

interface Connection {
  id: string
  from: {
    component: string
    pin?: string
  }
  to: {
    component: string
    pin?: string
  }
  label?: string
  description?: string
}

interface Property {
  name: string
  value: string
  unit?: string
  description?: string
}

interface CircuitData {
  ascii?: string
  description?: string
  components?: Component[]
  connections?: Connection[]
  properties?: Property[]
}

interface BOMItem {
  id: string
  reference: string[]
  component: string
  value: string
  package?: string
  quantity: number
  manufacturer?: string
  partNumber?: string
  supplier?: string
  price?: number
  description?: string
}

const DesignPage = () => {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [circuitData, setCircuitData] = useState<CircuitData>()
  const [bomData, setBomData] = useState<BOMItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [chatHistory, setChatHistory] = useState<unknown[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<string>('ascii')

  const handleCircuitGenerated = (data: CircuitData) => {
    setCircuitData(data)
    setIsGenerating(false)
  }

  const handleBomGenerated = (bomData: { items?: Array<{ component: string; quantity: number; value?: string; package?: string; price?: number }> }) => {
    if (bomData.items) {
      // 转换BOMData为BOMItem格式
      const convertedItems: BOMItem[] = bomData.items.map((item, index) => ({
        id: `bom_${index + 1}`,
        reference: [item.component], // 将component名称作为reference
        component: item.component,
        value: item.value || '',
        package: item.package,
        quantity: item.quantity,
        price: item.price,
        description: `${item.component} 元件`
      }))
      setBomData(convertedItems)
    }
  }

  const handleChatHistory = (history: unknown[]) => {
    setChatHistory(history)
  }

  const handleLoadProject = (project: Project) => {
    setCurrentProject(project)
    
    // 加载电路数据
    if (project.circuitData) {
      setCircuitData(project.circuitData)
    }
    
    // 加载BOM数据
    if (project.bomData) {
      setBomData(project.bomData)
    }
    
    // 加载聊天历史（这个需要传递给ChatPanel）
    if (project.chatHistory) {
      setChatHistory(project.chatHistory)
    }
    
    message.success(`已加载项目: ${project.name}`)
  }

  const getCurrentProjectData = () => {
    return {
      name: currentProject?.name || '',
      description: currentProject?.description || '',
      circuitData,
      bomData,
      chatHistory
    }
  }

  return (
    <Layout className="h-screen">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            icon={<HomeOutlined />} 
            onClick={() => navigate('/')}
            type="text"
          >{t('back_home')}</Button>
          {currentProject && (
            <div className="text-sm text-gray-600">{t('current_project')}: <span className="font-semibold">{currentProject.name}</span></div>
          )}
        </div>
        <Space>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => setShowProjectManager(true)}
          >{t('project_manager')}</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => setShowProjectManager(true)}
            disabled={!circuitData && chatHistory.length === 0}
          >{t('save_project')}</Button>
        </Space>
      </div>

      <Layout>
        <Sider width={400} className="bg-white border-r">
          <ChatPanel 
            onCircuitGenerated={handleCircuitGenerated}
            onBomGenerated={handleBomGenerated}
            onChatHistory={handleChatHistory}
            initialMessages={currentProject?.chatHistory}
          />
        </Sider>
      
      <Content className="bg-gray-50">
        <div className="p-4 h-full">
          <Row gutter={[16, 16]} className="h-full">
            <Col span={14}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className="h-full"
                items={[
                  {
                    key: 'ascii',
                    label: (
                      <span><FileTextOutlined /> {t('tab_ascii')}</span>
                    ),
                    children: (
                      <CircuitViewer 
                        circuitData={circuitData}
                        loading={isGenerating}
                      />
                    )
                  },
                  {
                    key: 'visual',
                    label: (
                      <span><BgColorsOutlined /> {t('tab_visual')}</span>
                    ),
                    children: (
                      <VisualCircuitViewer
                        circuitData={circuitData}
                        loading={isGenerating}
                        editable={false}
                      />
                    )
                  }
                ]}
              />
            </Col>
            <Col span={10}>
              <BOMTable 
                bomData={bomData}
                editable={true}
              />
            </Col>
          </Row>
        </div>
      </Content>
      </Layout>

      {/* 项目管理弹窗 */}
      <ProjectManager
        visible={showProjectManager}
        onClose={() => setShowProjectManager(false)}
        onLoadProject={handleLoadProject}
        currentProjectData={getCurrentProjectData()}
      />
    </Layout>
  )
}

export default DesignPage