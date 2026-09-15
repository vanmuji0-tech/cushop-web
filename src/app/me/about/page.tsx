// 关于 CUshop（静态，照搬 pages/mine/about）
export default function AboutPage() {
  return (
    <div className="sub-page">
      <div className="hero nm-card" style={{ padding: 28, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 44 }}>🛍️</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>CUshop</div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>社区二手买卖回血 · 手作闲置好物交易</div>
      </div>

      <div className="nm-card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="section-title">关于我们</div>
        <div className="desc" style={{ fontSize: 14, lineHeight: 1.7 }}>
          CUshop 是一个小范围闲置交易平台，让社区的闲置物品流动起来。发布你的闲置，找到需要它的人。
        </div>
      </div>

      <div className="nm-card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="section-title">功能</div>
        <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 2 }}>📦 发布闲置商品</div>
        <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 2 }}>💬 留言交流</div>
        <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 2 }}>❤️ 收藏好物</div>
        <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 2 }}>🤝 线下交易</div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-weak)', fontSize: 12 }}>版本 1.0.0</div>
    </div>
  )
}
