import { useState, useEffect } from 'react'
import { 
  Modal, 
  Button, 
  Input, 
  Card, 
  List, 
  Tag, 
  Space, 
  message, 
  Tooltip,
  Popconfirm,
  Upload,
  Progress,
  Empty
} from 'antd'
import { 
  SaveOutlined, 
  FolderOpenOutlined, 
  DeleteOutlined, 
  DownloadOutlined,
  UploadOutlined,
  SearchOutlined,
  ProjectOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { projectService, Project } from '../../services/projectService'

const { TextArea } = Input
const { Search } = Input

interface ProjectManagerProps {
  visible: boolean
  onClose: () => void
  onLoadProject?: (project: Project) => void
  currentProjectData?: {
    name?: string
    description?: string
    circuitData?: unknown
    bomData?: unknown
    chatHistory?: unknown[]
  }
}

const ProjectManager = ({ 
  visible, 
  onClose, 
  onLoadProject, 
  currentProjectData 
}: ProjectManagerProps) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    tags: [] as string[]
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadProjects()
    }
  }, [visible])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = projectService.searchProjects(searchQuery)
      setFilteredProjects(filtered)
    } else {
      setFilteredProjects(projects)
    }
  }, [searchQuery, projects])

  const loadProjects = () => {
    try {
      const projectList = projectService.getProjects()
      setProjects(projectList)
      setFilteredProjects(projectList)
    } catch (error) {
      message.error('加载项目列表失败')
    }
  }

  const handleSaveProject = async () => {
    if (!saveForm.name.trim()) {
      message.error('请输入项目名称')
      return
    }

    if (!currentProjectData?.circuitData && !currentProjectData?.chatHistory?.length) {
      message.error('当前没有可保存的内容')
      return
    }

    setLoading(true)
    try {
      projectService.saveProject({
        name: saveForm.name,
        description: saveForm.description,
        circuitData: currentProjectData.circuitData as Project['circuitData'],
        bomData: currentProjectData.bomData as Project['bomData'],
        chatHistory: currentProjectData.chatHistory as Project['chatHistory'],
        tags: saveForm.tags
      })

      message.success('项目保存成功')
      setShowSaveModal(false)
      setSaveForm({ name: '', description: '', tags: [] })
      loadProjects()
    } catch (error) {
      message.error('保存项目失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadProject = (project: Project) => {
    if (onLoadProject) {
      onLoadProject(project)
      message.success(`已加载项目：${project.name}`)
      onClose()
    }
  }

  const handleDeleteProject = (projectId: string) => {
    try {
      projectService.deleteProject(projectId)
      message.success('项目删除成功')
      loadProjects()
    } catch (error) {
      message.error('删除项目失败')
    }
  }

  const handleExportProject = (project: Project) => {
    try {
      projectService.exportProject(project)
      message.success('项目导出成功')
    } catch (error) {
      message.error('导出项目失败')
    }
  }

  const handleImportProject = async (file: File) => {
    setLoading(true)
    try {
      await projectService.importProject(file)
      message.success('项目导入成功')
      loadProjects()
    } catch (error) {
      message.error('导入项目失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
    return false // 阻止自动上传
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProjectProgress = (project: Project) => {
    let progress = 0
    if (project.circuitData?.ascii) progress += 40
    if (project.bomData && project.bomData.length > 0) progress += 30
    if (project.chatHistory && project.chatHistory.length > 2) progress += 30
    return Math.min(progress, 100)
  }

  const stats = projectService.getProjectStats()

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ProjectOutlined />
            项目管理
          </div>
        }
        open={visible}
        onCancel={onClose}
        width={900}
        footer={
          <div className="flex justify-between">
            <Space>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImportProject}
              >
                <Button icon={<UploadOutlined />} loading={loading}>
                  导入项目
                </Button>
              </Upload>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={() => setShowSaveModal(true)}
                disabled={!currentProjectData?.circuitData && !currentProjectData?.chatHistory?.length}
              >
                保存当前项目
              </Button>
            </Space>
            <Button onClick={onClose}>关闭</Button>
          </div>
        }
      >
        <div className="mb-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalProjects}</div>
              <div className="text-sm text-gray-500">总项目数</div>
            </Card>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalCircuits}</div>
              <div className="text-sm text-gray-500">已设计电路</div>
            </Card>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalBOMs}</div>
              <div className="text-sm text-gray-500">已生成BOM</div>
            </Card>
          </div>

          {/* 搜索框 */}
          <Search
            placeholder="搜索项目名称、描述或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 16 }}
            prefix={<SearchOutlined />}
          />
        </div>

        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {filteredProjects.length === 0 ? (
            <Empty 
              description="暂无项目" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button 
                type="primary" 
                onClick={() => setShowSaveModal(true)}
                disabled={!currentProjectData?.circuitData && !currentProjectData?.chatHistory?.length}
              >
                保存第一个项目
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={filteredProjects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())}
              renderItem={(project) => (
                <List.Item
                  actions={[
                    <Tooltip title="加载项目">
                      <Button 
                        icon={<FolderOpenOutlined />} 
                        onClick={() => handleLoadProject(project)}
                        size="small"
                      />
                    </Tooltip>,
                    <Tooltip title="导出项目">
                      <Button 
                        icon={<DownloadOutlined />} 
                        onClick={() => handleExportProject(project)}
                        size="small"
                      />
                    </Tooltip>,
                    <Popconfirm
                      title="确定要删除这个项目吗？"
                      description="此操作不可恢复"
                      onConfirm={() => handleDeleteProject(project.id)}
                      okText="删除"
                      cancelText="取消"
                      okType="danger"
                    >
                      <Button 
                        icon={<DeleteOutlined />} 
                        danger 
                        size="small"
                      />
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{project.name}</span>
                        <Progress 
                          percent={getProjectProgress(project)} 
                          size="small" 
                          style={{ width: 100 }}
                          format={() => ''}
                        />
                      </div>
                    }
                    description={
                      <div>
                        {project.description && (
                          <p className="text-gray-600 mb-2">{project.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-4">
                            <span><CalendarOutlined /> 更新于 {formatDate(project.updatedAt)}</span>
                            {project.circuitData?.ascii && <span>📋 有电路图</span>}
                            {project.bomData && project.bomData.length > 0 && <span>📦 有BOM表</span>}
                          </div>
                          {project.tags && project.tags.length > 0 && (
                            <div className="flex gap-1">
                              {project.tags.map(tag => (
                                <Tag key={tag} color="blue">
                                  {tag}
                                </Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>

      {/* 保存项目弹窗 */}
      <Modal
        title="保存项目"
        open={showSaveModal}
        onCancel={() => setShowSaveModal(false)}
        onOk={handleSaveProject}
        confirmLoading={loading}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目名称 *
            </label>
            <Input
              placeholder="输入项目名称"
              value={saveForm.name}
              onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目描述
            </label>
            <TextArea
              placeholder="描述项目的用途和特点"
              value={saveForm.description}
              onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签 (用逗号分隔)
            </label>
            <Input
              placeholder="如：电源, LED, 放大器"
              onChange={(e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                setSaveForm({ ...saveForm, tags })
              }}
            />
          </div>

          <div className="text-sm text-gray-500">
            将保存当前的电路设计、BOM表格和对话历史
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ProjectManager