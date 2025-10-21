export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: '服务运行正常',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'vercel-functions',
      version: '智能对话判断已部署 v1.2'
    }
  })
}