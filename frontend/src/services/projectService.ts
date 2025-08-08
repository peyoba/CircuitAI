export interface Project {
  id: string
  name: string
  description?: string
  circuitData?: {
    ascii?: string
    description?: string
    components?: Array<{
      name: string
      type: string
      value?: string
      reference?: string
    }>
  }
  bomData?: Array<{
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
  }>
  chatHistory?: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  createdAt: Date
  updatedAt: Date
  tags?: string[]
}

class ProjectService {
  private storageKey = 'circuitsai_projects'

  // 获取所有项目
  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (!data) return []
      
      const projects = JSON.parse(data)
      return projects.map((project: Project) => ({
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        chatHistory: project.chatHistory?.map((msg: { timestamp: string | number | Date }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })) || []
      }))
    } catch (error) {
      console.error('Failed to load projects:', error)
      return []
    }
  }

  // 保存项目
  saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const projects = this.getProjects()
    
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    projects.push(newProject)
    this.saveProjects(projects)
    
    return newProject
  }

  // 更新项目
  updateProject(id: string, updates: Partial<Project>): Project | null {
    const projects = this.getProjects()
    const index = projects.findIndex(p => p.id === id)
    
    if (index === -1) return null
    
    const updatedProject: Project = {
      ...projects[index],
      ...updates,
      updatedAt: new Date()
    }
    
    projects[index] = updatedProject
    this.saveProjects(projects)
    
    return updatedProject
  }

  // 删除项目
  deleteProject(id: string): boolean {
    const projects = this.getProjects()
    const filteredProjects = projects.filter(p => p.id !== id)
    
    if (filteredProjects.length === projects.length) return false
    
    this.saveProjects(filteredProjects)
    return true
  }

  // 根据ID获取项目
  getProject(id: string): Project | null {
    const projects = this.getProjects()
    return projects.find(p => p.id === id) || null
  }

  // 导出项目
  exportProject(project: Project): void {
    const dataStr = JSON.stringify(project, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${project.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 导入项目
  async importProject(file: File): Promise<Project> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const projectData = JSON.parse(content)
          
          // 验证项目数据格式
          if (!projectData.name) {
            throw new Error('Invalid project format: missing name')
          }
          
          // 创建新项目（重新生成ID和时间戳）
          const newProject = this.saveProject({
            name: projectData.name,
            description: projectData.description,
            circuitData: projectData.circuitData,
            bomData: projectData.bomData,
            chatHistory: projectData.chatHistory,
            tags: projectData.tags
          })
          
          resolve(newProject)
        } catch (error) {
          reject(new Error('Failed to parse project file: ' + (error as Error).message))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  // 搜索项目
  searchProjects(query: string): Project[] {
    const projects = this.getProjects()
    const lowerQuery = query.toLowerCase()
    
    return projects.filter(project => 
      project.name.toLowerCase().includes(lowerQuery) ||
      project.description?.toLowerCase().includes(lowerQuery) ||
      project.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  // 获取项目统计
  getProjectStats() {
    const projects = this.getProjects()
    
    const totalProjects = projects.length
    const totalCircuits = projects.filter(p => p.circuitData?.ascii).length
    const totalBOMs = projects.filter(p => p.bomData && p.bomData.length > 0).length
    
    const tagCounts: { [key: string]: number } = {}
    projects.forEach(project => {
      project.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    const mostUsedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }))
    
    return {
      totalProjects,
      totalCircuits,
      totalBOMs,
      mostUsedTags,
      recentProjects: projects
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5)
    }
  }

  private saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(projects))
    } catch (error) {
      console.error('Failed to save projects:', error)
      throw new Error('Failed to save project: storage quota exceeded')
    }
  }

  // 清理存储空间（删除旧项目）
  cleanupOldProjects(daysToKeep: number = 90): number {
    const projects = this.getProjects()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    const projectsToKeep = projects.filter(p => p.updatedAt >= cutoffDate)
    const deletedCount = projects.length - projectsToKeep.length
    
    if (deletedCount > 0) {
      this.saveProjects(projectsToKeep)
    }
    
    return deletedCount
  }
}

export const projectService = new ProjectService()
export default projectService